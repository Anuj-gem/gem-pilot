// POST /api/start-submission
//
// Phase 1 of the upload flow. Creates the script_submissions row and uploads
// the PDF to storage, then returns submission_id immediately so the writer
// can sign up (incl. via Google OAuth, which redirects the page) without
// having to wait for the slow OpenAI scoring to finish.
//
// Phase 2 — the actual scoring — is /api/score-submission, called fire-and-
// forget from the client. The serverless function keeps running on Vercel
// even after the client disconnects, so the eval lands in the DB regardless
// of whether the writer bounced through Google OAuth.

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const maxDuration = 30

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

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient()
    const clientIp = getClientIp(request)

    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null
    const declaredFormatRaw = formData.get("declared_format") as string | null

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing file or title" },
        { status: 400 }
      )
    }
    if (declaredFormatRaw !== "Feature film" && declaredFormatRaw !== "Series") {
      return NextResponse.json(
        { error: "Please select a format (Feature film or Series) before uploading." },
        { status: 400 }
      )
    }
    const declaredFormat = declaredFormatRaw

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      )
    }

    // Anon submissions expire in 10 min — claimed when the writer signs up.
    const expiresAt = !user
      ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
      : null

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
      .select("id")
      .single()

    if (subError || !submission) {
      console.error("start-submission insert error:", subError)
      return NextResponse.json(
        { error: "Failed to create submission" },
        { status: 500 }
      )
    }

    // Upload the PDF to storage. ASCII-safe storage path; original filename
    // stays in the column for display.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const storagePath = `${user?.id ?? "anonymous"}/${submission.id}/script.pdf`

    const { error: uploadError } = await serviceClient.storage
      .from("scripts")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      console.error("start-submission upload error:", uploadError)
      await serviceClient
        .from("script_submissions")
        .update({
          status: "failed",
          error_message: `Storage upload failed: ${uploadError.message}`,
        })
        .eq("id", submission.id)
      return NextResponse.json(
        {
          error:
            "We couldn't store your script. Please try again, or contact support if the issue persists.",
        },
        { status: 500 }
      )
    }

    await serviceClient
      .from("script_submissions")
      .update({ file_url: storagePath })
      .eq("id", submission.id)

    return NextResponse.json({ submission_id: submission.id })
  } catch (e: any) {
    console.error("start-submission error:", e)
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error starting submission" },
      { status: 500 }
    )
  }
}
