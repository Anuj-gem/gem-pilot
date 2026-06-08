// POST /api/consideration/review — investor reviews a consideration.
// Supports: backing decision (pass/following/attached), conditions, amounts, notes.
// Also supports draft saves (tags/note without completing).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { sendEmail } from '@/lib/email'

const VALID_BACKING = ['pass', 'following', 'attached'] as const

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
  const {
    consideration_id,
    backing_status,
    backing_amount,
    backing_conditions,
    backing_note,
    feedback_tags,
    next_steps_tags,
    feedback,
  } = body as {
    consideration_id: string
    backing_status?: 'pass' | 'following' | 'attached'
    backing_amount?: number
    backing_conditions?: string[]
    backing_note?: string
    feedback_tags?: string[]
    next_steps_tags?: string[]
    feedback?: string
  }

  if (!consideration_id) {
    return NextResponse.json({ error: 'Missing consideration_id' }, { status: 400 })
  }

  const service = svc()

  // Authorization: must be admin OR owner of the opportunity this consideration belongs to
  const ADMIN_EMAILS = ['anuj@gem.studio', 'anujkommareddy@gmail.com']
  const isAdmin = ADMIN_EMAILS.includes(user.email || '')

  if (!isAdmin) {
    const { data: con } = await service
      .from('considerations')
      .select('opportunity_id')
      .eq('id', consideration_id)
      .single()
    if (!con?.opportunity_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { data: opp } = await service
      .from('opportunities')
      .select('owner_id')
      .eq('id', con.opportunity_id)
      .single()
    if (!opp || opp.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  // ─── Backing decision (completes the review) ───
  if (backing_status && VALID_BACKING.includes(backing_status as typeof VALID_BACKING[number])) {
    const update: Record<string, unknown> = {
      backing_status,
      backing_amount: backing_amount || 0,
      backing_conditions: backing_conditions || [],
      backing_note: backing_note?.trim() || null,
      review_stage: 'complete',
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
    }
    if (feedback_tags) update.feedback_tags = feedback_tags
    if (next_steps_tags) update.next_steps_tags = next_steps_tags
    if (feedback?.trim()) update.feedback = feedback.trim()

    const { error: updateErr } = await service
      .from('considerations')
      .update(update)
      .eq('id', consideration_id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Log event
    const labels: Record<string, string> = {
      pass: 'Review complete — passed',
      following: 'Review complete — following',
      attached: 'Review complete — attached as backer',
    }
    await service.from('consideration_events').insert({
      consideration_id,
      event_type: 'status_change',
      message: labels[backing_status] || 'Review complete',
      new_stage: 'complete',
      created_by: user.id,
    })

    // Log backing event for following/attached
    if (backing_status !== 'pass' && (backing_amount || 0) > 0) {
      const amtStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(backing_amount || 0)
      await service.from('consideration_events').insert({
        consideration_id,
        event_type: 'backing',
        message: `${backing_status === 'attached' ? 'Backed' : 'Following'} — ${amtStr}`,
        created_by: user.id,
      })
    }

    // ─── Aggregate backing totals to script_submissions ───
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

    // ─── Send review complete email ───
    try {
      const { data: con } = await service
        .from('considerations')
        .select('writer_id, opportunity_id')
        .eq('id', consideration_id)
        .single()

      if (con) {
        const { data: writerProfile } = await service
          .from('profiles')
          .select('full_name, email')
          .eq('id', con.writer_id)
          .single()

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

        let scriptTitle = 'your script'
        const { data: csRows2 } = await service
          .from('consideration_scripts')
          .select('script_submission_id')
          .eq('consideration_id', consideration_id)
          .limit(1)
        if (csRows2 && csRows2.length > 0) {
          const { data: script } = await service
            .from('script_submissions')
            .select('title')
            .eq('id', csRows2[0].script_submission_id)
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
            userId: con.writer_id,
          }, service)
        }
      }
    } catch (emailErr) {
      console.error('[consideration/review] Complete email failed:', emailErr)
    }

    return NextResponse.json({ ok: true })
  }

  // ─── Draft save (tags/note/amount without completing) ───
  const draftUpdate: Record<string, unknown> = {}
  if (feedback_tags) draftUpdate.feedback_tags = feedback_tags
  if (next_steps_tags) draftUpdate.next_steps_tags = next_steps_tags
  if (feedback?.trim()) draftUpdate.feedback = feedback.trim()
  if (backing_note !== undefined) draftUpdate.backing_note = backing_note?.trim() || null
  if (backing_amount !== undefined) draftUpdate.backing_amount = backing_amount || 0
  if (backing_conditions) draftUpdate.backing_conditions = backing_conditions

  if (Object.keys(draftUpdate).length > 0) {
    const { error } = await service
      .from('considerations')
      .update(draftUpdate)
      .eq('id', consideration_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
