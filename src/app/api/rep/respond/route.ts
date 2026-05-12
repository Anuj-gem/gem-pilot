// POST /api/rep/respond — rep responds to a writer assignment (interested or pass).

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
  const { assignment_id, status, rep_note, pass_tags } = body as {
    assignment_id: string
    status: 'interested' | 'passed'
    rep_note?: string | null
    pass_tags?: string[] | null
  }

  if (!assignment_id || !['interested', 'passed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = svc()

  // Verify this assignment belongs to the current user
  const { data: assignment } = await service
    .from('rep_assignments')
    .select('id, rep_id, status')
    .eq('id', assignment_id)
    .single()

  if (!assignment || assignment.rep_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Update the assignment
  const update: Record<string, unknown> = {
    status,
    rep_note: rep_note || null,
    responded_at: new Date().toISOString(),
  }
  if (status === 'passed' && pass_tags) {
    update.pass_tags = pass_tags
  }

  const { error } = await service
    .from('rep_assignments')
    .update(update)
    .eq('id', assignment_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
