// POST /api/partner/match/[matchId]/seen
//
// Passive view ping. Fired by the client-side IntersectionObserver tracker
// when a producer scrolls a match card into view (>=50% visible for >=800ms)
// on /partner. Flips status from 'pending' to 'opened' so the writer's
// "viewed" count reflects real exposure — not just clicks-into-detail.
//
// Idempotent + one-way:
//   - Only flips pending → opened.
//   - Never moves a card OUT of opened/interested/passed/commented — those
//     are stronger states, we don't want a passive scroll to clobber them.
//   - opened_at is set with a COALESCE pattern (only stamped once).
//
// Auth: producer must be signed in AND own this match (producer_id =
// auth.uid()). RLS enforces this too, but we do an explicit ownership
// check so the response is a clean 404 instead of an opaque RLS error.
//
// Body: empty (or ignored).
// Response: 200 always (no error if it's already not pending — caller
// fires-and-forgets and shouldn't have to care).
//
// Dedupe: the client uses sessionStorage to avoid re-pinging the same
// matchId in a single session. This endpoint is also safe to call
// repeatedly — the WHERE status='pending' guard makes the second write
// a no-op.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
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

  // Explicit ownership check before the update so the 404 is clean.
  const { data: existing, error: lookupErr } = await supabase
    .from('script_matches')
    .select('id, producer_id, status, opened_at')
    .eq('id', matchId)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json({ error: 'Match lookup failed.' }, { status: 500 })
  }
  if (!existing || existing.producer_id !== user.id) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }

  // Already past pending — nothing to do. Return 200 so the fire-and-forget
  // client doesn't see a noisy error.
  if (existing.status !== 'pending') {
    return NextResponse.json({ ok: true, changed: false })
  }

  const nowIso = new Date().toISOString()
  // Guard the UPDATE on status='pending' too — defends against a race where
  // the producer reacts (interested/pass) between our SELECT and UPDATE.
  // COALESCE-style on opened_at: only stamp if currently null.
  const { error: updateErr } = await supabase
    .from('script_matches')
    .update({
      status: 'opened',
      opened_at: existing.opened_at ?? nowIso,
    })
    .eq('id', matchId)
    .eq('status', 'pending')

  if (updateErr) {
    return NextResponse.json(
      { error: 'Could not record view.', detail: updateErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, changed: true })
}
