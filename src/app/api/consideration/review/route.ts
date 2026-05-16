// POST /api/consideration/review — producer reviews a consideration.
// Supports: sending feedback, updating review_stage, posting messages, sentiment + heat.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { sendEmail } from '@/lib/email'

const VALID_STAGES = ['draft', 'pending', 'submitted', 'in_review', 'in_consideration', 'shortlisted', 'partner_match', 'complete'] as const

// Heat points awarded automatically when moving to these stages
const STAGE_HEAT: Record<string, number> = {
  shortlisted: 2,
  partner_match: 3,
}

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
  const { consideration_id, feedback, next_steps, review_stage, message, feedback_tags, next_steps_tags, sentiment } = body as {
    consideration_id: string
    feedback?: string
    next_steps?: string | null
    review_stage?: string
    message?: string
    feedback_tags?: string[]
    next_steps_tags?: string[]
    sentiment?: 'positive' | 'negative'
  }

  if (!consideration_id) {
    return NextResponse.json({ error: 'Missing consideration_id' }, { status: 400 })
  }

  const service = svc()

  // --- Stage change ---
  if (review_stage && VALID_STAGES.includes(review_stage as typeof VALID_STAGES[number])) {
    const stageUpdate: Record<string, unknown> = { review_stage }

    // If moving to complete (pass), also mark legacy status + handle sentiment/heat
    if (review_stage === 'complete') {
      stageUpdate.status = 'reviewed'
      stageUpdate.reviewed_at = new Date().toISOString()

      // Save sentiment if provided
      if (sentiment) {
        stageUpdate.sentiment = sentiment

        // Calculate heat: stage heat (from highest stage reached) + sentiment bonus
        // First, get the current stage to know what stage heat to award
        const { data: currentCon } = await service
          .from('considerations')
          .select('review_stage, writer_id, heat_earned')
          .eq('id', consideration_id)
          .single()

        if (currentCon) {
          const currentStage = currentCon.review_stage || 'pending'
          const stageHeat = STAGE_HEAT[currentStage] || 0
          const sentimentHeat = sentiment === 'positive' ? 1 : 0
          const totalHeat = stageHeat + sentimentHeat

          stageUpdate.heat_earned = totalHeat

          // Update writer's running heat_score
          if (totalHeat > 0) {
            const previousHeat = currentCon.heat_earned || 0
            const heatDelta = totalHeat - previousHeat // In case of re-review, only add the difference
            if (heatDelta > 0) {
              // Update profile-level heat
              await service.rpc('increment_heat_score', {
                p_user_id: currentCon.writer_id,
                p_amount: heatDelta,
              }).then(async (res) => {
                // Fallback if RPC doesn't exist yet — direct update
                if (res.error) {
                  const { data: profile } = await service
                    .from('profiles')
                    .select('heat_score')
                    .eq('id', currentCon.writer_id)
                    .single()
                  await service
                    .from('profiles')
                    .update({ heat_score: (profile?.heat_score || 0) + heatDelta })
                    .eq('id', currentCon.writer_id)
                }
              })

              // Update script-level heat — distribute to all scripts in this consideration
              const { data: csRows } = await service
                .from('consideration_scripts')
                .select('script_id')
                .eq('consideration_id', consideration_id)
              if (csRows && csRows.length > 0) {
                for (const cs of csRows) {
                  const { data: sub } = await service
                    .from('script_submissions')
                    .select('heat_score')
                    .eq('id', cs.script_id)
                    .single()
                  await service
                    .from('script_submissions')
                    .update({ heat_score: ((sub as any)?.heat_score || 0) + heatDelta })
                    .eq('id', cs.script_id)
                }
              }
            }
          }
        }
      }
    }

    const { error: stageErr } = await service
      .from('considerations')
      .update(stageUpdate)
      .eq('id', consideration_id)
    if (stageErr) return NextResponse.json({ error: stageErr.message }, { status: 500 })

    // Log status change event
    const stageLabels: Record<string, string> = {
      draft: 'Portfolio review created',
      pending: 'Portfolio submitted',
      submitted: 'Portfolio submitted',
      in_review: 'Your review has begun',
      in_consideration: 'Your application is in consideration',
      shortlisted: "You've been shortlisted",
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

    // Log heat event if heat was awarded
    if (review_stage === 'complete' && sentiment) {
      const { data: updatedCon } = await service
        .from('considerations')
        .select('heat_earned')
        .eq('id', consideration_id)
        .single()
      if (updatedCon && updatedCon.heat_earned > 0) {
        await service.from('consideration_events').insert({
          consideration_id,
          event_type: 'heat_awarded',
          message: `+${updatedCon.heat_earned} heat earned`,
          created_by: user.id,
        })
      }
    }

    // Send review complete email when stage moves to complete
    if (review_stage === 'complete') {
      try {
        const { data: con } = await service
          .from('considerations')
          .select('writer_id')
          .eq('id', consideration_id)
          .single()

        if (con) {
          const { data: writerProfile } = await service
            .from('profiles')
            .select('full_name, email')
            .eq('id', con.writer_id)
            .single()

          if (writerProfile?.email) {
            const firstName = writerProfile.full_name?.split(' ')[0] || 'there'
            await sendEmail({
              templateAlias: 'consideration_complete',
              to: writerProfile.email,
              variables: {
                first_name: firstName,
                feedback_url: 'https://www.gem.studio/dashboard',
              },
              dedupeKey: `consideration_complete_${consideration_id}`,
              tag: 'consideration_complete',
              userId: con.writer_id,
            }, service)
          }
        }
      } catch (emailErr) {
        console.error('[consideration/review] Complete email failed:', emailErr)
      }
    }
  }

  // --- Next steps (set independently, typically on complete) ---
  if (next_steps !== undefined && !feedback?.trim()) {
    await service
      .from('considerations')
      .update({ next_steps: next_steps?.trim() || null })
      .eq('id', consideration_id)
  }

  // --- Tags (can be set independently of feedback text) ---
  if (feedback_tags || next_steps_tags) {
    const tagUpdate: Record<string, unknown> = {}
    if (feedback_tags) tagUpdate.feedback_tags = feedback_tags
    if (next_steps_tags) tagUpdate.next_steps_tags = next_steps_tags
    await service
      .from('considerations')
      .update(tagUpdate)
      .eq('id', consideration_id)
  }

  // --- Feedback (does NOT change status — status is controlled by stage selector) ---
  if (feedback?.trim()) {
    // Append latest feedback to the consideration record
    const updateFields: Record<string, unknown> = {
      feedback: feedback.trim(),
    }
    if (next_steps !== undefined) {
      updateFields.next_steps = next_steps?.trim() || null
    }
    if (feedback_tags) updateFields.feedback_tags = feedback_tags
    if (next_steps_tags) updateFields.next_steps_tags = next_steps_tags
    const { error } = await service
      .from('considerations')
      .update(updateFields)
      .eq('id', consideration_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log feedback event
    await service.from('consideration_events').insert({
      consideration_id,
      event_type: 'feedback',
      message: feedback.trim(),
      created_by: user.id,
    })
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
