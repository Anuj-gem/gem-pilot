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
  const { consideration_id, feedback, next_steps, review_stage, message, feedback_tags, next_steps_tags, sentiment, reviewer_strengths, reviewer_concerns } = body as {
    consideration_id: string
    feedback?: string
    next_steps?: string | null
    review_stage?: string
    message?: string
    feedback_tags?: string[]
    next_steps_tags?: string[]
    sentiment?: 'positive' | 'negative'
    reviewer_strengths?: string | null
    reviewer_concerns?: string | null
  }

  if (!consideration_id) {
    return NextResponse.json({ error: 'Missing consideration_id' }, { status: 400 })
  }

  const service = svc()

  // --- Stage change ---
  if (review_stage && VALID_STAGES.includes(review_stage as typeof VALID_STAGES[number])) {
    // Server-side validation: shortlisted/partner_match requires at least one positive tag
    if ((review_stage === 'shortlisted' || review_stage === 'partner_match') && (!feedback_tags || feedback_tags.length === 0)) {
      return NextResponse.json({ error: 'At least one positive tag required for shortlisting' }, { status: 400 })
    }

    const stageUpdate: Record<string, unknown> = { review_stage }

    // If moving to complete, mark legacy status + calculate heat from positive tags
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
          const positiveTags = feedback_tags || []
          const positiveTagHeat = positiveTags.length > 0 ? 1 : 0
          const totalHeat = stageHeat + positiveTagHeat

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
                .select('script_submission_id')
                .eq('consideration_id', consideration_id)
              if (csRows && csRows.length > 0) {
                for (const cs of csRows) {
                  const { data: sub } = await service
                    .from('script_submissions')
                    .select('heat_score')
                    .eq('id', cs.script_submission_id)
                    .single()
                  await service
                    .from('script_submissions')
                    .update({ heat_score: ((sub as any)?.heat_score || 0) + heatDelta })
                    .eq('id', cs.script_submission_id)
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
          .select('writer_id, heat_earned, opportunity_id')
          .eq('id', consideration_id)
          .single()

        if (con) {
          const { data: writerProfile } = await service
            .from('profiles')
            .select('full_name, email, heat_score')
            .eq('id', con.writer_id)
            .single()

          // Get opportunity details
          let opportunityTitle = 'an opportunity'
          let opportunityGenres = ''
          let opportunityType = 'Paid'
          let opportunityBadgeBg = '#DCFCE7'
          let opportunityBadgeColor = '#166534'
          if (con.opportunity_id) {
            const { data: opp } = await service
              .from('opportunities')
              .select('title, genres, deal_type')
              .eq('id', con.opportunity_id)
              .single()
            if (opp) {
              opportunityTitle = opp.title || opportunityTitle
              opportunityGenres = Array.isArray(opp.genres) ? opp.genres.join(', ') : (opp.genres || '')
              opportunityType = opp.deal_type === 'unpaid' ? 'Unpaid' : 'Paid'
              opportunityBadgeBg = opp.deal_type === 'unpaid' ? '#FEF3C7' : '#DCFCE7'
              opportunityBadgeColor = opp.deal_type === 'unpaid' ? '#92400E' : '#166534'
            }
          }

          // Get script title from consideration_scripts
          let scriptTitle = 'your script'
          const { data: csRows } = await service
            .from('consideration_scripts')
            .select('script_submission_id')
            .eq('consideration_id', consideration_id)
            .limit(1)
          if (csRows && csRows.length > 0) {
            const { data: script } = await service
              .from('script_submissions')
              .select('title')
              .eq('id', csRows[0].script_submission_id)
              .single()
            if (script?.title) scriptTitle = script.title
          }

          // Build feedback URL for this consideration
          const feedbackUrl = `https://www.gem.studio/applications/${consideration_id}`

          if (writerProfile?.email) {
            const heatEarned = con.heat_earned || 0
            const emailAlias = heatEarned > 0
              ? 'consideration_complete' as const
              : 'consideration_complete_no_heat' as const

            await sendEmail({
              templateAlias: emailAlias,
              to: writerProfile.email,
              variables: {
                script_title: scriptTitle,
                opportunity_title: opportunityTitle,
                opportunity_genres: opportunityGenres,
                opportunity_type: opportunityType,
                opportunity_badge_bg: opportunityBadgeBg,
                opportunity_badge_color: opportunityBadgeColor,
                ...(heatEarned > 0 ? {
                  heat_earned: String(heatEarned),
                  total_heat: String(writerProfile.heat_score || 0),
                } : {}),
                feedback_url: feedbackUrl,
              },
              dedupeKey: `consideration_complete_${consideration_id}`,
              tag: emailAlias,
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

  // --- Reviewer notes (strengths / concerns — internal, not shown to writer) ---
  if (reviewer_strengths !== undefined || reviewer_concerns !== undefined) {
    const notesUpdate: Record<string, unknown> = {}
    if (reviewer_strengths !== undefined) notesUpdate.reviewer_strengths = reviewer_strengths?.trim() || null
    if (reviewer_concerns !== undefined) notesUpdate.reviewer_concerns = reviewer_concerns?.trim() || null
    await service
      .from('considerations')
      .update(notesUpdate)
      .eq('id', consideration_id)
  }

  return NextResponse.json({ ok: true })
}
