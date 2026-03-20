import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

/**
 * POST /api/upload
 *
 * Accepts a script file upload, creates a script record and analysis job.
 * In production: stores file to Supabase Storage, inserts DB records.
 * Currently: returns mock IDs for client-side flow.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const scriptId = uuid();
    const jobId = uuid();
    const now = new Date().toISOString();

    // TODO: In production:
    // 1. Upload file to Supabase Storage
    // 2. Insert script record into scripts table
    // 3. Insert job record into analysis_jobs table
    // 4. Trigger evaluator pipeline (queue, webhook, or direct call)

    return NextResponse.json({
      script: {
        id: scriptId,
        title: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        file_size: file.size,
        created_at: now,
      },
      job: {
        id: jobId,
        script_id: scriptId,
        status: "pending",
        created_at: now,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
