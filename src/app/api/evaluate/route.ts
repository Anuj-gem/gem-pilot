import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { buildGemEvaluationPromptV4, type DeclaredFormat } from "@/lib/evaluation-prompt-v4";
import { calculateWeightedScore, calculateTier, DIMENSION_IDS } from "@/types";
import type { GEMEvaluation } from "@/types";
import { sendEmail } from "@/lib/email";

// Allow up to 60 seconds for script evaluation
export const maxDuration = 60;



// Create a Supabase client with service role for writes
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

// Create auth client to verify the user
async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Get client IP from request headers
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Extract text from PDF using pdf-parse
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  const text = data.text?.trim() ?? "";

  // Check if we got real readable text (not garbled scanned PDF noise)
  const words = text.replace(/\s+/g, " ").split(/\s+/).filter((w) => w.length >= 2);
  const readableChars = text.replace(/[^a-zA-Z0-9 .,;:'"!?()\-\n]/g, "");
  const ratio = text.length > 0 ? readableChars.length / text.length : 0;

  if (words.length < 500 || ratio < 0.75) {
    // This is a scanned PDF or otherwise unreadable — tell the user clearly
    throw new Error(
      "SCANNED_PDF"
    );
  }

  return text;
}

// Call GPT-5.4 Mini for evaluation (v4 advocate prompt — positioning-first output)
async function evaluateScript(scriptText: string, declaredFormat: DeclaredFormat): Promise<{
  evaluation: GEMEvaluation;
  weightedScore: number;
  tier: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: buildGemEvaluationPromptV4(declaredFormat) },
        {
          role: "user",
          content: `The writer has declared this script as a ${declaredFormat}. Please evaluate the following screenplay submission accordingly:\n\n---\n\n${scriptText}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const evaluation = JSON.parse(
    data.choices[0].message.content
  ) as GEMEvaluation;

  // Calculate weighted score and tier in code (not from LLM)
  const scores = evaluation.scores as Record<string, { score: number }>;
  // Ensure all 10 dimensions have scores — default missing to 5
  const safeScores: Record<string, { score: number }> = {};
  for (const dim of DIMENSION_IDS) {
    safeScores[dim] = scores[dim] ?? { score: 5 };
  }
  const weightedScore = calculateWeightedScore(safeScores as any);
  const tier = calculateTier(weightedScore);

  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  // GPT-5.4 Mini: $0.75/M input, $4.50/M output
  const cost =
    (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5;

  return { evaluation, weightedScore, tier, inputTokens, outputTokens, cost };
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const clientIp = getClientIp(request);

    // 1. Check auth — optional. Anonymous evals allowed for PLG flow.
    const authClient = await createAuthClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    // 2. Subscription check — informational only. All evals run freely.
    //    Paywall lives on the report page: 2nd+ reports are locked until the user upgrades.
    let isSubscribed = false;
    if (user) {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();
      isSubscribed = profile?.subscription_status === "active";
    }

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const declaredFormatRaw = formData.get("declared_format") as string | null;

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing file or title" },
        { status: 400 }
      );
    }

    if (declaredFormatRaw !== "Feature film" && declaredFormatRaw !== "Series") {
      return NextResponse.json(
        { error: "Please select a format (Feature film or Series) before evaluating." },
        { status: 400 }
      );
    }
    const declaredFormat: DeclaredFormat = declaredFormatRaw;

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // 4. Create submission record (user_id is null for anonymous evals)
    // Anonymous submissions expire in 10 minutes — claimed when user signs up
    const expiresAt = !user
      ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
      : null;

    const { data: submission, error: subError } = await serviceClient
      .from("script_submissions")
      .insert({
        user_id: user?.id ?? null,
        title,
        filename: file.name,
        file_size: file.size,
        status: "processing",
        submitted_by_ip: clientIp,
        declared_format: declaredFormat,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      })
      .select()
      .single();

    if (subError || !submission) {
      console.error("Submission insert error:", subError);
      return NextResponse.json(
        { error: "Failed to create submission" },
        { status: 500 }
      );
    }

    try {
      // 5. Upload PDF to Supabase Storage
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use submission.id as the storage key (not file.name) — Supabase storage
      // rejects keys with non-ASCII or special characters (smart quotes, em-dashes,
      // accented chars), which was silently dropping ~37 uploads. Keep the original
      // filename in the `filename` column for display.
      const storagePath = `${user?.id ?? "anonymous"}/${submission.id}/script.pdf`;
      const { error: uploadError } = await serviceClient.storage
        .from("scripts")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        await serviceClient
          .from("script_submissions")
          .update({
            status: "failed",
            error_message: `Storage upload failed: ${uploadError.message}`,
          })
          .eq("id", submission.id);
        return NextResponse.json(
          {
            error:
              "We couldn't store your script. Please try again, or contact support if the issue persists.",
          },
          { status: 500 }
        );
      }

      await serviceClient
        .from("script_submissions")
        .update({ file_url: storagePath })
        .eq("id", submission.id);

      // 6. Extract text from PDF
      const scriptText = await extractPdfText(buffer);
      console.log(`[Evaluate] Extracted ${scriptText.length} chars`);

      if (!scriptText || scriptText.trim().length < 100) {
        throw new Error(
          "Could not extract enough text from the PDF. The file may be corrupted or contain no readable content."
        );
      }

      // 7. Run evaluation (v3 prompt — score + tier calculated in code)
      const { evaluation, weightedScore, tier, inputTokens, outputTokens, cost } =
        await evaluateScript(scriptText, declaredFormat);

      // 8. Store evaluation
      const { data: evalRecord, error: evalError } = await serviceClient
        .from("script_evaluations")
        .insert({
          submission_id: submission.id,
          weighted_score: weightedScore,
          tier: tier,
          evaluation: evaluation,
          model: "gpt-5.4-mini",
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: cost,
        })
        .select()
        .single();

      if (evalError || !evalRecord) {
        console.error("Evaluation insert error:", evalError);
        throw new Error("Failed to store evaluation");
      }

      // 9. Mark submission as completed
      await serviceClient
        .from("script_submissions")
        .update({ status: "completed" })
        .eq("id", submission.id);

      // 10. Send post-submission email (fire-and-forget, won't block response)
      if (user) {
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", user.id)
          .single();

        if (profile?.email) {
          const firstName = profile.full_name?.split(" ")[0] || "there";
          const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.gem.studio"}/report/${evalRecord.id}`;
          const templateAlias = isSubscribed ? "post_submission_pro" : "post_submission_free";

          sendEmail(
            {
              templateAlias,
              to: profile.email,
              variables: {
                first_name: firstName,
                title: title || "Untitled",
                report_url: reportUrl,
              },
              dedupeKey: evalRecord.id,
              tag: templateAlias,
            },
            serviceClient
          );
        }
      }

      return NextResponse.json({
        submission_id: submission.id,
        evaluation_id: evalRecord.id,
        status: "completed",
        is_subscriber: isSubscribed,
        weighted_score: weightedScore,
        tier,
        title,
      });
    } catch (evalErr) {
      // Mark submission as failed
      const errorMessage =
        evalErr instanceof Error ? evalErr.message : "Unknown error";
      await serviceClient
        .from("script_submissions")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", submission.id);

      return NextResponse.json(
        {
          submission_id: submission.id,
          status: "failed",
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Evaluate API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
