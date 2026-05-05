// POST /api/rerun-evaluation
//
// Re-runs the evaluation for a given submission using the latest prompt.
// Called when a writer clicks "Update report" on a stale eval, or when
// the opportunity-submit flow detects a version mismatch.
//
// Body: { submission_id: string }
// Returns: { evaluation_id, weighted_score, tier, prompt_version }

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { buildGemEvaluationPrompt, CURRENT_PROMPT_VERSION, type DeclaredFormat } from "@/lib/evaluation-prompt"
import { calculateWeightedScore, calculateTier, DIMENSION_IDS } from "@/types"
import type { GEMEvaluation } from "@/types"
import { createMatchesForSubmission } from "@/lib/matching"

export const maxDuration = 60

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default
  const data = await pdfParse(buffer)
  return data.text?.trim() ?? ""
}

async function evaluateScript(scriptText: string, declaredFormat: DeclaredFormat) {
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

  // Validate issues field (same logic as score-submission)
  if (!(evaluation as any).issues && (evaluation as any).whats_special?.issues) {
    ;(evaluation as any).issues = (evaluation as any).whats_special.issues
  }
  const issues = (evaluation as any).issues as
    | { headline?: string; items?: unknown[] }
    | undefined
  if (!issues || !Array.isArray(issues.items) || issues.items.length === 0) {
    ;(evaluation as any).issues = {
      headline: issues?.headline || "Development notes were not generated for this evaluation.",
      items: issues?.items?.length
        ? issues.items
        : [{ area: "Evaluation incomplete", detail: "Re-submit or contact support.", is_primary_lever: true }],
    }
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
  const cost = (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5

  return { evaluation, weightedScore, tier, inputTokens, outputTokens, cost }
}

export async function POST(request: NextRequest) {
  const serviceClient = createServiceClient()

  try {
    // Auth check — must be logged in
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const submissionId = body?.submission_id as string | undefined
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submission_id" }, { status: 400 })
    }

    // Verify ownership
    const { data: submission } = await serviceClient
      .from("script_submissions")
      .select("id, user_id, title, declared_format, file_url, status")
      .eq("id", submissionId)
      .single()

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    if (submission.user_id !== user.id) {
      return NextResponse.json({ error: "Not your submission" }, { status: 403 })
    }
    if (submission.status !== "completed") {
      return NextResponse.json({ error: "Submission not yet completed" }, { status: 400 })
    }
    if (!submission.file_url) {
      return NextResponse.json({ error: "No PDF on file" }, { status: 400 })
    }

    // Check if already on latest version
    const { data: currentEval } = await serviceClient
      .from("script_evaluations")
      .select("id, prompt_version")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (currentEval?.prompt_version === CURRENT_PROMPT_VERSION) {
      return NextResponse.json({
        evaluation_id: currentEval.id,
        prompt_version: CURRENT_PROMPT_VERSION,
        status: "already_current",
      })
    }

    // Download PDF and extract text
    const { data: fileBlob, error: dlError } = await serviceClient.storage
      .from("scripts")
      .download(submission.file_url)

    if (dlError || !fileBlob) {
      throw new Error(`Storage download failed: ${dlError?.message ?? "no blob"}`)
    }
    const buffer = Buffer.from(await fileBlob.arrayBuffer())
    const scriptText = await extractPdfText(buffer)
    if (!scriptText || scriptText.trim().length < 100) {
      throw new Error("Could not extract enough text from the PDF.")
    }

    const declaredFormat = submission.declared_format as DeclaredFormat

    // Run the new evaluation
    const { evaluation, weightedScore, tier, inputTokens, outputTokens, cost } =
      await evaluateScript(scriptText, declaredFormat)

    // Update the existing eval row in place (unique constraint on submission_id
    // means we can't insert a second row — and keeping the same eval ID means
    // the report URL doesn't change).
    const { data: evalRecord, error: evalError } = await serviceClient
      .from("script_evaluations")
      .update({
        weighted_score: weightedScore,
        tier,
        evaluation,
        model: "gpt-5.4-mini",
        prompt_version: CURRENT_PROMPT_VERSION,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost,
      })
      .eq("id", currentEval!.id)
      .select("id")
      .single()

    if (evalError || !evalRecord) {
      console.error("[rerun-evaluation] update error:", evalError)
      throw new Error("Failed to store new evaluation")
    }

    // Update tags on submission from new eval
    const tags = (evaluation as any)?.classification?.tags ?? []
    if (Array.isArray(tags) && tags.length > 0) {
      await serviceClient
        .from("script_submissions")
        .update({ tags })
        .eq("id", submission.id)
    }

    // Re-run matching with new score
    try {
      await createMatchesForSubmission(submission.id, serviceClient)
    } catch (err) {
      console.error("[rerun-evaluation] matching failed:", err)
    }

    return NextResponse.json({
      evaluation_id: evalRecord.id,
      weighted_score: weightedScore,
      tier,
      prompt_version: CURRENT_PROMPT_VERSION,
      status: "rescored",
    })
  } catch (err: any) {
    console.error("[rerun-evaluation] error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    )
  }
}
