// POST /api/partner/match/[matchId]/react
//
// Producer reaction endpoint. Called from the partner dashboard cards and
// the script detail page. Three actions:
//   - 'interested' → status='interested', reacted_at=now().
//                    NO email fire on this transition anymore — the writer
//                    sees the Interested row in their dashboard with the
//                    producer's name + email and waits. Producer initiates
//                    the actual email conversation (tracked separately via
//                    /api/partner/match/[id]/email-click).
//   - 'pass'       → status='passed',     reacted_at=now()
//                    Optional `text`: if present, saved to `comment` so the
//                    writer can see why the producer passed.
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
    // Optional pass-with-comment. Producer can leave a short note explaining
    // why; the writer sees it under the (collapsed) Passed section in their
    // dashboard. Empty/whitespace-only text is treated as a plain pass.
    if (text.length > 0) {
      if (text.length > 2000) {
        return NextResponse.json(
          { error: 'Pass note must be 2000 characters or fewer.' },
          { status: 400 }
        )
      }
      updates.comment = text
    }
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

  // No Postmark side effect here anymore. Email direction reversed: producer
  // initiates outreach via the email-click endpoint; writer just sees the
  // Interested row appear with producer name + email in their dashboard.

  return NextResponse.json({ ok: true, match: updated })
}
