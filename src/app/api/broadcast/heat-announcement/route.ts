// POST /api/broadcast/heat-announcement
//
// One-off broadcast: Introducing Writer Heat.
// Sends direct HTML email (not a template) to all active writer users.
// Personalized with first_name and heat_score per user.
// Dedupe key prevents double-sends if triggered twice.
// Protected by CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateUnsubscribeUrl } from '@/lib/email'

export const maxDuration = 120

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN!
const FROM_EMAIL = 'Anuj from GEM <anuj@gem.studio>'
const REPLY_TO = 'anuj@gem.studio'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

function buildHtml(firstName: string, unsubUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Introducing Writer Heat</title>
</head>
<body style="margin:0; padding:0; background:#f5f5f4; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden;">

<!-- Header -->
<tr><td style="padding:36px 32px 24px; text-align:center;">
  <p style="margin:0 0 4px; font-size:13px; letter-spacing:2px; color:#a1a1aa; text-transform:uppercase;">GEM Update</p>
  <h1 style="margin:0; font-size:26px; font-weight:700; color:#18181b; line-height:1.3;">Introducing Writer Heat &#128293;</h1>
</td></tr>

<!-- Intro -->
<tr><td style="padding:0 32px 24px;">
  <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#3f3f46;">Hey ${firstName},</p>
  <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#3f3f46;">Thank you for your patience as we've rolled out our new review system. Things are moving &mdash; reviews are going out and applications are progressing. If you haven't seen movement yet, you will very soon.</p>
  <p style="margin:0; font-size:15px; line-height:1.6; color:#3f3f46;">Today we're introducing <strong>Writer Heat</strong> &mdash; a score that builds on your account and by script as you submit to opportunities and move further through the review process. Partners see your heat when reviewing applications, so as it rises, you naturally stand out. It rewards consistency and quality &mdash; the more you put your work out there, the more you distinguish yourself.</p>
</td></tr>

<!-- How Heat Works -->
<tr><td style="padding:0 32px 8px;">
  <p style="margin:0 0 16px; font-size:12px; letter-spacing:1.5px; color:#a1a1aa; text-transform:uppercase; font-weight:600;">How Heat Works</p>
</td></tr>

<tr><td style="padding:0 32px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
    <tr>
      <td style="padding:14px 16px; border-bottom:1px solid #f3f4f6; vertical-align:middle;">
        <p style="margin:0; font-size:14px; font-weight:600; color:#18181b;">Strong writing, competitive field</p>
        <p style="margin:2px 0 0; font-size:12px; color:#71717a;">Pass &mdash; partner liked the craft</p>
      </td>
      <td style="padding:14px 16px; border-bottom:1px solid #f3f4f6; text-align:right; vertical-align:middle; white-space:nowrap;">
        <span style="font-size:14px; font-weight:700; color:#ea580c;">+1 &#128293;</span>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 16px; border-bottom:1px solid #f3f4f6; vertical-align:middle;">
        <p style="margin:0; font-size:14px; font-weight:600; color:#18181b;">Shortlisted for deeper review</p>
        <p style="margin:2px 0 0; font-size:12px; color:#71717a;">Your script moved to the next round</p>
      </td>
      <td style="padding:14px 16px; border-bottom:1px solid #f3f4f6; text-align:right; vertical-align:middle; white-space:nowrap;">
        <span style="font-size:14px; font-weight:700; color:#ea580c;">+2 &#128293;</span>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 16px; vertical-align:middle;">
        <p style="margin:0; font-size:14px; font-weight:600; color:#18181b;">Partner match</p>
        <p style="margin:2px 0 0; font-size:12px; color:#71717a;">A partner wants to connect with you</p>
      </td>
      <td style="padding:14px 16px; text-align:right; vertical-align:middle; white-space:nowrap;">
        <span style="font-size:14px; font-weight:700; color:#ea580c;">+3 &#128293;</span>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Callout -->
<tr><td style="padding:0 32px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed; border-radius:10px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0; font-size:14px; line-height:1.5; color:#9a3412;">Even a pass can earn you heat. If a partner thought your writing was strong but the slot wasn't right, you still get credit. Heat rewards good work &mdash; not just outcomes.</p>
    </td></tr>
  </table>
</td></tr>

<!-- Example Card -->
<tr><td style="padding:0 32px 8px;">
  <p style="margin:0 0 16px; font-size:12px; letter-spacing:1.5px; color:#a1a1aa; text-transform:uppercase; font-weight:600;">Example: What it looks like</p>
</td></tr>

<tr><td style="padding:0 32px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-left:3px solid #7c3aed; border-radius:0 10px 10px 0; overflow:hidden;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <p style="margin:0; font-size:15px; font-weight:700; color:#18181b; font-family:Georgia, serif;">Producible Thriller</p>
          </td>
          <td style="text-align:right; vertical-align:middle; white-space:nowrap;">
            <span style="font-size:12px; font-weight:700; color:#ea580c;">+3 &#128293;</span>
          </td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;">
        <tr>
          <td style="padding:3px 10px; background:#f3f4f6; border-radius:20px; font-size:11px; font-weight:600; color:#22c55e;">&#10003; Reviewed</td>
          <td style="width:8px;">&nbsp;</td>
          <td style="padding:3px 10px; background:#f3f4f6; border-radius:20px; font-size:11px; font-weight:600; color:#22c55e;">&#10003; Shortlisted</td>
          <td style="width:8px;">&nbsp;</td>
          <td style="padding:3px 10px; background:#f3f4f6; border-radius:20px; font-size:11px; font-weight:600; color:#6b7280;">Pass</td>
        </tr>
      </table>
      <p style="margin:12px 0 0; font-size:13px; line-height:1.5; color:#52525b; font-style:italic; border-left:2px solid #e5e7eb; padding-left:12px;">"Tight, propulsive writing with a genuine sense of menace. Made it to our shortlist &mdash; ultimately went another direction but we'd want to see what you write next."</p>
    </td></tr>
  </table>
</td></tr>

<!-- New Stages Section -->
<tr><td style="padding:0 32px 8px;">
  <p style="margin:0 0 16px; font-size:12px; letter-spacing:1.5px; color:#a1a1aa; text-transform:uppercase; font-weight:600;">Updated Review Stages</p>
</td></tr>

<tr><td style="padding:0 32px 24px;">
  <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#3f3f46;">Applications now move through clear stages so you always know where you stand:</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:28px; vertical-align:top; text-align:center;">
        <div style="width:24px; height:24px; background:#7c3aed; border-radius:50%; line-height:24px; text-align:center; color:white; font-size:12px; font-weight:700;">1</div>
        <div style="width:2px; height:24px; background:#e5e7eb; margin:4px auto;"></div>
      </td>
      <td style="padding:2px 0 16px 12px;">
        <p style="margin:0; font-size:14px; font-weight:600; color:#18181b;">Under Review</p>
        <p style="margin:2px 0 0; font-size:13px; color:#71717a;">Your application is being reviewed by our partners.</p>
      </td>
    </tr>
    <tr>
      <td style="width:28px; vertical-align:top; text-align:center;">
        <div style="width:24px; height:24px; background:#7c3aed; border-radius:50%; line-height:24px; text-align:center; color:white; font-size:12px; font-weight:700;">2</div>
        <div style="width:2px; height:24px; background:#e5e7eb; margin:4px auto;"></div>
      </td>
      <td style="padding:2px 0 16px 12px;">
        <p style="margin:0; font-size:14px; font-weight:600; color:#18181b;">Shortlisted</p>
        <p style="margin:2px 0 0; font-size:13px; color:#71717a;">Your script stood out &mdash; it's getting a deeper look.</p>
      </td>
    </tr>
    <tr>
      <td style="width:28px; vertical-align:top; text-align:center;">
        <div style="width:24px; height:24px; background:#ea580c; border-radius:50%; line-height:24px; text-align:center; color:white; font-size:12px; font-weight:700;">3</div>
      </td>
      <td style="padding:2px 0 0 12px;">
        <p style="margin:0; font-size:14px; font-weight:600; color:#18181b;">Partner Match</p>
        <p style="margin:2px 0 0; font-size:13px; color:#71717a;">A partner wants to start a conversation with you.</p>
      </td>
    </tr>
  </table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 32px 32px; text-align:center;">
  <a href="https://www.gem.studio/dashboard" style="display:inline-block; padding:14px 32px; background:#7c3aed; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:8px;">View Your Dashboard</a>
</td></tr>

<!-- Sign-off -->
<tr><td style="padding:0 32px 32px;">
  <p style="margin:0 0 4px; font-size:15px; line-height:1.6; color:#3f3f46;">More to come. Keep writing.</p>
  <p style="margin:0; font-size:15px; color:#3f3f46;">&mdash; Anuj</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px; border-top:1px solid #f3f4f6; text-align:center;">
  <p style="margin:0 0 4px; font-size:12px; color:#a1a1aa;">GEM &mdash; gem.studio</p>
  <p style="margin:0; font-size:12px; color:#a1a1aa;"><a href="${unsubUrl}" style="color:#a1a1aa; text-decoration:underline;">Unsubscribe</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = request.headers.get('authorization') ?? ''
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const service = createServiceClient()

  // Get all non-unsubscribed writer users
  const { data: users, error: usersErr } = await service
    .from('profiles')
    .select('id, email, full_name')
    .not('email', 'is', null)
    .or('account_type.is.null,account_type.eq.writer')
    .or('email_unsubscribed.is.null,email_unsubscribed.eq.false')

  if (usersErr || !users) {
    console.error('[broadcast/heat] user query failed:', usersErr?.message)
    return NextResponse.json({ error: 'User query failed' }, { status: 500 })
  }

  // Check which users already got this broadcast (dedupe)
  const { data: sentRows } = await service
    .from('email_outbox')
    .select('dedupe_key')
    .like('dedupe_key', 'heat_announcement_%')

  const alreadySent = new Set(
    (sentRows ?? []).map((r: { dedupe_key: string }) => r.dedupe_key)
  )

  let sent = 0
  let skipped = 0

  for (const user of users) {
    if (!user.email) continue

    const dedupeKey = `heat_announcement_${user.id}`
    if (alreadySent.has(dedupeKey)) {
      skipped++
      continue
    }

    const firstName = user.full_name?.split(' ')[0] || 'there'
    const unsubUrl = generateUnsubscribeUrl(user.id)
    const html = buildHtml(firstName, unsubUrl)

    // Claim the send (dedupe)
    const { error: claimErr } = await service
      .from('email_outbox')
      .insert({
        kind: 'heat_announcement',
        payload: { to: user.email },
        template_alias: null,
        dedupe_key: dedupeKey,
        to_email: user.email,
        status: 'pending',
      })

    if (claimErr) {
      skipped++
      continue
    }

    try {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': POSTMARK_TOKEN,
        },
        body: JSON.stringify({
          From: FROM_EMAIL,
          ReplyTo: REPLY_TO,
          To: user.email,
          Subject: 'Introducing the Writer Heat Score 🔥',
          HtmlBody: html,
          MessageStream: 'outbound',
          TrackOpens: true,
          TrackLinks: 'HtmlOnly',
          Tag: 'heat_announcement',
        }),
      })

      const json = await res.json()
      const ok = res.ok && json.MessageID

      await service
        .from('email_outbox')
        .update(
          ok
            ? { status: 'sent', message_id: json.MessageID, sent_at: new Date().toISOString() }
            : { status: 'failed', error_message: JSON.stringify(json).slice(0, 500) }
        )
        .eq('dedupe_key', dedupeKey)

      if (ok) sent++
      else skipped++
    } catch (err: any) {
      await service
        .from('email_outbox')
        .update({ status: 'failed', error_message: err?.message?.slice(0, 500) ?? 'unknown' })
        .eq('dedupe_key', dedupeKey)
      skipped++
    }
  }

  console.log(`[broadcast/heat] sent=${sent} skipped=${skipped} total=${users.length}`)
  return NextResponse.json({ ok: true, sent, skipped, total: users.length })
}
