// POST /api/score-submission
//
// Phase 2 of the upload flow. Given a submission_id (created by
// /api/start-submission), downloads the PDF from storage, extracts text,
// runs the OpenAI scoring, writes the script_evaluations row, and marks
// the submission completed.
//
// Called fire-and-forget from the client right after start-submission. The
// serverless function runs to completion on Vercel even if the client
// disconnects (e.g. mid Google OAuth redirect), so the eval lands either way.

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
// Single canonical prompt source — see src/lib/evaluation-prompt.ts.
// Anuj 2026-04-29: collapsed selznick-3-8 + v5-4 + v5.3 down to one
// file. The rescore script reads the same file off disk, so editing the
// prompt updates both code paths.
import { buildGemEvaluationPrompt, CURRENT_PROMPT_VERSION, type DeclaredFormat } from "@/lib/evaluation-prompt"
import { calculateWeightedScore, calculateTier, DIMENSION_IDS } from "@/types"
import type { GEMEvaluation } from "@/types"
import { sendEmail } from "@/lib/email"
import { createMatchesForSubmission } from "@/lib/matching"

export const maxDuration = 60

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default
  const data = await pdfParse(buffer)
  const text = data.text?.trim() ?? ""
  const words = text.replace(/\s+/g, " ").split(/\s+/).filter((w) => w.length >= 2)
  const readableChars = text.replace(/[^a-zA-Z0-9 .,;:'"!?()\-\n]/g, "")
  const ratio = text.length > 0 ? readableChars.length / text.length : 0
  if (words.length < 500 || ratio < 0.75) {
    throw new Error("SCANNED_PDF")
  }
  return text
}

async function evaluateScript(
  scriptText: string,
  declaredFormat: DeclaredFormat
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: buildGemEvaluationPrompt(declaredFormat) },
        {
          role: "user",
          content: `The writer has declared this script as a ${declaredFormat}. Please evaluate the following screenplay submission accordingly:\n\n---\n\n${scriptText}`,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 16384,
      response_format: { type: "json_object" },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  const evaluation = JSON.parse(data.choices[0].message.content) as GEMEvaluation

  // Validate required fields — the model occasionally nests `issues`
  // inside `whats_special` instead of the top level, or drops it entirely.
  // Promote nested issues first, then fall back to a placeholder.
  if (!(evaluation as any).issues && (evaluation as any).whats_special?.issues) {
    ;(evaluation as any).issues = (evaluation as any).whats_special.issues
    console.warn(`[score-submission] promoted issues from whats_special.issues`)
  }

  const issues = (evaluation as any).issues as
    | { headline?: string; items?: unknown[]; craft_note?: string }
    | undefined
  if (
    !issues ||
    !Array.isArray(issues.items) ||
    issues.items.length === 0
  ) {
    ;(evaluation as any).issues = {
      headline:
        issues?.headline ||
        'Development notes were not generated for this evaluation.',
      items: issues?.items?.length
        ? issues.items
        : [
            {
              area: 'Evaluation incomplete',
              detail:
                'The scoring model did not produce development considerations for this script. Re-submit or contact support if this persists.',
              is_primary_lever: true,
            },
          ],
      ...(issues?.craft_note ? { craft_note: issues.craft_note } : {}),
    }
    console.warn(
      `[score-submission] issues field missing or empty — injected placeholder`
    )
  }

  const scores = evaluation.scores as Record<string, { score: number }>
  const safeScores: Record<string, { score: number }> = {}
  for (const dim of DIMENSION_IDS) {
    safeScores[dim] = scores[dim] ?? { score: 5 }
  }
  const weightedScore = calculateWeightedScore(safeScores as any)
  const tier = calculateTier(weightedScore)

  const inputTokens = data.usage?.prompt_tokens ?? 0
  const outputTokens = data.usage?.completion_tokens ?? 0
  const cost =
    (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5

  return { evaluation, weightedScore, tier, inputTokens, outputTokens, cost }
}

export async function POST(request: NextRequest) {
  let submissionId: string | null = null
  const serviceClient = createServiceClient()

  try {
    const body = await request.json()
    submissionId = (body?.submission_id as string) ?? null
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submission_id" }, { status: 400 })
    }

    // Look up the submission. We allow this to run for anon-owned rows too
    // (the writer hasn't signed up yet) — the row is the source of truth.
    const { data: submission } = await serviceClient
      .from("script_submissions")
      .select("id, title, declared_format, file_url, status")
      .eq("id", submissionId)
      .single()

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    if (submission.status === "completed") {
      // Already scored — return the existing evaluation_id so the caller can
      // navigate the writer to the report.
      const { data: existingEval } = await serviceClient
        .from("script_evaluations")
        .select("id")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      return NextResponse.json({
        submission_id: submissionId,
        evaluation_id: existingEval?.id ?? null,
        status: "completed",
      })
    }
    if (!submission.file_url) {
      return NextResponse.json(
        { error: "Submission has no PDF on file" },
        { status: 400 }
      )
    }
    if (
      submission.declared_format !== "Feature film" &&
      submission.declared_format !== "Series"
    ) {
      return NextResponse.json(
        { error: "Submission missing valid format" },
        { status: 400 }
      )
    }
    const declaredFormat = submission.declared_format as DeclaredFormat

    // Download the PDF from storage and extract text.
    const { data: fileBlob, error: dlError } = await serviceClient.storage
      .from("scripts")
      .download(submission.file_url)

    if (dlError || !fileBlob) {
      throw new Error(`Storage download failed: ${dlError?.message ?? "no blob"}`)
    }
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const scriptText = await extractPdfText(buffer)
    if (!scriptText || scriptText.trim().length < 100) {
      throw new Error(
        "Could not extract enough text from the PDF. The file may be corrupted or contain no readable content."
      )
    }

    // Run the scoring.
    const { evaluation, weightedScore, tier, inputTokens, outputTokens, cost } =
      await evaluateScript(scriptText, declaredFormat)

    const { data: evalRecord, error: evalError } = await serviceClient
      .from("script_evaluations")
      .insert({
        submission_id: submission.id,
        weighted_score: weightedScore,
        tier,
        evaluation,
        model: "gpt-5.4-mini",
        prompt_version: CURRENT_PROMPT_VERSION,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost,
      })
      .select("id")
      .single()

    if (evalError || !evalRecord) {
      console.error("score-submission insert eval error:", evalError)
      throw new Error("Failed to store evaluation")
    }

    // Mark completed. is_public defaults to true ONLY for Pro subscribers
    // — free writers' scripts stay private until they upgrade and choose
    // to publish. Anuj 2026-04-28: publishing to industry partners is a
    // Pro-only feature; auto-publishing on score for free users created
    // a confusing state where the report showed "Published" but couldn't
    // be unpublished without paying.
    //
    // Anuj 2026-04-30: producer accounts (industry partners submitting
    // their OWN scripts via /partner/submit) are always private — never
    // auto-published, never matched. Detected here so the rest of this
    // route's gating short-circuits cleanly.
    const { data: ownedCheck } = await serviceClient
      .from("script_submissions")
      .select("user_id")
      .eq("id", submission.id)
      .single()
    let ownerIsProducer = false
    let ownerIsPro = false
    // Anonymous submissions (no user_id) must never auto-publish.
    // They stay private until the user claims the report and creates
    // an account. Anuj 2026-05-02.
    const isAnonymous = !ownedCheck?.user_id
    let ownerPublicDefault = false
    let ownerAllowReviews = isAnonymous ? false : true
    let ownerAllowIndustry = isAnonymous ? false : true
    let isLockedScript = false
    if (ownedCheck?.user_id) {
      const { data: ownerProfile } = await serviceClient
        .from("profiles")
        .select("account_type, privacy_defaults, subscription_status")
        .eq("id", ownedCheck.user_id)
        .single<{
          account_type: string | null
          subscription_status: string | null
          privacy_defaults: {
            public_default?: boolean
            allow_reviews?: boolean
            allow_industry?: boolean
          } | null
        }>()
      ownerIsProducer = ownerProfile?.account_type === "producer"
      ownerIsPro = ownerProfile?.subscription_status === "active" || ownerProfile?.subscription_status === "trialing"
      // Public-by-default + per-script defaults all read from the writer's
      // account-level privacy settings (Anuj 2026-04-30 v0.10). The two
      // booleans (allow_reviews, allow_industry) get persisted to the
      // submission row so per-script overrides via the report-page menu
      // start from the writer's chosen defaults.
      const pd = ownerProfile?.privacy_defaults
      if (typeof pd?.public_default === "boolean") ownerPublicDefault = pd.public_default
      if (typeof pd?.allow_reviews === "boolean") ownerAllowReviews = pd.allow_reviews
      if (typeof pd?.allow_industry === "boolean") ownerAllowIndustry = pd.allow_industry

      // Free-tier lock: if this isn't the writer's first completed script
      // and they're not Pro, force private + no reviews/industry. The 2nd+
      // script is locked behind the paywall — it must not leak onto
      // Community or get matched to producers. Anuj 2026-05-02.
      if (!ownerIsPro && !ownerIsProducer) {
        const { data: firstSub } = await serviceClient
          .from("script_submissions")
          .select("id")
          .eq("user_id", ownedCheck.user_id)
          .eq("status", "completed")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
        // If firstSub exists and isn't this submission, this is the 2nd+
        // script. If firstSub is null, this submission is about to become
        // the first (we haven't updated its status to completed yet).
        if (firstSub && firstSub.id !== submission.id) {
          isLockedScript = true
        }
      }
    }
    await serviceClient
      .from("script_submissions")
      .update({
        status: "completed",
        // Producer-owned scripts stay private regardless of writer
        // defaults. Locked (2nd+ free-tier) scripts are forced private.
        // Otherwise inherit the writer's account-level
        // public_default + privacy toggles.
        ...(!ownerIsProducer && !isLockedScript
          ? {
              is_public: ownerPublicDefault,
              allow_reviews: ownerAllowReviews,
              allow_industry: ownerAllowIndustry,
            }
          : isLockedScript
          ? {
              is_public: false,
              allow_reviews: false,
              allow_industry: false,
            }
          : {}),
      })
      .eq("id", submission.id)

    // Copy classification.tags into script_submissions.tags so producer-side
    // tag-filter UI can index on them (we have a GIN index on this column)
    // and so writers can edit them via /api/scripts/[id]/tags. Tags are
    // 5-10 lowercase-hyphenated descriptors generated by the v5.4 prompt.
    const tags = (evaluation as any)?.classification?.tags ?? []
    if (Array.isArray(tags) && tags.length > 0) {
      await serviceClient
        .from("script_submissions")
        .update({ tags })
        .eq("id", submission.id)
    }

    // Auto-update title from the LLM extraction. The eval prompt (v3.10+)
    // extracts the proper title from the script's title page. We overwrite
    // the filename-inferred placeholder — UNLESS the writer manually set a
    // declared_title (meaning they intentionally typed a title).
    const extractedTitle = (evaluation as any)?.title
    if (extractedTitle && typeof extractedTitle === "string" && extractedTitle !== "Untitled") {
      // Only overwrite if no declared_title was set (i.e. user didn't manually type one)
      const { data: sub } = await serviceClient
        .from("script_submissions")
        .select("declared_title")
        .eq("id", submission.id)
        .single()
      if (!sub?.declared_title) {
        await serviceClient
          .from("script_submissions")
          .update({ title: extractedTitle.trim() })
          .eq("id", submission.id)
      }
    }

    // Producer matching — fan out to producer dashboards for any whose lane
    // overlaps. Don't block the response if anything goes wrong; the cron
    // backfill / admin trigger can recover. Skipped entirely for producer-
    // owned submissions since those are private to the submitting producer.
    if (!ownerIsProducer) {
      try {
        const matchResult = await createMatchesForSubmission(
          submission.id,
          serviceClient
        )
        console.log(
          `[score-submission] matching: created=${matchResult.matchesCreated} skipped=${matchResult.matchesSkipped} candidates=${matchResult.candidatesEvaluated} submission=${submission.id}`
        )
      } catch (err) {
        console.error("[score-submission] matching failed:", err)
      }
    }

    // Post-submission email — only when the row is already owned by a user.
    // Anon rows email after the assign-submission step claims them.
    const { data: ownedRow } = await serviceClient
      .from("script_submissions")
      .select("user_id")
      .eq("id", submission.id)
      .single()

    // Producer-owned submissions skip the writer-facing post-submission
    // email entirely. Producers submitting their own scripts already see
    // the result in-app on /partner; no need for the "your eval is ready"
    // upsell template that's targeted at writers.
    if (ownedRow?.user_id && !ownerIsProducer) {
      try {
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("email, full_name, subscription_status")
          .eq("id", ownedRow.user_id)
          .single()

        if (profile?.email) {
          const firstName = profile.full_name?.split(" ")[0] || "there"
          const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.gem.studio"}/report/${evalRecord.id}`
          const isSub = profile.subscription_status === "active" || profile.subscription_status === "trialing"
          const templateAlias = isSub ? "post_submission_pro" : "post_submission_free"

          // Count qualifying opportunities for this script so the email
          // can say "Your script matched N opportunities."
          let matchCount = "0"
          try {
            const { count } = await serviceClient
              .from("opportunities")
              .select("id", { count: "exact", head: true })
              .eq("status", "active")
            matchCount = String(count ?? 0)
          } catch {}

          // MUST await — see /api/evaluate for the full explanation. Without
          // await, Vercel kills the Lambda before the Postmark fetch completes
          // and the email_outbox row stays at "pending" forever.
          await sendEmail(
            {
              templateAlias,
              to: profile.email,
              variables: {
                first_name: firstName,
                title: submission.title || "Untitled",
                report_url: reportUrl,
                match_count: matchCount,
                score: String(Math.round(weightedScore)),
                tier,
              },
              dedupeKey: evalRecord.id,
              tag: templateAlias,
            },
            serviceClient
          )
        }
      } catch (err) {
        console.error("[score-submission] post-submission email failed:", err)
      }
    }

    return NextResponse.json({
      submission_id: submission.id,
      evaluation_id: evalRecord.id,
      status: "completed",
      weighted_score: weightedScore,
      tier,
    })
  } catch (e: any) {
    const errorMessage = e?.message ?? "Unknown scoring error"
    console.error("score-submission error:", errorMessage)
    if (submissionId) {
      if (errorMessage === "SCANNED_PDF") {
        // Delete scanned PDF submissions so they don't count against limits
        await serviceClient
          .from("script_submissions")
          .delete()
          .eq("id", submissionId)
      } else {
        await serviceClient
          .from("script_submissions")
          .update({ status: "failed", error_message: errorMessage })
          .eq("id", submissionId)
      }
    }
    const friendly =
      errorMessage === "SCANNED_PDF"
        ? "Looks like this is a scanned PDF. We need a digital export from Final Draft, WriterSolo, or Highland."
        : errorMessage
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}
