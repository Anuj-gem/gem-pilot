// POST /api/partner/match/[matchId]/intro
//
// Producer-to-writer introduction email. Triggered from the partner
// script detail page when a producer hits "Send intro." We never expose
// the writer's email to the producer — instead, we send a Postmark
// transactional email FROM anuj@gem.studio TO the writer, with ReplyTo
// pointing at the producer's email so the writer's Reply lands directly
// in the producer's inbox.
//
// Side effects:
//   - sendEmail() → Postmark (alias: producer_intro_to_writer)
//   - script_matches.producer_emailed_at stamped (COALESCE: only first
//     send wins). Doubles as "intro already sent" signal both for the
//     producer UI and the writer's industry-activity row.
//
// Auth: producer must be signed in AND own this match. Writer must have
// an email on file. Both checks return clean 4xx errors.
//
// Request body: optional { message?: string } — short note from the
// producer. Capped at 2000 chars; trimmed.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN!
const FROM_EMAIL = 'Anuj from GEM <anuj@gem.studio>'
const STREAM = 'outbound'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await context.params
  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional producer message.
  let message: string | null = null
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body?.message === 'string') {
      const trimmed = body.message.trim().slice(0, 2000)
      if (trimmed.length > 0) message = trimmed
    }
  } catch {
    /* ignore — no body is fine */
  }

  // Service client so we can read the writer profile + script in one
  // place without RLS getting in the way of the cross-table read.
  const service = createServiceClient()

  // 1. Match → submission_id (with ownership check)
  const { data: match } = await service
    .from('script_matches')
    .select(
      'id, producer_id, submission_id, producer_emailed_at, status, unmatched_at'
    )
    .eq('id', matchId)
    .maybeSingle()
  if (!match || match.producer_id !== user.id) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }
  if (match.unmatched_at) {
    return NextResponse.json(
      { error: 'This match has ended. The writer is no longer reachable.' },
      { status: 409 }
    )
  }

  // 2. Submission → writer + script title + evaluation_id (for report URL)
  const { data: submission } = await service
    .from('script_submissions')
    .select('id, title, user_id')
    .eq('id', match.submission_id)
    .single()
  if (!submission?.user_id) {
    return NextResponse.json(
      { error: 'Writer is not reachable for this script.' },
      { status: 409 }
    )
  }

  // Latest evaluation for this submission — used to build the report URL.
  const { data: evalRow } = await service
    .from('script_evaluations')
    .select('id')
    .eq('submission_id', submission.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 3. Writer profile (recipient).
  const { data: writer } = await service
    .from('profiles')
    .select('email, full_name')
    .eq('id', submission.user_id)
    .single()
  if (!writer?.email) {
    return NextResponse.json(
      { error: 'Writer email not on file.' },
      { status: 409 }
    )
  }

  // 4. Producer profile (sender / Reply-To).
  const { data: producer } = await service
    .from('profiles')
    .select('email, full_name, company_name, industry_role')
    .eq('id', user.id)
    .single()
  if (!producer?.email) {
    return NextResponse.json(
      { error: 'Your profile is missing an email — add one before sending an intro.' },
      { status: 409 }
    )
  }

  const writerFirstName =
    (writer.full_name?.trim().split(' ')[0]) || 'there'
  const producerName = (producer.full_name?.trim()) || producer.email
  const producerCompany = producer.company_name?.trim() || ''
  const producerRole =
    producer.industry_role === 'producer'
      ? 'Producer'
      : producer.industry_role === 'representative'
        ? 'Representative'
        : ''

  const reportUrl = evalRow?.id
    ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gem.studio'}/report/${evalRow.id}`
    : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gem.studio'}/dashboard`

  // 5. Build the email body inline. We deliberately don't use a Postmark
  //    template here — keeps the whole flow in version control with no
  //    "wrong server" failure mode. Subject + HtmlBody + TextBody go
  //    straight to /email.
  const roleAffix = producerRole
    ? producerCompany
      ? ` (${producerRole}, ${producerCompany})`
      : ` (${producerRole})`
    : producerCompany
      ? ` (${producerCompany})`
      : ''

  const subject = `${producerName} reached out about ${submission.title || 'your script'} on GEM`

  const messageBlockText = message
    ? `\nTheir note:\n\n${message}\n`
    : ''

  const textBody = `Hi ${writerFirstName},

${producerName}${roleAffix} just marked your script "${submission.title || 'Untitled'}" as Interested on GEM and wanted to reach out.
${messageBlockText}
Hit Reply to this email to respond directly to ${producerName}. They'll get your reply at ${producer.email}.

You can review their interest on your dashboard:
${reportUrl}

— GEM
gem.studio
`

  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const messageBlockHtml = message
    ? `<tr><td style="padding:0 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f6ee;border-left:3px solid #d4a017;border-radius:6px;margin-bottom:18px;"><tr><td style="padding:14px 18px;"><p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#8a8579;font-weight:700;">Their note</p><p style="margin:0;font-size:15px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap;">${escape(message)}</p></td></tr></table></td></tr>`
    : ''

  const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f5f1;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e8e4d8;">
<tr><td style="padding:28px 32px 8px 32px;"><p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8579;font-weight:700;">GEM · Industry interest</p></td></tr>
<tr><td style="padding:8px 32px 0 32px;">
<h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:700;color:#0a0a0a;">Hi ${escape(writerFirstName)},</h1>
<p style="margin:0 0 18px 0;font-size:15.5px;line-height:1.55;color:#222;"><strong>${escape(producerName)}</strong>${escape(roleAffix)} just marked your script <strong>"${escape(submission.title || 'Untitled')}"</strong> as Interested on GEM and wanted to reach out.</p>
</td></tr>
${messageBlockHtml}
<tr><td style="padding:8px 32px 0 32px;"><p style="margin:0 0 18px 0;font-size:15px;line-height:1.55;color:#333;"><strong>Hit Reply to this email</strong> to respond directly to ${escape(producerName)}. Your reply lands in their inbox at <span style="color:#666;">${escape(producer.email)}</span> — GEM stays out of the way from here.</p></td></tr>
<tr><td align="left" style="padding:6px 32px 28px 32px;"><a href="${escape(reportUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:8px;">Open report on GEM →</a></td></tr>
<tr><td style="padding:0 32px 24px 32px;border-top:1px solid #efece2;"><p style="margin:18px 0 0 0;font-size:12px;line-height:1.5;color:#8a8579;">You're receiving this because you published "${escape(submission.title || 'this script')}" to industry on GEM. Adjust visibility anytime from your dashboard at <a href="https://www.gem.studio/dashboard" style="color:#7c3aed;text-decoration:none;">gem.studio/dashboard</a>.</p></td></tr>
</table>
<p style="margin:14px 0 0 0;font-size:11px;color:#8a8579;text-align:center;">GEM · gem.studio</p>
</td></tr></table></body></html>`

  // Dedupe at the application layer: if we already stamped
  // producer_emailed_at for this match, don't send again.
  if (match.producer_emailed_at) {
    return NextResponse.json({
      ok: true,
      sent_to: writer.full_name || 'the writer',
      already_sent: true,
    })
  }

  if (!POSTMARK_TOKEN) {
    return NextResponse.json(
      { error: 'Email not configured (POSTMARK_SERVER_TOKEN missing).' },
      { status: 500 }
    )
  }

  const postmarkRes = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_TOKEN,
    },
    body: JSON.stringify({
      From: FROM_EMAIL,
      To: writer.email,
      ReplyTo: producer.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: STREAM,
      TrackOpens: true,
      TrackLinks: 'HtmlOnly',
      Tag: 'producer_intro_to_writer',
    }),
  })
  const postmarkJson = await postmarkRes.json().catch(() => ({}))
  const ok = postmarkRes.ok && postmarkJson.MessageID

  // Log every send (success + failure) to email_outbox so we have an
  // audit trail and can debug from SQL if it ever fails again.
  await service.from('email_outbox').insert({
    kind: 'producer_intro_to_writer',
    payload: {
      to: writer.email,
      reply_to: producer.email,
      match_id: matchId,
      message: message ?? '',
    },
    template_alias: 'producer_intro_to_writer',
    dedupe_key: matchId,
    to_email: writer.email,
    message_id: ok ? postmarkJson.MessageID : null,
    status: ok ? 'sent' : 'failed',
    sent_at: ok ? new Date().toISOString() : null,
    error_message: ok ? null : JSON.stringify(postmarkJson).slice(0, 500),
  })

  if (!ok) {
    return NextResponse.json(
      {
        error: `Postmark error: ${postmarkJson?.Message ?? JSON.stringify(postmarkJson).slice(0, 200)}`,
      },
      { status: 502 }
    )
  }

  // 6. Stamp producer_emailed_at (COALESCE — only first send wins).
  if (!match.producer_emailed_at) {
    await service
      .from('script_matches')
      .update({ producer_emailed_at: new Date().toISOString() })
      .eq('id', matchId)
      .is('producer_emailed_at', null)
  }

  return NextResponse.json({
    ok: true,
    sent_to: writer.full_name || 'the writer',
  })
}
