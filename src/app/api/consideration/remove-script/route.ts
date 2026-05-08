// POST /api/consideration/remove-script — remove a script from a draft consideration.
// Only works when the consideration is in draft stage.

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
  const { consideration_id, script_id } = body as { consideration_id: string; script_id: string }

  if (!consideration_id || !script_id) {
    return NextResponse.json({ error: 'Missing consideration_id or script_id' }, { status: 400 })
  }

  const service = svc()

  // Verify ownership + draft status
  const { data: con } = await service
    .from('considerations')
    .select('id, writer_id, review_stage')
    .eq('id', consideration_id)
    .single()

  if (!con || con.writer_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (con.review_stage !== 'draft') {
    return NextResponse.json({ error: 'Cannot modify — review already submitted' }, { status: 409 })
  }

  // Remove the script
  const { error } = await service
    .from('consideration_scripts')
    .delete()
    .eq('consideration_id', consideration_id)
    .eq('script_submission_id', script_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
