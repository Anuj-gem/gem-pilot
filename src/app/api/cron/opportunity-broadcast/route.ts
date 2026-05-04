// POST /api/cron/opportunity-broadcast
//
// Runs every 6 hours (Vercel Cron). Checks for opportunities that were
// created since the last broadcast and sends a new_opportunity_broadcast
// email to all users for each new opportunity.
//
// Deduplication: dedupeKey = `opp_broadcast_${oppId}_${userId}`.
// Each user gets each opportunity broadcast exactly once.
//
// The cron checks for opportunities created in the last 7 hours (slightly
// wider than the 6h interval to avoid gaps from timing drift).
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
    console.warn("[cron/opportunity-broadcast] CRON_SECRET not set — running without auth (dev only)")
  }

  const service = createServiceClient()

  // 1. Find opportunities created in the last 7 hours that are active.
  const lookback = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
  const { data: newOpps, error: oppErr } = await service
    .from("opportunities")
    .select("id, title, formats, genres, budget_tiers, partner_type, description, slug")
    .eq("status", "active")
    .gte("created_at", lookback)

  if (oppErr) {
    console.error("[cron/opportunity-broadcast] opportunity query failed:", oppErr.message)
    return NextResponse.json({ error: "Opportunity query failed" }, { status: 500 })
  }

  if (!newOpps || newOpps.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No new opportunities" })
  }

  // 2. Get all users with emails (we broadcast to everyone, not just Pro).
  const { data: users, error: usersErr } = await service
    .from("profiles")
    .select("id, email")
    .not("email", "is", null)
    .or("account_type.is.null,account_type.eq.writer")

  if (usersErr || !users) {
    console.error("[cron/opportunity-broadcast] user query failed:", usersErr?.message)
    return NextResponse.json({ error: "User query failed" }, { status: 500 })
  }

  let totalSent = 0
  let totalSkipped = 0
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.gem.studio"

  for (const opp of newOpps) {
    const oppUrl = `${siteUrl}/opportunities/${opp.slug || opp.id}`
    const format = Array.isArray(opp.formats) ? opp.formats.join(", ") : (opp.formats || "Any")
    const genres = Array.isArray(opp.genres) ? opp.genres.join(", ") : (opp.genres || "Any")
    const budget = Array.isArray(opp.budget_tiers) ? opp.budget_tiers.join(", ") : (opp.budget_tiers || "Any")

    for (const user of users) {
      if (!user.email) continue

      const dedupeKey = `opp_broadcast_${opp.id}_${user.id}`

      const sent = await sendEmail(
        {
          templateAlias: "new_opportunity_broadcast",
          to: user.email,
          variables: {
            opportunity_title: opp.title || "New Opportunity",
            format,
            genres,
            budget,
            partner_type: opp.partner_type || "Industry Partner",
            description: opp.description || "",
            opportunity_url: oppUrl,
          },
          dedupeKey,
          tag: "new_opportunity_broadcast",
        },
        service
      )

      if (sent) {
        totalSent++
      } else {
        totalSkipped++
      }
    }
  }

  console.log(
    `[cron/opportunity-broadcast] opps=${newOpps.length} users=${users.length} sent=${totalSent} skipped=${totalSkipped}`
  )
  return NextResponse.json({
    ok: true,
    opportunities: newOpps.length,
    users: users.length,
    sent: totalSent,
    skipped: totalSkipped,
  })
}
