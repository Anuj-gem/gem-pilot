// /producer/considerations — Per-writer consideration review.
// Shows pending considerations with full portfolio for holistic review.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
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

export default async function ProducerConsiderationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = svc()

  // Get all considerations (pending first, then reviewed)
  const { data: allConsiderations } = await service
    .from('considerations')
    .select('id, writer_id, status, submitted_at, reviewed_at, feedback, outcome, next_steps')
    .order('submitted_at', { ascending: true })

  const considerations = (allConsiderations || []) as {
    id: string; writer_id: string; status: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null; outcome: string | null; next_steps: string | null
  }[]

  const pending = considerations.filter(c => c.status === 'pending')
  const reviewed = considerations.filter(c => c.status === 'reviewed')

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

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-[18px] font-bold text-gray-900 m-0">
          Considerations
          {pending.length > 0 && (
            <span className="ml-2 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {pending.length} pending
            </span>
          )}
        </h1>
        <Link href="/producer/opportunities" className="text-[12px] font-semibold text-gray-400 hover:text-gray-700">
          Old submissions →
        </Link>
      </header>

      {/* Pending considerations */}
      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <p className="text-[13.5px] text-gray-400 m-0">No pending considerations.</p>
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
                feedback={c.feedback}
                outcome={c.outcome}
                nextSteps={c.next_steps}
              />
            )
          })}
        </div>
      )}

      {/* Reviewed (collapsed) */}
      {reviewed.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] text-gray-400 font-medium mb-2">{reviewed.length} reviewed</p>
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
                  outcome={c.outcome}
                  nextSteps={c.next_steps}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
