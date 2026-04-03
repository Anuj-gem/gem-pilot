import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GEM_EVALUATION_PROMPT } from "@/lib/evaluation-prompt";
import type { GEMEvaluation, Tier } from "@/types";

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

// Extract text from PDF using pdf-parse
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

// Call GPT-5.4 Mini for evaluation
async function evaluateScript(scriptText: string): Promise<{
  evaluation: GEMEvaluation;
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
        { role: "system", content: GEM_EVALUATION_PROMPT },
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

  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  // GPT-5.4 Mini: $0.75/M input, $4.50/M output
  const cost =
    (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5;

  return { evaluation, inputTokens, outputTokens, cost };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authClient = await createAuthClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1b. Check subscription / trial period
    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_status, free_eval_used, trial_ends_at")
      .eq("id", user.id)
      .single();

    const isSubscribed = profile?.subscription_status === "active";
    const hasActiveTrial = profile?.trial_ends_at
      ? new Date(profile.trial_ends_at) > new Date()
      : false;
    // Keep legacy free_eval_used check for users who signed up before trial system
    const hasFreeEval = !profile?.free_eval_used && !profile?.trial_ends_at;

    if (!isSubscribed && !hasActiveTrial && !hasFreeEval) {
      return NextResponse.json(
        { error: "subscription_required", message: "Your trial has ended. Subscribe to keep evaluating scripts." },
        { status: 403 }
      );
    }

    // 2. Parse form data
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

    // 3. Create submission record
    const { data: submission, error: subError } = await serviceClient
      .from("script_submissions")
      .insert({
        user_id: user.id,
        title,
        filename: file.name,
        file_size: file.size,
        status: "processing",
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
      // 4. Upload PDF to Supabase Storage
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
        // Non-fatal — continue with evaluation
      } else {
        await serviceClient
          .from("script_submissions")
          .update({ file_url: storagePath })
          .eq("id", submission.id);
      }

      // 5. Extract text from PDF
      const scriptText = await extractPdfText(buffer);

      if (!scriptText || scriptText.trim().length < 100) {
        throw new Error(
          "Could not extract enough text from the PDF. Please ensure the file contains readable text (not scanned images)."
        );
      }

      // 6. Run evaluation
      const { evaluation, inputTokens, outputTokens, cost } =
        await evaluateScript(scriptText);

      // 7. Store evaluation
      const { data: evalRecord, error: evalError } = await serviceClient
        .from("script_evaluations")
        .insert({
          submission_id: submission.id,
          weighted_score: evaluation.weighted_score,
          tier: evaluation.tier,
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

      // 8. Mark submission as completed + mark free eval as used
      await serviceClient
        .from("script_submissions")
        .update({ status: "completed" })
        .eq("id", submission.id);

      // Mark legacy free eval as used (only for pre-trial users without trial_ends_at)
      if (!isSubscribed && hasFreeEval && !profile?.trial_ends_at) {
        await serviceClient
          .from("profiles")
          .update({ free_eval_used: true })
          .eq("id", user.id);
      }

      return NextResponse.json({
        submission_id: submission.id,
        evaluation_id: evalRecord.id,
        status: "completed",
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
