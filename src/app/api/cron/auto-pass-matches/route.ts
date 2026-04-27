// POST /api/cron/auto-pass-matches
//
// Sweeps the script_matches table and auto-passes any pending row whose
// expires_at has lapsed. Producers get a default response window; if they
// don't react in time the row is marked passed so the writer knows the
// match has cleared.
//
// Designed for Vercel Cron. Protected by a shared secret in
// `Authorization: Bearer ${CRON_SECRET}`. If the env var isn't set we log
// a warning and proceed so local dev still works.

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const maxDuration = 60

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = request.headers.get("authorization") ?? ""
    const expected = `Bearer ${secret}`
    if (header !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else {
    console.warn(
      "[cron/auto-pass-matches] CRON_SECRET not set — running without auth (dev only)"
    )
  }

  const service = createServiceClient()
  const nowIso = new Date().toISOString()

  // Update + return ids so we can report a count.
  const { data, error } = await service
    .from("script_matches")
    .update({ status: "passed", reacted_at: nowIso })
    .eq("status", "pending")
    .lt("expires_at", nowIso)
    .select("id")

  if (error) {
    console.error("[cron/auto-pass-matches] update failed:", error.message)
    return NextResponse.json(
      { error: "Auto-pass update failed", detail: error.message },
      { status: 500 }
    )
  }

  const passedCount = data?.length ?? 0
  console.log(`[cron/auto-pass-matches] auto-passed ${passedCount} match(es)`)
  return NextResponse.json({ ok: true, passed: passedCount })
}
