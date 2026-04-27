// POST /api/writer/match/[matchId]/unmatch
//
// Writer-initiated unmatch. Sets unmatched_at = now(), unmatched_by =
// 'writer', and stores the optional reason. The row stays in the table —
// we soft-end the match so we keep the audit trail and so the producer
// dashboard can show "Writer ended this match" instead of the row vanishing.
//
// Auth: writer must be signed in AND must own the script_submission tied
// to this match. We confirm with an explicit ownership check before
// updating; RLS allows the same operation, but we want a clean 404.
//
// Body: { reason?: string }, capped at 500 chars (preset reasons or short
// free text). If absent we just record `unmatched_by` and the timestamp.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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

  let body: { reason?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Reason is optional — empty body is fine.
    body = {}
  }

  const reasonRaw = typeof body.reason === 'string' ? body.reason.trim() : ''
  const reason = reasonRaw.length > 500 ? reasonRaw.slice(0, 500) : reasonRaw

  // Ownership check: pull the joined submission's user_id.
  const { data: matchRow, error: lookupErr } = await supabase
    .from('script_matches')
    .select(
      `
      id, unmatched_at,
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

  if (matchRow.unmatched_at) {
    // Idempotent — second click shouldn't error out.
    return NextResponse.json({ ok: true, alreadyUnmatched: true })
  }

  const { error: updateErr } = await supabase
    .from('script_matches')
    .update({
      unmatched_at: new Date().toISOString(),
      unmatched_by: 'writer',
      unmatch_reason: reason || null,
    })
    .eq('id', matchId)

  if (updateErr) {
    return NextResponse.json(
      { error: 'Could not unmatch.', detail: updateErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
