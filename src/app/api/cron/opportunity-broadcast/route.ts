// POST /api/cron/opportunity-broadcast?slug=xxx
//
// Sends new_opportunity_broadcast email to all users for the given opportunity.
// Dedupe (opp_broadcast_${oppId}_${userId}) means it's safe to call repeatedly.
// No auth required — dedupe makes it idempotent / harmless.

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
  const service = createServiceClient()

  // 1. If ?slug=xxx is passed, broadcast just that one. Otherwise broadcast all active (dedupe prevents repeats).
  const url = new URL(request.url)
  const slugParam = url.searchParams.get("slug")

  let query = service
    .from("opportunities")
    .select("id, title, formats, genres, budget_tiers, tags, description, slug")
    .eq("status", "active")

  if (slugParam) {
    query = query.eq("slug", slugParam)
  }

  const { data: newOpps, error: oppErr } = await query

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
    .not("email", "ilike", "%@gem.studio")
    .or("account_type.is.null,account_type.eq.writer")
    .or("email_unsubscribed.is.null,email_unsubscribed.eq.false")

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
    const tags = Array.isArray(opp.tags) ? opp.tags.join(", ") : (opp.tags || "")

    for (const user of users) {
      if (!user.email) continue

      const dedupeKey = `opp_broadcast_${opp.id}_${user.id}`

      const sent = await sendEmail(
        {
          templateAlias: "new_opportunity_broadcast",
          to: user.email,
          userId: user.id,
          variables: {
            opportunity_title: opp.title || "New Opportunity",
            format,
            genres,
            budget,
            tags,
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
