// POST /api/partner/triage — producer triages an application (pass/watchlist/meet/follow).
// Pass and follow complete the review. Meet shortlists. Watchlist is passive.

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
  const { consideration_id, action, feedback_tags, feedback, heat_override, backing_conditions } = body as {
    consideration_id: string
    action: 'pass' | 'watchlist' | 'meet' | 'follow'
    feedback_tags?: string[]
    feedback?: string
    heat_override?: number
    backing_conditions?: string[]
  }

  if (!consideration_id || !action) {
    return NextResponse.json({ error: 'Missing consideration_id or action' }, { status: 400 })
  }

  if (!['pass', 'watchlist', 'meet', 'follow'].includes(action)) {
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

    // Save tags directly to feedback_tags
    if (feedback_tags?.length) {
      updateData.triage_feedback_tags = feedback_tags
      updateData.feedback_tags = feedback_tags
    }
    if (feedback) updateData.feedback = feedback
  }

  if (action === 'meet') {
    updateData.review_stage = 'shortlisted'
  }

  if (action === 'follow') {
    // Follow = interested but not ready. Completes the review with backing_status='following'.
    updateData.review_stage = 'complete'
    updateData.status = 'reviewed'
    updateData.reviewed_at = new Date().toISOString()
    updateData.backing_status = 'following'
    updateData.backing_conditions = backing_conditions || []

    // Save tags directly to feedback_tags
    if (feedback_tags?.length) {
      updateData.triage_feedback_tags = feedback_tags
      updateData.feedback_tags = feedback_tags
    }
    if (feedback) updateData.feedback = feedback
  }

  await service
    .from('considerations')
    .update(updateData)
    .eq('id', consideration_id)

  // --- Pass/Follow: propagate heat to profile + scripts, send email ---
  if (action === 'pass' || action === 'follow') {
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
        await sendEmail({
          templateAlias: 'consideration_complete' as const,
          to: writerProfile.email,
          variables: {
            script_title: scriptTitle,
            opportunity_title: opportunityTitle,
            opportunity_genres: opportunityGenres,
            opportunity_type: opportunityType,
            opportunity_badge_bg: opportunityBadgeBg,
            opportunity_badge_color: opportunityBadgeColor,
            feedback_url: feedbackUrl,
          },
          dedupeKey: `consideration_complete_${consideration_id}`,
          tag: 'consideration_complete',
          userId: consideration.writer_id,
        }, service)
      }
    } catch (emailErr) {
      console.error('[partner/triage] Pass/follow email failed:', emailErr)
    }
  }

  // --- Follow: aggregate backing totals to script_submissions ---
  if (action === 'follow') {
    const { data: csRows } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', consideration_id)

    if (csRows && csRows.length > 0) {
      for (const cs of csRows) {
        const { data: allLinks } = await service
          .from('consideration_scripts')
          .select('consideration_id')
          .eq('script_submission_id', cs.script_submission_id)

        if (allLinks) {
          const conIds = allLinks.map(l => l.consideration_id)
          const { data: allCons } = await service
            .from('considerations')
            .select('backing_status, backing_amount')
            .in('id', conIds)
            .eq('review_stage', 'complete')
            .not('backing_status', 'is', null)

          if (allCons) {
            const attached = allCons.filter(c => c.backing_status === 'attached')
            const following = allCons.filter(c => c.backing_status === 'following')
            await service
              .from('script_submissions')
              .update({
                total_backing: attached.reduce((s, c) => s + (Number(c.backing_amount) || 0), 0),
                backer_count: attached.length,
                total_following: following.reduce((s, c) => s + (Number(c.backing_amount) || 0), 0),
                follower_count: following.length,
              })
              .eq('id', cs.script_submission_id)
          }
        }
      }
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
