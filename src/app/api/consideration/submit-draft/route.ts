// POST /api/consideration/submit-draft — flip a draft consideration to pending.
// Called when the writer clicks "Submit for review" on the draft detail page.

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

  const body = await req.json().catch(() => ({}))
  const { consideration_id, selected_script_ids } = body as {
    consideration_id?: string
    selected_script_ids?: string[]
  }

  const service = svc()

  // Find the user's draft consideration
  let targetId = consideration_id
  if (!targetId) {
    const { data: draft } = await service
      .from('considerations')
      .select('id')
      .eq('writer_id', user.id)
      .eq('review_stage', 'draft')
      .limit(1)
      .single()
    if (!draft) return NextResponse.json({ error: 'No draft found' }, { status: 404 })
    targetId = draft.id
  }

  // Verify ownership + draft status
  const { data: con } = await service
    .from('considerations')
    .select('id, writer_id, review_stage')
    .eq('id', targetId)
    .single()

  if (!con || con.writer_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (con.review_stage !== 'draft') {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  // If selected_script_ids provided, remove any scripts NOT in the selection
  if (selected_script_ids && selected_script_ids.length > 0) {
    // Get all currently attached scripts
    const { data: attached } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', targetId)

    const toRemove = (attached || [])
      .map((r: { script_submission_id: string }) => r.script_submission_id)
      .filter(id => !selected_script_ids.includes(id))

    if (toRemove.length > 0) {
      await service
        .from('consideration_scripts')
        .delete()
        .eq('consideration_id', targetId)
        .in('script_submission_id', toRemove)
    }
  }

  // Make sure there's at least one script remaining
  const { count } = await service
    .from('consideration_scripts')
    .select('id', { count: 'exact', head: true })
    .eq('consideration_id', targetId)

  if (!count || count === 0) {
    return NextResponse.json({ error: 'Select at least one script' }, { status: 400 })
  }

  // Flip to pending
  const { error } = await service
    .from('considerations')
    .update({
      review_stage: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', targetId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, consideration_id: targetId })
}
