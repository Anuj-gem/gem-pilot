// /review — Portfolio review hub.
// Shows: profile, active review status tracker, scripts in review, past reviews.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ReviewHub } from '@/components/review/review-hub'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/review')

  const service = svc()

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, handle, headline, bio, avatar_url, subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active'

  // All considerations
  const { data: rawConsiderations } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, next_steps')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  type Consideration = {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null; next_steps: string | null
  }
  const considerations = (rawConsiderations || []) as Consideration[]

  const active = considerations.find(c => c.review_stage !== 'complete')
  const pastReviews = considerations.filter(c => c.review_stage === 'complete')

  // Scripts for active consideration
  let activeScriptIds: string[] = []
  if (active) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', active.id)
    activeScriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)
  }

  // All user scripts (completed, not hidden)
  type SubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; tags: string[] | null
  }
  const { data: rawSubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at, tags')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const allSubs = ((rawSubs || []) as SubRow[]).filter(s => !s.hidden_at && s.status === 'completed')

  // Evaluations: score, headline, eval ID (for report link)
  const subIds = allSubs.map(s => s.id)
  type EvalData = {
    id: string; submission_id: string; weighted_score: number | null
    edited_fields: { logline?: string } | null
    evaluation: { positioning_hook?: string } | null
  }
  const evalMap = new Map<string, EvalData>()
  if (subIds.length > 0) {
    const { data: evals } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, edited_fields, evaluation')
      .in('submission_id', subIds)
    for (const e of (evals || []) as EvalData[]) {
      evalMap.set(e.submission_id, e)
    }
  }

  // Events for active consideration
  type EventRow = { id: string; event_type: string; message: string | null; new_stage: string | null; created_at: string }
  let activeEvents: EventRow[] = []
  if (active) {
    const { data: evts } = await service
      .from('consideration_events')
      .select('id, event_type, message, new_stage, created_at')
      .eq('consideration_id', active.id)
      .order('created_at', { ascending: false })
    activeEvents = (evts || []) as EventRow[]
  }

  // Events + script counts for past reviews
  type PastReviewData = {
    id: string; review_stage: string; submitted_at: string; reviewed_at: string | null
    feedback: string | null; next_steps: string | null; scriptCount: number
    events: EventRow[]
  }
  const pastReviewData: PastReviewData[] = []
  for (const pr of pastReviews) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', pr.id)
    const scriptCount = (cs || []).length

    const { data: evts } = await service
      .from('consideration_events')
      .select('id, event_type, message, new_stage, created_at')
      .eq('consideration_id', pr.id)
      .order('created_at', { ascending: false })

    pastReviewData.push({
      id: pr.id,
      review_stage: pr.review_stage,
      submitted_at: pr.submitted_at,
      reviewed_at: pr.reviewed_at,
      feedback: pr.feedback,
      next_steps: pr.next_steps,
      scriptCount,
      events: (evts || []) as EventRow[],
    })
  }

  const scripts = allSubs.map(s => {
    const ev = evalMap.get(s.id)
    const evalObj = ev?.evaluation as Record<string, unknown> | null
    const headline: string | null = ev?.edited_fields?.logline
      || (evalObj?.positioning_hook as string | undefined)
      || null
    return {
      id: s.id,
      title: s.title,
      format: s.declared_format,
      score: ev?.weighted_score ?? null,
      evaluationId: ev?.id ?? null,
      headline,
      tags: s.tags || [],
      createdAt: s.created_at,
      inReview: activeScriptIds.includes(s.id),
    }
  })

  const profileData = {
    fullName: profile?.full_name || null,
    handle: profile?.handle || null,
    bio: profile?.bio || null,
    avatarUrl: profile?.avatar_url || null,
    headline: profile?.headline || null,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <ReviewHub
        profile={profileData}
        isPro={isPro}
        scripts={scripts}
        activeReview={active ? {
          id: active.id,
          reviewStage: active.review_stage,
          submittedAt: active.submitted_at,
          feedback: active.feedback,
          nextSteps: active.next_steps,
          events: activeEvents,
        } : null}
        pastReviews={pastReviewData}
        totalReviewCount={considerations.length}
      />
    </div>
  )
}
