// POST /api/admin/run-matching/[submissionId]
//
// Manual trigger for the producer matching pipeline. Useful when Anuj
// wants to backfill matches against an older submission, or re-run the
// matcher after tweaking the predicate.
//
// Auth: caller must EITHER be signed in as anuj@gem.studio OR present
// the shared admin token via `Authorization: Bearer ${ADMIN_API_TOKEN}`.

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createMatchesForSubmission } from "@/lib/matching"

const ADMIN_EMAIL = "anuj@gem.studio"

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

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const adminToken = process.env.ADMIN_API_TOKEN
  if (adminToken) {
    const header = request.headers.get("authorization") ?? ""
    if (header === `Bearer ${adminToken}`) return true
  }
  const auth = await createAuthClient()
  const { data: { user } } = await auth.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ submissionId: string }> }
) {
  const authorized = await isAuthorized(request)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { submissionId } = await context.params
  if (!submissionId) {
    return NextResponse.json({ error: "Missing submissionId" }, { status: 400 })
  }

  const service = createServiceClient()

  try {
    const result = await createMatchesForSubmission(submissionId, service)
    console.log(
      `[admin/run-matching] submission=${submissionId} created=${result.matchesCreated} skipped=${result.matchesSkipped} candidates=${result.candidatesEvaluated}`
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[admin/run-matching] failed:", message)
    return NextResponse.json(
      { error: "Matching failed", detail: message },
      { status: 500 }
    )
  }
}
