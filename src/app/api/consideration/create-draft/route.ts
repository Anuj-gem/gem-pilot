// POST /api/consideration/create-draft — create a draft consideration
// pre-populated with the user's unreviewed scripts, then return the ID
// so the client can redirect to /review/c/[id].

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

  const service = svc()

  // Check no active (non-complete) consideration already exists
  const { data: existing } = await service
    .from('considerations')
    .select('id, review_stage')
    .eq('writer_id', user.id)
    .neq('review_stage', 'complete')
    .limit(1)

  if (existing && existing.length > 0) {
    // Already have a draft or in-progress — just return that ID
    return NextResponse.json({ consideration_id: existing[0].id })
  }

  // Find all scripts NOT in any consideration
  const { data: allCons } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
  const conIds = (allCons || []).map((c: { id: string }) => c.id)

  let reviewedScriptIds: Set<string> = new Set()
  if (conIds.length > 0) {
    const { data: conScripts } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .in('consideration_id', conIds)
    for (const r of (conScripts || []) as { script_submission_id: string }[]) {
      reviewedScriptIds.add(r.script_submission_id)
    }
  }

  const { data: completedScripts } = await supabase
    .from('script_submissions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  const unreviewedIds = (completedScripts || [])
    .filter((s: { id: string }) => !reviewedScriptIds.has(s.id))
    .map((s: { id: string }) => s.id)

  if (unreviewedIds.length === 0) {
    return NextResponse.json({ error: 'No unreviewed scripts' }, { status: 400 })
  }

  // Create draft consideration
  const { data: consideration, error: createError } = await service
    .from('considerations')
    .insert({
      writer_id: user.id,
      status: 'pending',
      review_stage: 'draft',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (createError || !consideration) {
    return NextResponse.json({ error: createError?.message || 'Failed to create' }, { status: 500 })
  }

  // Attach unreviewed scripts + carry forward previously reviewed scripts
  const scriptRows = [
    ...unreviewedIds.map(id => ({
      consideration_id: consideration.id,
      script_submission_id: id,
      carried_forward: false,
    })),
    ...[...reviewedScriptIds].map(id => ({
      consideration_id: consideration.id,
      script_submission_id: id,
      carried_forward: true,
    })),
  ]

  const { error: insertError } = await service
    .from('consideration_scripts')
    .insert(scriptRows)

  if (insertError) {
    await service.from('considerations').delete().eq('id', consideration.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ consideration_id: consideration.id })
}
