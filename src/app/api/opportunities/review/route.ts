// POST /api/opportunities/review — producer updates a submission's status + feedback.
// opportunities-v2: structured outcomes (pass/developing/advancing).
// Note: revise_resubmit kept in VALID_OUTCOMES for backward compat with existing DB rows.

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

const VALID_OUTCOMES = ['pass', 'developing', 'revise_resubmit', 'advancing'] as const
type Outcome = typeof VALID_OUTCOMES[number]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { submission_id, status, feedback, outcome, next_steps_text } = body as {
    submission_id: string
    status: 'pending' | 'reviewed'
    feedback?: string
    outcome?: Outcome | null
    next_steps_text?: string | null
  }

  if (!submission_id || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!['pending', 'reviewed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  // Closing comment + outcome are required when marking as reviewed
  if (status === 'reviewed' && !feedback?.trim()) {
    return NextResponse.json({ error: 'Closing comment is required' }, { status: 400 })
  }
  if (status === 'reviewed' && (!outcome || !VALID_OUTCOMES.includes(outcome))) {
    return NextResponse.json({ error: 'Outcome is required' }, { status: 400 })
  }

  const service = svc()

  // Verify the user owns the opportunity this submission belongs to
  const { data: sub } = await service
    .from('opportunity_submissions')
    .select('id, opportunity_id, submission_id, writer_id')
    .eq('id', submission_id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: opp } = await service
    .from('opportunities')
    .select('owner_id, title')
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
      outcome: outcome ?? null,
      next_steps: next_steps_text ?? (outcome === 'developing' ? 'new_concept'
        : outcome === 'advancing' ? 'in_touch'
        : null),
      reviewed_at: status !== 'pending' ? new Date().toISOString() : null,
    })
    .eq('id', submission_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Grant bonus submission when outcome is developing (keep developing)
  if (status === 'reviewed' && outcome === 'developing' && sub.writer_id) {
    try {
      await service.rpc('increment_bonus_submissions', { user_id_input: sub.writer_id })
    } catch (err: unknown) {
      console.error('[review] bonus_submissions increment failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
