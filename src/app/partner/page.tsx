// /partner — producer dashboard (consideration model).
// Shows writers who have scripts in consideration, expandable to show
// their portfolio + feedback form.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/nav'
import { ConsiderationReviewCard } from '@/components/producer/consideration-review-card'
import Link from 'next/link'

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

  const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  const service = svc()

  // Get all considerations (pending first, then reviewed)
  const { data: allConsiderations } = await service
    .from('considerations')
    .select('id, writer_id, status, review_stage, submitted_at, reviewed_at, feedback, outcome, next_steps')
    .order('submitted_at', { ascending: true })

  const considerations = (allConsiderations || []) as {
    id: string; writer_id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null; outcome: string | null; next_steps: string | null
  }[]

  const pending = considerations.filter(c => c.review_stage !== 'complete')
  const reviewed = considerations.filter(c => c.review_stage === 'complete')

  // Get writer profiles
  const writerIds = [...new Set(considerations.map(c => c.writer_id))]
  const writerMap = new Map<string, { name: string; handle: string | null }>()
  if (writerIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, handle')
      .in('id', writerIds)
    for (const p of (profiles || []) as { id: string; full_name: string | null; handle: string | null }[]) {
      writerMap.set(p.id, { name: p.full_name || 'Unknown', handle: p.handle })
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

  return (
    <>
      <Nav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Writers in consideration
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {pending.length} active · {reviewed.length} complete
          </p>
        </header>

        {/* Pending considerations */}
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-[13.5px] text-gray-400 m-0">No writers pending review.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {pending.map(c => {
              const writer = writerMap.get(c.writer_id)
              return (
                <ConsiderationReviewCard
                  key={c.id}
                  considerationId={c.id}
                  writerName={writer?.name ?? 'Unknown'}
                  writerHandle={writer?.handle ?? null}
                  submittedAt={c.submitted_at}
                  scripts={scriptsByConsideration.get(c.id) ?? []}
                  status={c.status}
                  reviewStage={c.review_stage}
                  feedback={c.feedback}
                  nextSteps={c.next_steps}
                  events={eventsByConsideration.get(c.id) ?? []}
                />
              )
            })}
          </div>
        )}

        {/* Reviewed (collapsed) */}
        {reviewed.length > 0 && (
          <div className="mt-6">
            <p className="text-[12px] text-gray-400 font-medium mb-2">{reviewed.length} complete</p>
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden opacity-75">
              {reviewed.map(c => {
                const writer = writerMap.get(c.writer_id)
                return (
                  <ConsiderationReviewCard
                    key={c.id}
                    considerationId={c.id}
                    writerName={writer?.name ?? 'Unknown'}
                    writerHandle={writer?.handle ?? null}
                    submittedAt={c.submitted_at}
                    scripts={scriptsByConsideration.get(c.id) ?? []}
                    status={c.status}
                    feedback={c.feedback}
  
                    nextSteps={c.next_steps}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
