import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GEM_EVALUATION_PROMPT_V3 } from "@/lib/evaluation-prompt-v3";
import { calculateWeightedScore, calculateTier, DIMENSION_IDS } from "@/types";
import type { GEMEvaluation } from "@/types";

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
  return data.text;
}

// Call GPT-5.4 Mini for evaluation (v3 prompt — returns raw scores, no weighted_score/tier)
async function evaluateScript(scriptText: string): Promise<{
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
        { role: "system", content: GEM_EVALUATION_PROMPT_V3 },
        {
          role: "user",
          content: `Please evaluate the following screenplay submission:\n\n---\n\n${scriptText}`,
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

    // 1. Authenticate — login required to evaluate
    const authClient = await createAuthClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to evaluate scripts." },
        { status: 401 }
      );
    }

    // 2. Check subscription status (used for analytics)
    let isSubscribed = false;
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    isSubscribed = profile?.subscription_status === "active";

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing file or title" },
        { status: 400 }
      );
    }

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

    // 4. Create submission record
    const { data: submission, error: subError } = await serviceClient
      .from("script_submissions")
      .insert({
        user_id: user.id,
        title,
        filename: file.name,
        file_size: file.size,
        status: "processing",
        submitted_by_ip: clientIp,
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

      const storagePath = `${user.id}/${submission.id}/${file.name}`;
      const { error: uploadError } = await serviceClient.storage
        .from("scripts")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      } else {
        await serviceClient
          .from("script_submissions")
          .update({ file_url: storagePath })
          .eq("id", submission.id);
      }

      // 6. Extract text from PDF
      const scriptText = await extractPdfText(buffer);

      if (!scriptText || scriptText.trim().length < 100) {
        throw new Error(
          "Could not extract enough text from the PDF. Please ensure the file contains readable text (not scanned images)."
        );
      }

      // 7. Run evaluation (v3 prompt — score + tier calculated in code)
      const { evaluation, weightedScore, tier, inputTokens, outputTokens, cost } =
        await evaluateScript(scriptText);

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

      return NextResponse.json({
        submission_id: submission.id,
        evaluation_id: evalRecord.id,
        status: "completed",
        is_subscriber: isSubscribed,
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
