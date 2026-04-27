// POST /api/partner/match/[matchId]/react
//
// Producer reaction endpoint. Called from the partner dashboard cards and
// the script detail page. Three actions:
//   - 'interested' → status='interested', reacted_at=now()
//                    Side effect: fires the `producer_interested_intro`
//                    Postmark email to the writer with the producer's
//                    name + email + script title + report URL. The whole
//                    "talk to the writer" flow now happens over email; GEM
//                    just tracks that the introduction happened.
//   - 'pass'       → status='passed',     reacted_at=now()
//   - 'comment'    → status='commented',  reacted_at=now(), comment=<text>
//                    (legacy single-field action; kept for compat with cards
//                     that still POST { action: 'comment' })
//
// Auth: producer must be signed in. RLS on script_matches enforces that
// they own the row (producer_id = auth.uid()), but we also do an explicit
// ownership check to return a clean 404 instead of an opaque RLS error.
//
// Returns the updated match row. Caller is expected to refresh the router
// after success.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

type Action = 'interested' | 'pass' | 'comment'

const VALID_ACTIONS: ReadonlyArray<Action> = ['interested', 'pass', 'comment']

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

  let body: { action?: string; text?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  if (!action || !VALID_ACTIONS.includes(action as Action)) {
    return NextResponse.json(
      { error: 'action must be one of: interested, pass, comment' },
      { status: 400 }
    )
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (action === 'comment') {
    if (text.length < 5 || text.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be 5-2000 characters.' },
        { status: 400 }
      )
    }
  }

  // Explicit ownership check before the update so the 404 is clean.
  const { data: existing, error: lookupErr } = await supabase
    .from('script_matches')
    .select('id, producer_id, status, submission_id')
    .eq('id', matchId)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json({ error: 'Match lookup failed.' }, { status: 500 })
  }
  if (!existing || existing.producer_id !== user.id) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  if (action === 'interested') {
    updates.status = 'interested'
    updates.reacted_at = nowIso
  } else if (action === 'pass') {
    updates.status = 'passed'
    updates.reacted_at = nowIso
  } else if (action === 'comment') {
    // Legacy single-field comment. Cards on the writer dashboard still
    // surface this. The new gated detail page no longer exposes it.
    updates.status = 'commented'
    updates.reacted_at = nowIso
    updates.comment = text
  }

  const { data: updated, error: updateErr } = await supabase
    .from('script_matches')
    .update(updates)
    .eq('id', matchId)
    .select()
    .single()

  if (updateErr || !updated) {
    return NextResponse.json(
      { error: 'Could not update match.', detail: updateErr?.message },
      { status: 500 }
    )
  }

  // --- Side effect: fire the producer_interested_intro email to the writer.
  // Only on the 'interested' transition. Wrapped in try/catch so a Postmark
  // failure (template missing, network blip, etc.) doesn't kill the action —
  // the producer's reaction has already been recorded above.
  //
  // MUST await — see /api/evaluate / /api/score-submission for the pattern.
  // Vercel Lambda kills in-flight fetches the moment we return, so a
  // non-awaited send leaves the email_outbox row stuck at 'pending' forever.
  //
  // TODO(postmark): the `producer_interested_intro` template needs to be
  // created in the Postmark dashboard. Variables it'll receive:
  //   - writer_first_name: string
  //   - producer_name: string
  //   - producer_email: string
  //   - script_title: string
  //   - script_report_url: string (link to the writer's report page)
  // Suggested subject template: "{{producer_name}} wants to talk about {{script_title}}"
  // Until the template exists, sendEmail will return false and log loudly;
  // we still 200 the request so the producer's flow isn't blocked.
  if (action === 'interested') {
    try {
      // Pull producer + writer + script title in parallel — three small
      // single-row reads, no point chaining them.
      const [producerRes, matchDetailRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('script_matches')
          .select(
            `
            id,
            script_submissions (
              title,
              user_id,
              profiles ( full_name, email ),
              script_evaluations ( id )
            )
            `
          )
          .eq('id', matchId)
          .maybeSingle(),
      ])

      const producer = producerRes.data
      const matchDetail = matchDetailRes.data as
        | {
            id: string
            script_submissions: {
              title: string | null
              user_id: string | null
              profiles: { full_name: string | null; email: string | null } | null
              script_evaluations:
                | Array<{ id: string }>
                | { id: string }
                | null
            } | null
          }
        | null

      const sub = matchDetail?.script_submissions ?? null
      const writer = sub?.profiles ?? null
      const evalRow = Array.isArray(sub?.script_evaluations)
        ? sub?.script_evaluations[0]
        : sub?.script_evaluations
      const evalId = evalRow?.id ?? null

      const producerName = producer?.full_name?.trim() || producer?.email || 'A GEM producer'
      const producerEmail = producer?.email ?? ''
      const writerEmail = writer?.email ?? null
      const writerFirstName =
        writer?.full_name?.split(' ')[0]?.trim() ||
        (writerEmail ? writerEmail.split('@')[0] : 'there')
      const scriptTitle = sub?.title ?? 'your script'
      const scriptReportUrl = evalId
        ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gem.studio'}/report/${evalId}`
        : ''

      if (!writerEmail) {
        console.warn(
          `[partner.react] interested fired for match ${matchId} but writer has no email; skipping intro email.`
        )
      } else {
        // Cast to bypass the TemplateAlias union — the alias literal isn't
        // in the typed enum yet (Postmark template still needs to be set up
        // per the TODO above). Once the template ships, add
        // 'producer_interested_intro' to TemplateAlias in lib/email.ts and
        // drop this cast.
        await sendEmail(
          {
            templateAlias: 'producer_interested_intro' as never,
            to: writerEmail,
            variables: {
              writer_first_name: writerFirstName,
              producer_name: producerName,
              producer_email: producerEmail,
              script_title: scriptTitle,
              script_report_url: scriptReportUrl,
            },
            // Idempotent per (match, action) so the dedupe insert blocks any
            // accidental double-fires (double-click on Interested, etc.).
            dedupeKey: `match:${matchId}:interested`,
            tag: 'producer_interested_intro',
          },
          supabase
        )
      }
    } catch (err) {
      // Loud log, but DON'T fail the request. The producer's reaction is
      // already saved; the worst case is we missed the writer email and
      // the writer still sees the new Interested row in their dashboard
      // with the producer's email + mailto button.
      console.error(
        `[partner.react] producer_interested_intro email failed for match ${matchId}:`,
        err
      )
    }
  }

  return NextResponse.json({ ok: true, match: updated })
}
