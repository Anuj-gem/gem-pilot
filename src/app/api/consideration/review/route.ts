// POST /api/consideration/review — producer reviews a consideration.
// Supports: sending feedback, updating review_stage, posting messages.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { sendEmail } from '@/lib/email'

const VALID_STAGES = ['submitted', 'initial_review', 'advanced_review', 'partner_match', 'complete'] as const

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
  const { consideration_id, feedback, next_steps, review_stage, message } = body as {
    consideration_id: string
    feedback?: string
    next_steps?: string | null
    review_stage?: string
    message?: string
  }

  if (!consideration_id) {
    return NextResponse.json({ error: 'Missing consideration_id' }, { status: 400 })
  }

  const service = svc()

  // --- Stage change ---
  if (review_stage && VALID_STAGES.includes(review_stage as typeof VALID_STAGES[number])) {
    const stageUpdate: Record<string, unknown> = { review_stage }
    // If moving to complete, also mark legacy status
    if (review_stage === 'complete') {
      stageUpdate.status = 'reviewed'
      stageUpdate.reviewed_at = new Date().toISOString()
    }
    const { error: stageErr } = await service
      .from('considerations')
      .update(stageUpdate)
      .eq('id', consideration_id)
    if (stageErr) return NextResponse.json({ error: stageErr.message }, { status: 500 })

    // Log status change event
    const stageLabels: Record<string, string> = {
      submitted: 'Portfolio submitted',
      initial_review: 'Initial review started',
      advanced_review: 'Advanced review — reviewing with partners',
      partner_match: 'Partner match identified',
      complete: 'Review complete',
    }
    await service.from('consideration_events').insert({
      consideration_id,
      event_type: 'status_change',
      message: stageLabels[review_stage] || `Status changed to ${review_stage}`,
      new_stage: review_stage,
      created_by: user.id,
    })
  }

  // --- Feedback (overall assessment + next steps) ---
  if (feedback?.trim()) {
    const { error } = await service
      .from('considerations')
      .update({
        status: 'reviewed',
        feedback: feedback.trim(),
        next_steps: next_steps?.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', consideration_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log feedback event
    await service.from('consideration_events').insert({
      consideration_id,
      event_type: 'feedback',
      message: feedback.trim(),
      created_by: user.id,
    })

    // Send feedback notification email
    try {
      const { data: consideration } = await service
        .from('considerations')
        .select('writer_id')
        .eq('id', consideration_id)
        .single()

      if (consideration) {
        const { data: profile } = await service
          .from('profiles')
          .select('full_name, email')
          .eq('id', consideration.writer_id)
          .single()

        if (profile?.email) {
          const firstName = profile.full_name?.split(' ')[0] || 'there'
          await sendEmail({
            templateAlias: 'consideration_feedback',
            to: profile.email,
            variables: {
              first_name: firstName,
              feedback_url: 'https://www.gem.studio/dashboard',
            },
            dedupeKey: `consideration_feedback_${consideration_id}_${Date.now()}`,
            tag: 'consideration_feedback',
          }, service)
        }
      }
    } catch (emailErr) {
      console.error('[consideration/review] Email send failed:', emailErr)
    }
  }

  // --- Standalone message (no feedback, just a note) ---
  if (message?.trim() && !feedback?.trim()) {
    await service.from('consideration_events').insert({
      consideration_id,
      event_type: 'message',
      message: message.trim(),
      created_by: user.id,
    })
  }

  return NextResponse.json({ ok: true })
}
