import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GEM_EVALUATION_PROMPT_V3 } from "@/lib/evaluation-prompt-v3";
import { calculateWeightedScore, calculateTier, DIMENSION_IDS } from "@/types";
import type { GEMEvaluation } from "@/types";

// Allow up to 120 seconds for script evaluation (scanned PDFs need OCR via vision API)
export const maxDuration = 120;



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

// Check if extracted text is real readable screenplay content (not garbled scanned PDF noise)
function isTextReadable(text: string): boolean {
  const cleaned = text.replace(/\s+/g, " ").trim();

  // 1. Must have substantial content — a screenplay is 20,000+ words
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
  console.log(
    `[TextCheck] chars=${cleaned.length}, words=${words.length}, first200="${cleaned.substring(0, 200)}"`
  );

  if (words.length < 500) {
    console.log(`[TextCheck] FAIL: only ${words.length} words (need 500+)`);
    return false;
  }

  // 2. Ratio of normal ASCII chars to total — garbled text has lots of control/special chars
  const readableChars = cleaned.replace(/[^a-zA-Z0-9 .,;:'"!?()\-\n]/g, "");
  const ratio = readableChars.length / cleaned.length;
  if (ratio < 0.75) {
    console.log(`[TextCheck] FAIL: readable ratio ${ratio.toFixed(2)} (need 0.75+)`);
    return false;
  }

  // 3. Words should look like English — contain vowels, reasonable length
  const realWords = words.filter(
    (w) => w.length >= 2 && w.length <= 25 && /[aeiouAEIOU]/.test(w)
  ).length;
  const wordRatio = realWords / words.length;
  if (wordRatio < 0.5) {
    console.log(`[TextCheck] FAIL: real word ratio ${wordRatio.toFixed(2)} (need 0.5+)`);
    return false;
  }

  // 4. Screenplay pattern check — look for at least some common formatting
  const screenplayPatterns =
    /\b(INT\.|EXT\.|FADE IN|FADE OUT|CUT TO|DISSOLVE TO|CONTINUED|CONT'D)\b/i;
  const hasPatterns = screenplayPatterns.test(text);
  console.log(`[TextCheck] PASS: words=${words.length}, ratio=${ratio.toFixed(2)}, wordRatio=${wordRatio.toFixed(2)}, screenplayPatterns=${hasPatterns}`);

  return true;
}

// Extract text from PDF — tries pdf-parse first, falls back to GPT-4o-mini OCR via Responses API
async function extractPdfText(buffer: Buffer): Promise<{ text: string; usedOcr: boolean }> {
  // Try standard text extraction first (fast, free)
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  // Check QUALITY not just length — scanned PDFs produce garbled chars that pass length checks
  if (data.text && isTextReadable(data.text)) {
    return { text: data.text, usedOcr: false };
  }

  // Fallback: scanned PDF — upload to OpenAI Files API, then OCR via Chat Completions (GPT-4o)
  const extractedLen = data.text?.trim().length ?? 0;
  console.log(
    `[OCR] pdf-parse text not readable (${extractedLen} chars extracted, failed quality check). Falling back to GPT-4o OCR.`
  );
  console.log(`[OCR] PDF size: ${(buffer.length / 1_000_000).toFixed(1)}MB, pages: ${data.numpages ?? "unknown"}`);

  let fileId: string | null = null;

  try {
    // Step 1: Upload PDF to OpenAI Files API
    const uploadForm = new FormData();
    uploadForm.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
      "screenplay.pdf"
    );
    uploadForm.append("purpose", "user_data");

    console.log("[OCR] Uploading PDF to OpenAI Files API...");
    const uploadRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      console.error("[OCR] File upload error:", uploadErr);
      throw new Error("OCR: Failed to upload PDF for processing.");
    }

    const uploadResult = await uploadRes.json();
    fileId = uploadResult.id;
    console.log(`[OCR] File uploaded: ${fileId}, status: ${uploadResult.status}`);

    // Step 2: Wait briefly for file processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3: OCR via Chat Completions with file reference
    // Use GPT-4o (not mini) for better vision/OCR on scanned page images
    console.log("[OCR] Calling Chat Completions (gpt-4o) with file reference...");
    const ocrRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an OCR text extraction tool. Your job is to read scanned document pages and output the raw text. This PDF contains scanned page images of a screenplay. You MUST read the text visible in the page images and transcribe it. Output ONLY the extracted text, nothing else.",
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  file_id: fileId,
                },
              },
              {
                type: "text",
                text: "This is a scanned screenplay PDF. The pages are images. Read and transcribe ALL visible text from every page. Output ONLY the raw screenplay text — preserve character names, dialogue, scene headings (INT./EXT.), and formatting. No commentary or explanations.",
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 100000,
      }),
    });

    const responseText = await ocrRes.text();
    console.log(`[OCR] Chat Completions status: ${ocrRes.status}, response length: ${responseText.length}`);

    if (!ocrRes.ok) {
      console.error("[OCR] Chat Completions error:", responseText.substring(0, 500));
      throw new Error("OCR: Failed to extract text from scanned PDF.");
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("[OCR] Non-JSON response:", responseText.substring(0, 500));
      throw new Error("OCR: Unexpected response from text extraction service.");
    }

    const ocrText = result.choices?.[0]?.message?.content ?? "";
    console.log(`[OCR] Extracted ${ocrText.length} chars of text`);
    console.log(`[OCR] First 300 chars: ${ocrText.substring(0, 300)}`);

    // A 60-page screenplay should produce thousands of chars — 191 chars means the model
    // returned a failure message instead of actual text. Require at least 1000 chars.
    if (!ocrText || ocrText.trim().length < 1000) {
      console.error(`[OCR] Insufficient text (${ocrText.length} chars). Model likely failed to OCR.`);
      throw new Error(
        "Could not extract readable text from this scanned PDF. Please try uploading a higher-quality scan, or a digitally-created PDF."
      );
    }

    return { text: ocrText, usedOcr: true };
  } finally {
    // Clean up uploaded file
    if (fileId) {
      fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }).catch((e) => console.error("[OCR] File cleanup error:", e));
    }
  }
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

    // 1. Check auth — optional. Anonymous evals allowed for PLG flow.
    const authClient = await createAuthClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    // 2. Check subscription status if logged in
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

      const storagePath = `${user?.id ?? "anonymous"}/${submission.id}/${file.name}`;
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

      // 6. Extract text from PDF (with OCR fallback for scanned PDFs)
      const { text: scriptText, usedOcr } = await extractPdfText(buffer);
      console.log(`[Evaluate] Extracted ${scriptText?.length ?? 0} chars, usedOcr=${usedOcr}`);

      if (!scriptText || scriptText.trim().length < 100) {
        throw new Error(
          "Could not extract enough text from the PDF. The file may be corrupted or contain no readable content."
        );
      }

      // Double-check: if we didn't use OCR, verify text is actually readable
      // (belt-and-suspenders — isTextReadable should catch this, but just in case)
      if (!usedOcr && !isTextReadable(scriptText)) {
        throw new Error(
          "The PDF appears to be a scanned document that could not be read. Please upload a digitally-created PDF, or a higher-quality scan."
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
