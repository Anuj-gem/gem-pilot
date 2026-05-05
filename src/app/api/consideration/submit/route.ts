// POST /api/consideration/submit — writer submits scripts for consideration.

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

  // Verify scripts belong to this user
  const { data: userScripts } = await supabase
    .from('script_submissions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .in('id', script_ids)

  const validIds = new Set((userScripts || []).map((s: { id: string }) => s.id))
  const verifiedIds = script_ids.filter(id => validIds.has(id))

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

  return NextResponse.json({ ok: true, consideration_id: consideration.id })
}
