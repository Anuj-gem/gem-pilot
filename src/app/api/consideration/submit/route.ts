// POST /api/consideration/submit — writer submits scripts for consideration.
// After creating the consideration, fires background re-evaluations for any
// scripts still on an old prompt version (fire-and-forget — doesn't block).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { CURRENT_PROMPT_VERSION } from '@/lib/evaluation-prompt'
import { sendEmail } from '@/lib/email'

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
  const { script_ids, carried_ids } = body as {
    script_ids: string[]
    carried_ids: string[]
  }

  if (!script_ids || script_ids.length === 0) {
    return NextResponse.json({ error: 'Select at least one script' }, { status: 400 })
  }

  const service = svc()

  // Check no active consideration already exists
  const { data: existing } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You already have an active consideration' }, { status: 409 })
  }

  // TRIAL GATE: free users who've been reviewed once cannot resubmit
  const { data: profileCheck } = await service
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  if (profileCheck?.subscription_status !== 'active') {
    const { data: pastReview } = await service
      .from('considerations')
      .select('id')
      .eq('writer_id', user.id)
      .eq('status', 'reviewed')
      .limit(1)
    if (pastReview && pastReview.length > 0) {
      return NextResponse.json({ error: 'Upgrade to Pro for additional considerations' }, { status: 403 })
    }
  }

  // Verify scripts belong to this user
  const { data: userScripts } = await supabase
    .from('script_submissions')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .in('id', script_ids)
    .order('created_at', { ascending: true })

  const validIds = new Set((userScripts || []).map((s: { id: string }) => s.id))
  let verifiedIds = script_ids.filter(id => validIds.has(id))

  // Trial users can only submit their first (oldest) script
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  if (profile?.subscription_status !== 'active' && userScripts && userScripts.length > 0) {
    // Get the user's very first script (oldest created_at across ALL their scripts)
    const { data: firstScript } = await supabase
      .from('script_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (firstScript) {
      verifiedIds = verifiedIds.filter(id => id === firstScript.id)
    }
  }

  if (verifiedIds.length === 0) {
    return NextResponse.json({ error: 'No valid scripts found' }, { status: 400 })
  }

  // Create consideration
  const { data: consideration, error: createError } = await service
    .from('considerations')
    .insert({
      writer_id: user.id,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (createError || !consideration) {
    return NextResponse.json({ error: createError?.message || 'Failed to create' }, { status: 500 })
  }

  // Insert consideration_scripts
  const carriedSet = new Set(carried_ids || [])
  const scriptRows = verifiedIds.map(scriptId => ({
    consideration_id: consideration.id,
    script_submission_id: scriptId,
    carried_forward: carriedSet.has(scriptId),
  }))

  const { error: insertError } = await service
    .from('consideration_scripts')
    .insert(scriptRows)

  if (insertError) {
    // Rollback consideration
    await service.from('considerations').delete().eq('id', consideration.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // --- Background re-eval for stale scripts (fire-and-forget) ---
  // Find scripts whose latest eval is on an old prompt version and kick off
  // reruns via the existing /api/rerun-evaluation endpoint.
  try {
    const { data: evals } = await service
      .from('script_evaluations')
      .select('submission_id, prompt_version')
      .in('submission_id', verifiedIds)

    const staleIds = (evals || [])
      .filter((e: { submission_id: string; prompt_version: string | null }) =>
        e.prompt_version !== CURRENT_PROMPT_VERSION
      )
      .map((e: { submission_id: string }) => e.submission_id)

    if (staleIds.length > 0) {
      // Forward the user's cookies so the rerun route can authenticate
      const cookie = req.headers.get('cookie') || ''
      const origin = req.nextUrl.origin

      // Fire and forget — don't await
      for (const subId of staleIds) {
        fetch(`${origin}/api/rerun-evaluation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie },
          body: JSON.stringify({ submission_id: subId }),
        }).catch(() => {}) // swallow errors silently
      }
    }
  } catch {
    // Non-critical — don't fail the consideration submission
  }

  // Send submission confirmation email
  try {
    const { data: writerProfile } = await service
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (writerProfile?.email) {
      const firstName = writerProfile.full_name?.split(' ')[0] || 'there'
      await sendEmail({
        templateAlias: 'consideration_submitted',
        to: writerProfile.email,
        variables: { first_name: firstName },
        dedupeKey: `consideration_submitted_${consideration.id}`,
        tag: 'consideration_submitted',
        userId: user.id,
      }, service)
    }
  } catch (emailErr) {
    console.error('[consideration/submit] Email send failed:', emailErr)
  }

  return NextResponse.json({ ok: true, consideration_id: consideration.id })
}
