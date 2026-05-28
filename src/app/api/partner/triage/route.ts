// POST /api/partner/triage — producer triages an application (pass/watchlist/meet).
// Does NOT change existing review_stage or status. Purely additive.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { sendEmail } from '@/lib/email'

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
  const { consideration_id, action, feedback_tags } = body as {
    consideration_id: string
    action: 'pass' | 'watchlist' | 'meet'
    feedback_tags?: string[]
  }

  if (!consideration_id || !action) {
    return NextResponse.json({ error: 'Missing consideration_id or action' }, { status: 400 })
  }

  if (!['pass', 'watchlist', 'meet'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const service = svc()

  // Verify the consideration exists and belongs to an opportunity this producer owns
  const { data: consideration } = await service
    .from('considerations')
    .select('id, opportunity_id, writer_id')
    .eq('id', consideration_id)
    .single()

  if (!consideration) {
    return NextResponse.json({ error: 'Consideration not found' }, { status: 404 })
  }

  const { data: opp } = await service
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', consideration.opportunity_id)
    .single()

  if (!opp || opp.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Update the consideration with triage status + writer-visible fields
  const updateData: Record<string, unknown> = {
    triage_status: action,
    triaged_at: new Date().toISOString(),
  }

  if (action === 'pass') {
    // Mark as reviewed so writer side sees it
    updateData.review_stage = 'complete'
    updateData.status = 'reviewed'
    updateData.reviewed_at = new Date().toISOString()

    // Split tags: +Tag → feedback_tags (positive), -Tag → next_steps_tags (reasons)
    if (feedback_tags?.length) {
      updateData.triage_feedback_tags = feedback_tags
      const positive = feedback_tags.filter(t => t.startsWith('+')).map(t => t.slice(1))
      const negative = feedback_tags.filter(t => t.startsWith('-')).map(t => t.slice(1))
      if (positive.length > 0) updateData.feedback_tags = positive
      if (negative.length > 0) updateData.next_steps_tags = negative

      // Heat: +1 per positive signal tag
      if (positive.length > 0) {
        updateData.heat_earned = positive.length
      }
    }
  }

  if (action === 'meet') {
    updateData.review_stage = 'shortlisted'
  }

  await service
    .from('considerations')
    .update(updateData)
    .eq('id', consideration_id)

  // --- Pass: propagate heat to profile + scripts, send email ---
  if (action === 'pass') {
    const heatEarned = (updateData.heat_earned as number) || 0

    // Propagate heat to writer profile + scripts
    if (heatEarned > 0) {
      // Profile heat
      await service.rpc('increment_heat_score', {
        p_user_id: consideration.writer_id,
        p_amount: heatEarned,
      }).then(async (res) => {
        if (res.error) {
          const { data: profile } = await service
            .from('profiles')
            .select('heat_score')
            .eq('id', consideration.writer_id)
            .single()
          await service
            .from('profiles')
            .update({ heat_score: (profile?.heat_score || 0) + heatEarned })
            .eq('id', consideration.writer_id)
        }
      })

      // Script-level heat
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
            .update({ heat_score: ((sub as any)?.heat_score || 0) + heatEarned })
            .eq('id', cs.script_submission_id)
        }
      }
    }

    // Send review complete email
    try {
      const { data: writerProfile } = await service
        .from('profiles')
        .select('full_name, email, heat_score')
        .eq('id', consideration.writer_id)
        .single()

      // Get opportunity details
      let opportunityTitle = 'an opportunity'
      let opportunityGenres = ''
      let opportunityType = 'Paid'
      let opportunityBadgeBg = '#DCFCE7'
      let opportunityBadgeColor = '#166534'
      if (consideration.opportunity_id) {
        const { data: oppDetail } = await service
          .from('opportunities')
          .select('title, genres, deal_type')
          .eq('id', consideration.opportunity_id)
          .single()
        if (oppDetail) {
          opportunityTitle = oppDetail.title || opportunityTitle
          opportunityGenres = Array.isArray(oppDetail.genres) ? oppDetail.genres.join(', ') : (oppDetail.genres || '')
          opportunityType = oppDetail.deal_type === 'unpaid' ? 'Unpaid' : 'Paid'
          opportunityBadgeBg = oppDetail.deal_type === 'unpaid' ? '#FEF3C7' : '#DCFCE7'
          opportunityBadgeColor = oppDetail.deal_type === 'unpaid' ? '#92400E' : '#166534'
        }
      }

      // Get script title
      let scriptTitle = 'your script'
      const { data: csForEmail } = await service
        .from('consideration_scripts')
        .select('script_submission_id')
        .eq('consideration_id', consideration_id)
        .limit(1)
      if (csForEmail && csForEmail.length > 0) {
        const { data: script } = await service
          .from('script_submissions')
          .select('title')
          .eq('id', csForEmail[0].script_submission_id)
          .single()
        if (script?.title) scriptTitle = script.title
      }

      const feedbackUrl = `https://www.gem.studio/applications/${consideration_id}`

      if (writerProfile?.email) {
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
          userId: consideration.writer_id,
        }, service)
      }
    } catch (emailErr) {
      console.error('[partner/triage] Pass email failed:', emailErr)
    }
  }

  // If watchlisting, also add to writer_watchlist (upsert — ignore if already watching)
  if (action === 'watchlist') {
    await service
      .from('writer_watchlist')
      .upsert({
        producer_id: user.id,
        writer_id: consideration.writer_id,
        consideration_id,
      }, { onConflict: 'producer_id,writer_id' })
  }

  // If un-watchlisting (e.g. passing after watchlist), remove from watchlist
  if (action === 'pass') {
    await service
      .from('writer_watchlist')
      .delete()
      .eq('producer_id', user.id)
      .eq('writer_id', consideration.writer_id)
  }

  return NextResponse.json({ ok: true, triage_status: action })
}
