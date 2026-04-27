// POST /api/partner/match/[matchId]/email-click
//
// Producer-side tracking ping. Fired when the producer clicks the
// "Reply via email" mailto link on the script detail page. Stamps
// `script_matches.producer_emailed_at` with COALESCE so only the FIRST
// click is recorded — subsequent clicks don't overwrite. The writer's
// dashboard surfaces the count of producers who've reached out via email.
//
// Auth: producer must be signed in AND own this match (producer_id =
// auth.uid()). RLS enforces this too, but we do an explicit check for a
// clean 404 instead of an opaque RLS error.
//
// Body: empty (or ignored).
// Response: 200 { ok: true, producer_emailed_at: ISO timestamp }.
//
// Fire-and-forget on the client: we DON'T block the mailto navigation on
// this response, so we keep the handler small and the failure mode quiet.

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
    .select('id, producer_id, producer_emailed_at')
    .eq('id', matchId)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json({ error: 'Match lookup failed.' }, { status: 500 })
  }
  if (!existing || existing.producer_id !== user.id) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }

  // If already stamped, no-op — return the existing timestamp. Saves a
  // pointless write and matches the COALESCE semantics described in the
  // schema migration.
  if (existing.producer_emailed_at) {
    return NextResponse.json({
      ok: true,
      producer_emailed_at: existing.producer_emailed_at,
    })
  }

  const nowIso = new Date().toISOString()
  // COALESCE-style: only stamp if currently null. The .is('producer_emailed_at', null)
  // filter races safely with any concurrent click — at worst one of the two
  // updates is a no-op, and the existing timestamp wins on the next read.
  const { data: updated, error: updateErr } = await supabase
    .from('script_matches')
    .update({ producer_emailed_at: nowIso })
    .eq('id', matchId)
    .is('producer_emailed_at', null)
    .select('producer_emailed_at')
    .maybeSingle()

  if (updateErr) {
    return NextResponse.json(
      { error: 'Could not record email click.', detail: updateErr.message },
      { status: 500 }
    )
  }

  // If the .is() filter didn't match (someone else stamped first between
  // our SELECT and UPDATE), re-read the canonical value.
  let stamped = updated?.producer_emailed_at ?? null
  if (!stamped) {
    const { data: refetch } = await supabase
      .from('script_matches')
      .select('producer_emailed_at')
      .eq('id', matchId)
      .maybeSingle()
    stamped = refetch?.producer_emailed_at ?? nowIso
  }

  return NextResponse.json({ ok: true, producer_emailed_at: stamped })
}
