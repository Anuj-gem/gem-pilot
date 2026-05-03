// POST /api/opportunities/review — producer updates a submission's status + feedback.
// opportunities-v1.

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
  const { submission_id, status, feedback } = body as {
    submission_id: string
    status: 'pending' | 'request' | 'consider' | 'pass'
    feedback?: string
  }

  if (!submission_id || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!['pending', 'request', 'consider', 'pass'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const service = svc()

  // Verify the user owns the opportunity this submission belongs to
  const { data: sub } = await service
    .from('opportunity_submissions')
    .select('id, opportunity_id')
    .eq('id', submission_id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: opp } = await service
    .from('opportunities')
    .select('owner_id')
    .eq('id', sub.opportunity_id)
    .single()

  if (!opp || opp.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update the submission
  const { error } = await service
    .from('opportunity_submissions')
    .update({
      status,
      feedback: feedback ?? null,
      reviewed_at: status !== 'pending' ? new Date().toISOString() : null,
    })
    .eq('id', submission_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
