// /partner — producer dashboard (consideration model).
// Shows writers who have scripts in consideration, expandable to show
// their portfolio + feedback form.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/nav'
import { PartnerConsiderationList } from '@/components/producer/partner-consideration-list'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function PartnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/partner')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, account_type, lane')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') redirect('/dashboard')
  if (!profile?.lane) redirect('/onboarding/producer')

  const service = svc()

  // Get all considerations (pending first, then reviewed)
  const { data: allConsiderations } = await service
    .from('considerations')
    .select('id, writer_id, status, review_stage, submitted_at, reviewed_at, feedback, outcome, next_steps, ai_feedback, ai_next_steps')
    .neq('review_stage', 'draft')
    .order('submitted_at', { ascending: true })

  const considerations = (allConsiderations || []) as {
    id: string; writer_id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null; outcome: string | null; next_steps: string | null
    ai_feedback: string | null; ai_next_steps: string | null
  }[]

  // Get writer profiles (including subscription status)
  const writerIds = [...new Set(considerations.map(c => c.writer_id))]
  const writerMap = new Map<string, { name: string; handle: string | null; isPro: boolean }>()
  if (writerIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, handle, subscription_status')
      .in('id', writerIds)
    for (const p of (profiles || []) as { id: string; full_name: string | null; handle: string | null; subscription_status: string | null }[]) {
      writerMap.set(p.id, {
        name: p.full_name || 'Unknown',
        handle: p.handle,
        isPro: p.subscription_status === 'active',
      })
    }
  }

  // Compute review number per writer (chronological order)
  // Group all non-draft considerations by writer_id, sorted by submitted_at
  const allByWriter = new Map<string, { id: string; submitted_at: string; review_stage: string; feedback: string | null; next_steps: string | null }[]>()
  for (const c of considerations) {
    if (!allByWriter.has(c.writer_id)) allByWriter.set(c.writer_id, [])
    allByWriter.get(c.writer_id)!.push({ id: c.id, submitted_at: c.submitted_at, review_stage: c.review_stage, feedback: c.feedback, next_steps: c.next_steps })
  }
  // Sort each writer's considerations chronologically
  for (const arr of allByWriter.values()) {
    arr.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
  }

  // Build reviewNumber map and pastReviews map
  const reviewNumberMap = new Map<string, number>()
  const pastReviewsMap = new Map<string, { id: string; submittedAt: string; feedback: string | null; nextSteps: string | null }[]>()
  for (const [, arr] of allByWriter) {
    for (let i = 0; i < arr.length; i++) {
      reviewNumberMap.set(arr[i].id, i + 1)
      // Past reviews = all completed reviews before this one
      const past = arr.slice(0, i).filter(r => r.review_stage === 'complete').map(r => ({
        id: r.id, submittedAt: r.submitted_at, feedback: r.feedback, nextSteps: r.next_steps,
      }))
      pastReviewsMap.set(arr[i].id, past)
    }
  }

  // Get scripts for each consideration
  const considerationIds = considerations.map(c => c.id)
  type ConsiderationScript = { consideration_id: string; title: string; score: number | null; evaluationId: string | null; format: string | null }
  const scriptsByConsideration = new Map<string, ConsiderationScript[]>()

  if (considerationIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', considerationIds)

    const scriptIds = [...new Set((cs || []).map((r: { script_submission_id: string }) => r.script_submission_id))]

    if (scriptIds.length > 0) {
      const { data: subs } = await service
        .from('script_submissions')
        .select('id, title, declared_format')
        .in('id', scriptIds)
      const subMap = new Map<string, { title: string; format: string | null }>()
      for (const s of (subs || []) as { id: string; title: string; declared_format: string | null }[]) {
        subMap.set(s.id, { title: s.title, format: s.declared_format })
      }

      const { data: evals } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score')
        .in('submission_id', scriptIds)
      const evalMap = new Map<string, { id: string; score: number | null }>()
      for (const e of (evals || []) as { id: string; submission_id: string; weighted_score: number | null }[]) {
        evalMap.set(e.submission_id, { id: e.id, score: e.weighted_score })
      }

      for (const row of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
        if (!scriptsByConsideration.has(row.consideration_id)) {
          scriptsByConsideration.set(row.consideration_id, [])
        }
        const sub = subMap.get(row.script_submission_id)
        const ev = evalMap.get(row.script_submission_id)
        if (sub) {
          scriptsByConsideration.get(row.consideration_id)!.push({
            consideration_id: row.consideration_id,
            title: sub.title,
            score: ev?.score ?? null,
            evaluationId: ev?.id ?? null,
            format: sub.format,
          })
        }
      }
    }
  }

  // Get events for all considerations
  type EventRow = { id: string; consideration_id: string; event_type: string; message: string | null; new_stage: string | null; created_at: string }
  const eventsByConsideration = new Map<string, EventRow[]>()
  if (considerationIds.length > 0) {
    const { data: allEvents } = await service
      .from('consideration_events')
      .select('id, consideration_id, event_type, message, new_stage, created_at')
      .in('consideration_id', considerationIds)
      .order('created_at', { ascending: false })
    for (const ev of (allEvents || []) as EventRow[]) {
      if (!eventsByConsideration.has(ev.consideration_id)) {
        eventsByConsideration.set(ev.consideration_id, [])
      }
      eventsByConsideration.get(ev.consideration_id)!.push(ev)
    }
  }

  // Build serializable items for the client component
  const items = considerations.map(c => {
    const writer = writerMap.get(c.writer_id)
    const scripts = scriptsByConsideration.get(c.id) ?? []
    const avgScore = scripts.length > 0
      ? scripts.reduce((sum, s) => sum + (s.score ?? 0), 0) / scripts.filter(s => s.score != null).length
      : null
    return {
      id: c.id,
      writerId: c.writer_id,
      writerName: writer?.name ?? 'Unknown',
      writerHandle: writer?.handle ?? null,
      isPro: writer?.isPro ?? false,
      submittedAt: c.submitted_at,
      scripts,
      status: c.status,
      reviewStage: c.review_stage,
      feedback: c.feedback,
      nextSteps: c.next_steps,
      aiFeedback: c.ai_feedback,
      aiNextSteps: c.ai_next_steps,
      events: eventsByConsideration.get(c.id) ?? [],
      reviewNumber: reviewNumberMap.get(c.id) ?? 1,
      pastReviews: pastReviewsMap.get(c.id) ?? [],
      avgScore,
    }
  })

  return (
    <>
      <Nav />
      <PartnerConsiderationList items={items} />
    </>
  )
}
