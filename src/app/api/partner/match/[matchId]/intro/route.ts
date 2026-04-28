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
import { sendEmail } from '@/lib/email'

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

  // 5. Send the email. ReplyTo = producer's email so Reply lands in the
  //    producer's inbox. Dedupe on (template, match_id) so a stale double-
  //    submit doesn't spam the writer; if the producer wants to send a
  //    follow-up, that conversation moves to email.
  const ok = await sendEmail(
    {
      templateAlias: 'producer_intro_to_writer',
      to: writer.email,
      replyTo: producer.email,
      variables: {
        writer_first_name: writerFirstName,
        script_title: submission.title || 'Untitled',
        producer_name: producerName,
        producer_email: producer.email,
        producer_company: producerCompany,
        producer_role: producerRole,
        producer_message: message ?? '',
        report_url: reportUrl,
      },
      dedupeKey: matchId,
      tag: 'producer_intro_to_writer',
    },
    service
  )

  if (!ok) {
    // sendEmail already alerted Anuj on failure; surface a generic error.
    return NextResponse.json(
      { error: 'Could not send the intro right now. Please try again in a minute.' },
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
