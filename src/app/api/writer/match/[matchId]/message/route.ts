// POST /api/writer/match/[matchId]/message
//
// Writer side of the message thread. Appends a writer reply to the match's
// `messages` jsonb array. Producer + writer share the same array; sender
// is distinguished via `sender_role`.
//
// Auth: writer must be signed in AND must own the script_submission tied
// to this match. RLS allows writers to update matches on their own
// submissions; we double-check explicitly so the 404 is clean.
//
// Body: { text: string }, 1-2000 chars.
// Side effect: if the match status is 'interested' (no producer reply yet),
// we leave it alone — the writer replying first shouldn't flip it to
// 'commented' since that pill is the producer-side signal. If the match is
// 'opened' or 'pending', the writer can't reply (gated by UI, but enforced
// here too).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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

  let body: { text?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (text.length < 1 || text.length > 2000) {
    return NextResponse.json(
      { error: 'Message must be 1-2000 characters.' },
      { status: 400 }
    )
  }

  // Pull the match + the joined submission so we can verify the writer
  // owns the script tied to this match. Single round trip.
  const { data: matchRow, error: lookupErr } = await supabase
    .from('script_matches')
    .select(
      `
      id, status, messages, unmatched_at,
      script_submissions ( user_id )
      `
    )
    .eq('id', matchId)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json({ error: 'Match lookup failed.' }, { status: 500 })
  }
  if (!matchRow) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }

  const sub = Array.isArray(matchRow.script_submissions)
    ? matchRow.script_submissions[0]
    : matchRow.script_submissions
  if (!sub || sub.user_id !== user.id) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }

  // Writer can only post into the thread once the producer is engaged. The
  // UI hides the input until `interested` / `commented`, so this is mostly
  // belt-and-braces.
  if (matchRow.status !== 'interested' && matchRow.status !== 'commented') {
    return NextResponse.json(
      { error: 'Producer hasn’t marked this Interested yet.' },
      { status: 409 }
    )
  }
  if (matchRow.unmatched_at) {
    return NextResponse.json(
      { error: 'This match has been unmatched.' },
      { status: 409 }
    )
  }

  const prev: ThreadMessage[] = Array.isArray(matchRow.messages)
    ? (matchRow.messages as ThreadMessage[])
    : []
  const newMsg: ThreadMessage = {
    sender_role: 'writer',
    text,
    at: new Date().toISOString(),
  }

  const { data: updated, error: updateErr } = await supabase
    .from('script_matches')
    .update({ messages: [...prev, newMsg] })
    .eq('id', matchId)
    .select()
    .single()

  if (updateErr || !updated) {
    return NextResponse.json(
      { error: 'Could not save message.', detail: updateErr?.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, match: updated })
}
