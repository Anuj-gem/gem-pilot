// POST /api/cron/drip-emails
//
// Runs daily (Vercel Cron). For every user who hasn't upgraded to Pro,
// checks whether they're due for a drip email based on:
//   - Time since signup (created_at on auth.users → profiles.created_at)
//   - Whether they have any completed submissions
//
// Two tracks:
//   HAS SUBMISSION (free user, completed at least one eval):
//     24h  → drip_24h        (match count nudge)
//     72h  → drip_72h        (value prop)
//     7d   → drip_7d         (new opportunities)
//     14d  → drip_14d        (final Pro push)
//
//   NO SUBMISSION (signed up, never uploaded):
//     24h  → drip_24h_nosub  (nudge to upload)
//     72h  → drip_72h_nosub  (what happens when you submit)
//     7d   → drip_7d_nosub   (live opportunity count)
//     14d  → drip_14d_nosub  (last nudge)
//
// Deduplication: each send uses dedupeKey = `${userId}_${templateAlias}`.
// The email_outbox unique constraint prevents double-sends even if cron
// fires twice. Each user gets each drip email exactly once.
//
// Protected by CRON_SECRET Bearer token (same as auto-pass-matches).

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { sendEmail, type TemplateAlias } from "@/lib/email"

export const maxDuration = 60

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// Drip schedule: [hoursAfterSignup, templateWithSub, templateNoSub]
const DRIP_SCHEDULE: [number, TemplateAlias, TemplateAlias][] = [
  [24,  'drip_24h',  'drip_24h_nosub'],
  [72,  'drip_72h',  'drip_72h_nosub'],
  [168, 'drip_7d',   'drip_7d_nosub'],    // 7 * 24
  [336, 'drip_14d',  'drip_14d_nosub'],    // 14 * 24
]

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = request.headers.get("authorization") ?? ""
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else {
    console.warn("[cron/drip-emails] CRON_SECRET not set — running without auth (dev only)")
  }

  const service = createServiceClient()
  const now = Date.now()

  // 1. Get all free users (not Pro, not producer accounts).
  //    We only drip to users who haven't upgraded.
  const { data: freeUsers, error: usersErr } = await service
    .from("profiles")
    .select("id, email, full_name, created_at")
    .or("subscription_status.is.null,subscription_status.neq.active")
    .or("account_type.is.null,account_type.eq.writer")
    .not("email", "is", null)

  if (usersErr) {
    console.error("[cron/drip-emails] user query failed:", usersErr.message)
    return NextResponse.json({ error: "User query failed" }, { status: 500 })
  }

  if (!freeUsers || freeUsers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, message: "No eligible users" })
  }

  // 2. Get submission counts per user (just need to know: 0 or >0).
  const userIds = freeUsers.map(u => u.id)
  const { data: subCounts } = await service
    .from("script_submissions")
    .select("user_id")
    .in("user_id", userIds)
    .eq("status", "completed")

  const usersWithSubs = new Set(
    (subCounts ?? []).map((r: { user_id: string }) => r.user_id)
  )

  // 3. Get active opportunity count for match_count variable.
  let oppCount = "0"
  try {
    const { count } = await service
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
    oppCount = String(count ?? 0)
  } catch {}

  // 4. Check which drip emails have already been sent (batch lookup).
  //    We query email_outbox for all drip-related dedupe keys for these users.
  const { data: sentRows } = await service
    .from("email_outbox")
    .select("dedupe_key")
    .like("dedupe_key", "%_drip_%")

  const alreadySent = new Set(
    (sentRows ?? []).map((r: { dedupe_key: string }) => r.dedupe_key)
  )

  // 5. For each user, determine which drip they're due for and send.
  let totalSent = 0
  let totalSkipped = 0

  for (const user of freeUsers) {
    if (!user.email || !user.created_at) continue

    const signupAge = now - new Date(user.created_at).getTime()
    const signupHours = signupAge / (1000 * 60 * 60)
    const hasSub = usersWithSubs.has(user.id)
    const firstName = user.full_name?.split(" ")[0] || "there"

    // Walk the schedule in reverse — send the LATEST drip they qualify for
    // that hasn't been sent yet. This way if a user signs up and the cron
    // doesn't run for 3 days, they get the 72h email (not all three).
    for (let i = DRIP_SCHEDULE.length - 1; i >= 0; i--) {
      const [hours, withSubAlias, noSubAlias] = DRIP_SCHEDULE[i]
      if (signupHours < hours) continue

      const alias = hasSub ? withSubAlias : noSubAlias
      const dedupeKey = `${user.id}_${alias}`

      if (alreadySent.has(dedupeKey)) continue

      // This is the drip they should get. Send it.
      const variables: Record<string, string> = { first_name: firstName }
      if (alias === 'drip_24h' || alias === 'drip_7d_nosub') {
        variables.match_count = oppCount
      }

      const sent = await sendEmail(
        { templateAlias: alias, to: user.email, variables, dedupeKey, tag: alias },
        service
      )

      if (sent) {
        totalSent++
        alreadySent.add(dedupeKey) // prevent sending lower drips in same run
      } else {
        totalSkipped++
      }

      // Only send ONE drip per user per cron run.
      break
    }
  }

  console.log(`[cron/drip-emails] sent=${totalSent} skipped=${totalSkipped} users=${freeUsers.length}`)
  return NextResponse.json({ ok: true, sent: totalSent, skipped: totalSkipped, users: freeUsers.length })
}
