// POST /api/partner/match/[matchId]/react
//
// Producer reaction endpoint. Called from the partner dashboard cards and
// the script detail page. Four actions:
//   - 'interested' → status='interested', reacted_at=now()
//   - 'pass'       → status='passed',     reacted_at=now()
//   - 'comment'    → status='commented',  reacted_at=now(), comment=<text>
//                    (legacy single-field action; kept for compat with cards
//                     that still POST { action: 'comment' })
//   - 'message'    → appends { sender_role: 'producer', text, at } to the
//                    `messages` jsonb thread. If status was 'interested',
//                    flips to 'commented' so the writer sees a "Replied" pill.
//                    Producer must already be 'interested' or 'commented' —
//                    pre-Interested rows can't post messages.
//
// Auth: producer must be signed in. RLS on script_matches enforces that
// they own the row (producer_id = auth.uid()), but we also do an explicit
// ownership check to return a clean 404 instead of an opaque RLS error.
//
// Returns the updated match row. Caller is expected to refresh the router
// after success.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

type Action = 'interested' | 'pass' | 'comment' | 'message'

const VALID_ACTIONS: ReadonlyArray<Action> = ['interested', 'pass', 'comment', 'message']

interface ThreadMessage {
  sender_role: 'producer' | 'writer'
  text: string
  at: string
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
      { error: 'action must be one of: interested, pass, comment, message' },
      { status: 400 }
    )
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (action === 'comment' || action === 'message') {
    if (text.length < 1 || text.length > 2000) {
      return NextResponse.json(
        {
          error:
            action === 'message'
              ? 'Message must be 1-2000 characters.'
              : 'Comment must be 5-2000 characters.',
        },
        { status: 400 }
      )
    }
    if (action === 'comment' && text.length < 5) {
      return NextResponse.json(
        { error: 'Comment must be 5-2000 characters.' },
        { status: 400 }
      )
    }
  }

  // Explicit ownership check before the update so the 404 is clean. Pull
  // status + messages too — we need both for the message-append path.
  const { data: existing, error: lookupErr } = await supabase
    .from('script_matches')
    .select('id, producer_id, status, messages')
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
    // Legacy single-field comment. We keep this for cards that still POST
    // {action: 'comment'}; the new gated detail page uses 'message'.
    updates.status = 'commented'
    updates.reacted_at = nowIso
    updates.comment = text
  } else if (action === 'message') {
    // Producer must have already marked Interested before they can post
    // into the thread. The pre-Interested UI doesn't expose this anyway,
    // but defense in depth.
    if (existing.status !== 'interested' && existing.status !== 'commented') {
      return NextResponse.json(
        { error: 'Mark this match Interested before sending a message.' },
        { status: 409 }
      )
    }
    const prevMessages: ThreadMessage[] = Array.isArray(existing.messages)
      ? (existing.messages as ThreadMessage[])
      : []
    const newMessage: ThreadMessage = {
      sender_role: 'producer',
      text,
      at: nowIso,
    }
    updates.messages = [...prevMessages, newMessage]
    // Surface to the writer via the "Replied" pill.
    if (existing.status === 'interested') {
      updates.status = 'commented'
    }
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
