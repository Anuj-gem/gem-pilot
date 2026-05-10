// POST /api/consideration/apply — writer applies to an opportunity.
// Creates a consideration with opportunity_id, attaches selected scripts,
// and stores optional writer_pitch.

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
  const { opportunity_id, script_ids, writer_pitch } = body as {
    opportunity_id: string
    script_ids: string[]
    writer_pitch?: string
  }

  if (!opportunity_id) {
    return NextResponse.json({ error: 'Opportunity is required' }, { status: 400 })
  }
  if (!script_ids || script_ids.length === 0) {
    return NextResponse.json({ error: 'Select at least one script' }, { status: 400 })
  }

  const service = svc()

  // Verify opportunity exists and is active
  const { data: opp } = await service
    .from('opportunities')
    .select('id, title, min_score')
    .eq('id', opportunity_id)
    .eq('status', 'active')
    .single()

  if (!opp) {
    return NextResponse.json({ error: 'Opportunity not found or closed' }, { status: 404 })
  }

  // Check no existing pending application to this same opportunity
  const { data: existing } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('opportunity_id', opportunity_id)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You already have a pending application for this opportunity' }, { status: 409 })
  }

  // Verify scripts belong to this user and are completed
  const { data: userScripts } = await supabase
    .from('script_submissions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .in('id', script_ids)

  const validIds = (userScripts || []).map((s: { id: string }) => s.id)
  if (validIds.length === 0) {
    return NextResponse.json({ error: 'No valid scripts found' }, { status: 400 })
  }

  // Create consideration with opportunity_id
  const { data: consideration, error: createError } = await service
    .from('considerations')
    .insert({
      writer_id: user.id,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      opportunity_id,
      writer_pitch: writer_pitch?.trim() || null,
    })
    .select('id')
    .single()

  if (createError || !consideration) {
    return NextResponse.json({ error: createError?.message || 'Failed to create' }, { status: 500 })
  }

  // Attach scripts
  const scriptRows = validIds.map(scriptId => ({
    consideration_id: consideration.id,
    script_submission_id: scriptId,
    carried_forward: false,
  }))

  const { error: insertError } = await service
    .from('consideration_scripts')
    .insert(scriptRows)

  if (insertError) {
    await service.from('considerations').delete().eq('id', consideration.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, consideration_id: consideration.id })
}
