// POST /api/consideration/apply — writer applies to an opportunity.
// Creates a consideration with opportunity_id, attaches selected scripts,
// and stores optional writer_pitch.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { isProStatus } from '@/lib/subscription'

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
  const { opportunity_id, script_ids, writer_pitch, application_responses, media_urls } = body as {
    opportunity_id: string
    script_ids: string[]
    writer_pitch?: string
    application_responses?: Record<string, string>
    media_urls?: Array<{ type: string; url: string; filename?: string }>
  }

  if (!opportunity_id) {
    return NextResponse.json({ error: 'Opportunity is required' }, { status: 400 })
  }
  if (!script_ids || script_ids.length === 0) {
    return NextResponse.json({ error: 'Select at least one script' }, { status: 400 })
  }

  const service = svc()

  // Usage gate — free/guest users get 2 applications, Pro gets unlimited
  const { data: profile } = await service
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  const isPro = isProStatus(profile?.subscription_status)
  if (!isPro) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count: appCount } = await service
      .from('considerations')
      .select('id', { count: 'exact', head: true })
      .eq('writer_id', user.id)
      .not('opportunity_id', 'is', null)
      .gte('created_at', monthStart)
    if ((appCount ?? 0) >= 2) {
      return NextResponse.json({ error: 'You\'ve used your 2 free applications this month. Become a member for unlimited access.' }, { status: 403 })
    }
  }

  // Verify opportunity exists. Status is intentionally NOT required: the
  // single "partner" opportunity is kept non-active so it never surfaces on
  // public listings, but writer applications still attach to it.
  const { data: opp } = await service
    .from('opportunities')
    .select('id, title, min_score')
    .eq('id', opportunity_id)
    .single()

  if (!opp) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  // Verify scripts belong to this user and are completed. Use the service
  // client (not the RLS-limited user client) so a policy can't silently hide
  // the user's own rows. Never drop a script quietly — if any requested
  // script can't be attached, fail loudly so it's visible, not a silent no-op.
  const { data: userScripts } = await service
    .from('script_submissions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .in('id', script_ids)

  const validIds = (userScripts || []).map((s: { id: string }) => s.id)
  const missing = script_ids.filter((id) => !validIds.includes(id))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Couldn't attach ${missing.length} script(s) — not found, not completed, or not owned by your account.`, missing },
      { status: 400 }
    )
  }

  // If the writer already has a pending application to this opportunity, ADD
  // the newly selected scripts to it (deduped) and re-queue it for review —
  // editing an application instead of rejecting a second submission.
  const { data: existing } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('opportunity_id', opportunity_id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { data: have } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', existing.id)
    const haveIds = new Set((have || []).map((r: { script_submission_id: string }) => r.script_submission_id))
    const toAdd = validIds.filter((id) => !haveIds.has(id))
    if (toAdd.length > 0) {
      const rows = toAdd.map((scriptId) => ({ consideration_id: existing.id, script_submission_id: scriptId, carried_forward: false }))
      const { error: addErr } = await service.from('consideration_scripts').insert(rows)
      if (addErr) return NextResponse.json({ error: addErr.message }, { status: 500 })
    }
    // Re-queue so it goes back to the front of review.
    await service
      .from('considerations')
      .update({ submitted_at: new Date().toISOString(), review_stage: 'draft', status: 'pending' })
      .eq('id', existing.id)
    return NextResponse.json({ ok: true, consideration_id: existing.id, updated: true })
  }

  // Otherwise create a fresh consideration with the selected scripts.
  const fitOriginality = application_responses?.fit_originality?.trim()
  const { data: consideration, error: createError } = await service
    .from('considerations')
    .insert({
      writer_id: user.id,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      opportunity_id,
      writer_pitch: writer_pitch?.trim() || fitOriginality || null,
      application_responses: application_responses || {},
      media_urls: media_urls || [],
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
