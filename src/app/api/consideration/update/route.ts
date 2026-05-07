// PATCH /api/consideration/update — update scripts on a pending consideration.
// Only works while the consideration is still pending (not yet reviewed).

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

export async function PATCH(req: NextRequest) {
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

  // Find the active pending consideration
  const { data: active } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (!active) {
    return NextResponse.json({ error: 'No pending consideration to edit' }, { status: 404 })
  }

  // Verify scripts belong to this user and are completed
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

  // Delete old consideration_scripts
  const { error: deleteError } = await service
    .from('consideration_scripts')
    .delete()
    .eq('consideration_id', active.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Insert new ones
  const carriedSet = new Set(carried_ids || [])
  const scriptRows = verifiedIds.map(scriptId => ({
    consideration_id: active.id,
    script_submission_id: scriptId,
    carried_forward: carriedSet.has(scriptId),
  }))

  const { error: insertError } = await service
    .from('consideration_scripts')
    .insert(scriptRows)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, consideration_id: active.id })
}
