// POST /api/partner/triage — producer triages an application (pass/watchlist/meet).
// Does NOT change existing review_stage or status. Purely additive.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { consideration_id, action, feedback_tags } = body as {
    consideration_id: string
    action: 'pass' | 'watchlist' | 'meet'
    feedback_tags?: string[]
  }

  if (!consideration_id || !action) {
    return NextResponse.json({ error: 'Missing consideration_id or action' }, { status: 400 })
  }

  if (!['pass', 'watchlist', 'meet'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const service = svc()

  // Verify the consideration exists and belongs to an opportunity this producer owns
  const { data: consideration } = await service
    .from('considerations')
    .select('id, opportunity_id, writer_id')
    .eq('id', consideration_id)
    .single()

  if (!consideration) {
    return NextResponse.json({ error: 'Consideration not found' }, { status: 404 })
  }

  const { data: opp } = await service
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', consideration.opportunity_id)
    .single()

  if (!opp || opp.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Update the consideration with triage status
  const updateData: Record<string, unknown> = {
    triage_status: action,
    triaged_at: new Date().toISOString(),
  }
  if (action === 'pass' && feedback_tags?.length) {
    updateData.triage_feedback_tags = feedback_tags
  }

  await service
    .from('considerations')
    .update(updateData)
    .eq('id', consideration_id)

  // If watchlisting, also add to writer_watchlist (upsert — ignore if already watching)
  if (action === 'watchlist') {
    await service
      .from('writer_watchlist')
      .upsert({
        producer_id: user.id,
        writer_id: consideration.writer_id,
        consideration_id,
      }, { onConflict: 'producer_id,writer_id' })
  }

  // If un-watchlisting (e.g. passing after watchlist), remove from watchlist
  if (action === 'pass') {
    await service
      .from('writer_watchlist')
      .delete()
      .eq('producer_id', user.id)
      .eq('writer_id', consideration.writer_id)
  }

  return NextResponse.json({ ok: true, triage_status: action })
}
