// POST /api/cron/consideration-nudge
//
// Runs daily (Vercel Cron). For every consideration that was marked complete
// 14+ days ago AND the writer hasn't submitted a new consideration since,
// send a resubmission nudge email.
//
// Deduplication: dedupeKey = `consideration_nudge_${consideration_id}`.
// Each completed consideration triggers at most one nudge, ever.
//
// Protected by CRON_SECRET Bearer token.

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { sendEmail } from "@/lib/email"

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
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else {
    console.warn("[cron/consideration-nudge] CRON_SECRET not set — running without auth (dev only)")
  }

  const service = createServiceClient()

  // Find considerations completed 14+ days ago
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: completedConsiderations, error: fetchErr } = await service
    .from('considerations')
    .select('id, writer_id, reviewed_at')
    .eq('review_stage', 'complete')
    .lte('reviewed_at', fourteenDaysAgo)

  if (fetchErr) {
    console.error('[cron/consideration-nudge] Fetch error:', fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!completedConsiderations || completedConsiderations.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No nudge-eligible considerations' })
  }

  let sent = 0
  let skipped = 0

  for (const con of completedConsiderations as { id: string; writer_id: string; reviewed_at: string }[]) {
    // Check if writer has submitted a newer consideration after this one was completed
    const { data: newer } = await service
      .from('considerations')
      .select('id')
      .eq('writer_id', con.writer_id)
      .neq('id', con.id)
      .gte('submitted_at', con.reviewed_at)
      .limit(1)

    if (newer && newer.length > 0) {
      skipped++
      continue // Writer already resubmitted
    }

    // Get writer profile
    const { data: profile } = await service
      .from('profiles')
      .select('full_name, email')
      .eq('id', con.writer_id)
      .single()

    if (!profile?.email) {
      skipped++
      continue
    }

    const firstName = profile.full_name?.split(' ')[0] || 'there'
    const didSend = await sendEmail({
      templateAlias: 'consideration_nudge',
      to: profile.email,
      variables: { first_name: firstName },
      dedupeKey: `consideration_nudge_${con.id}`,
      tag: 'consideration_nudge',
    }, service)

    if (didSend) sent++
    else skipped++
  }

  console.log(`[cron/consideration-nudge] sent=${sent} skipped=${skipped}`)
  return NextResponse.json({ ok: true, sent, skipped })
}
