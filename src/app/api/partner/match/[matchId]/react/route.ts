// POST /api/partner/match/[matchId]/react
//
// Producer reaction endpoint. Called from the partner dashboard cards and
// the script detail page. Three actions:
//   - 'interested' → status='interested', reacted_at=now()
//   - 'pass'       → status='passed',     reacted_at=now()
//   - 'comment'    → status='commented',  reacted_at=now(), comment=<text>
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

function actionToStatus(action: Action): 'interested' | 'passed' | 'commented' {
  switch (action) {
    case 'interested':
      return 'interested'
    case 'pass':
      return 'passed'
    case 'comment':
      return 'commented'
  }
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
    .select('id, producer_id')
    .eq('id', matchId)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json({ error: 'Match lookup failed.' }, { status: 500 })
  }
  if (!existing || existing.producer_id !== user.id) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status: actionToStatus(action as Action),
    reacted_at: nowIso,
  }
  if (action === 'comment') {
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

  return NextResponse.json({ ok: true, match: updated })
}
