// /opportunity-history — full history of all opportunities a writer has submitted to.
// Shows every submission grouped by opportunity: pending, reviewed (with feedback), withdrawn.
// Anuj 2026-05-03.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { PERSPECTIVE_LABELS, DEAL_TYPE_LABELS } from '@/components/opportunities/opportunity-card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

const OUTCOME_LABELS: Record<string, string> = {
  pass: 'Not selected',
  developing: 'Keep developing',
  revise_resubmit: 'Keep developing', // legacy compat
  advancing: 'Advancing',
}
const OUTCOME_COLORS: Record<string, string> = {
  pass: 'text-gray-500 bg-gray-100',
  developing: 'text-amber-800 bg-amber-100 border border-amber-300',
  revise_resubmit: 'text-amber-800 bg-amber-100 border border-amber-300', // legacy compat
  advancing: 'text-emerald-700 bg-emerald-50',
}
const NEXT_STEPS_LABELS: Record<string, string> = {
  revise_resubmit: 'Revise & resubmit',
  new_concept: 'Send a different concept',
  in_touch: "We'll be in touch",
}

export default async function OpportunityHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/opportunity-history')

  const service = svc()

  // Fetch all submissions for this writer
  const { data: allSubs } = await service
    .from('opportunity_submissions')
    .select('id, opportunity_id, submission_id, status, feedback, next_steps, outcome, submitted_at, reviewed_at')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  type SubRow = {
    id: string; opportunity_id: string; submission_id: string
    status: string; feedback: string | null; next_steps: string | null; outcome: string | null
    submitted_at: string; reviewed_at: string | null
  }
  const submissions = (allSubs || []) as SubRow[]

  if (submissions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-[22px] font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Opportunity history
        </h1>
        <p className="text-[14px] text-gray-400 m-0">
          You haven&apos;t submitted to any opportunities yet.
        </p>
        <Link
          href="/opportunities"
          className="inline-block mt-4 text-[13px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md transition-colors"
        >
          Browse opportunities
        </Link>
      </div>
    )
  }

  // Gather IDs for lookups
  const oppIds = [...new Set(submissions.map(s => s.opportunity_id))]
  const scriptIds = [...new Set(submissions.map(s => s.submission_id))]

  // Fetch opportunity details
  const { data: oppRows } = await service
    .from('opportunities')
    .select('id, title, slug, status, deadline, deal_type, perspective')
    .in('id', oppIds)

  type OppRow = {
    id: string; title: string; slug: string | null; status: string
    deadline: string | null; deal_type: string | null; perspective: string | null
  }
  const oppMap = new Map<string, OppRow>()
  for (const o of (oppRows || []) as OppRow[]) {
    oppMap.set(o.id, o)
  }

  // Fetch script details + evaluations
  const [{ data: scripts }, { data: evals }] = await Promise.all([
    service.from('script_submissions').select('id, title, declared_format').in('id', scriptIds),
    service.from('script_evaluations').select('id, submission_id, weighted_score, evaluation, edited_fields').in('submission_id', scriptIds),
  ])

  const scriptMap = new Map<string, { title: string; format: string | null }>()
  for (const s of (scripts || []) as { id: string; title: string; declared_format: string | null }[]) {
    scriptMap.set(s.id, { title: s.title, format: s.declared_format })
  }

  const evalMap = new Map<string, { id: string; score: number | null; genre: string | null }>()
  for (const e of (evals || []) as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown; edited_fields: Record<string, unknown> | null }[]) {
    const evJson = e.evaluation as Record<string, unknown> | null
    const ef = e.edited_fields as Record<string, unknown> | null
    const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
    const cls = (evJson?.classification as Record<string, unknown>) || {}
    const genre = (ef?.genre_primary as string) || (cls.genre_primary as string) || (fmt.genre_primary as string) || null
    evalMap.set(e.submission_id, { id: e.id, score: e.weighted_score, genre })
  }

  // Group submissions by opportunity
  type GroupedOpp = {
    opp: OppRow
    scripts: {
      subId: string; scriptTitle: string; evaluationId: string | null
      score: number | null; status: string; feedback: string | null
      nextSteps: string | null; outcome: string | null; submittedAt: string; reviewedAt: string | null
    }[]
  }

  const groupMap = new Map<string, GroupedOpp>()
  for (const sub of submissions) {
    const opp = oppMap.get(sub.opportunity_id)
    if (!opp) continue
    if (!groupMap.has(sub.opportunity_id)) {
      groupMap.set(sub.opportunity_id, { opp, scripts: [] })
    }
    const script = scriptMap.get(sub.submission_id)
    const ev = evalMap.get(sub.submission_id)
    groupMap.get(sub.opportunity_id)!.scripts.push({
      subId: sub.id,
      scriptTitle: script?.title ?? 'Unknown',
      evaluationId: ev?.id ?? null,
      score: ev?.score ?? null,
      status: sub.status,
      feedback: sub.feedback,
      nextSteps: sub.next_steps,
      outcome: sub.outcome,
      submittedAt: sub.submitted_at,
      reviewedAt: sub.reviewed_at,
    })
  }

  const groups = [...groupMap.values()]

  // Sort: pending first, then reviewed, then withdrawn
  const statusOrder: Record<string, number> = { pending: 0, reviewed: 1, withdrawn: 2 }
  groups.sort((a, b) => {
    const aMin = Math.min(...a.scripts.map(s => statusOrder[s.status] ?? 3))
    const bMin = Math.min(...b.scripts.map(s => statusOrder[s.status] ?? 3))
    if (aMin !== bMin) return aMin - bMin
    // Same status tier — sort by most recent submission
    const aTime = Math.max(...a.scripts.map(s => new Date(s.submittedAt).getTime()))
    const bTime = Math.max(...b.scripts.map(s => new Date(s.submittedAt).getTime()))
    return bTime - aTime
  })

  function statusBadge(status: string, outcome?: string | null) {
    if (status === 'pending') return 'text-amber-600 bg-amber-50'
    if (status === 'reviewed' && outcome) return OUTCOME_COLORS[outcome] ?? 'text-emerald-600 bg-emerald-50'
    if (status === 'reviewed') return 'text-emerald-600 bg-emerald-50'
    return 'text-gray-400 bg-gray-100'
  }
  function statusLabel(status: string, outcome?: string | null) {
    if (status === 'pending') return 'In consideration'
    if (status === 'reviewed' && outcome) return OUTCOME_LABELS[outcome] ?? 'Feedback received'
    if (status === 'reviewed') return 'Feedback received'
    return 'Withdrawn'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1 m-0">History</p>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Your opportunities
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {groups.length} {groups.length === 1 ? 'opportunity' : 'opportunities'} &middot; {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
        >
          &larr; Dashboard
        </Link>
      </div>

      {groups.map(({ opp, scripts: groupScripts }) => {
        const hasPending = groupScripts.some(s => s.status === 'pending')
        const hasReviewed = groupScripts.some(s => s.status === 'reviewed')
        const allWithdrawn = groupScripts.every(s => s.status === 'withdrawn')
        const daysLeft = opp.deadline
          ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null

        return (
          <section
            key={opp.id}
            className={`rounded-xl border overflow-hidden ${
              allWithdrawn ? 'bg-gray-50/50 border-gray-100' : 'bg-white border-gray-200'
            }`}
          >
            {/* Opportunity header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/opportunities/${opp.slug ?? opp.id}`}
                    className={`text-[15px] font-bold hover:text-purple-700 transition-colors block truncate ${
                      allWithdrawn ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {opp.title}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {opp.deal_type && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        {DEAL_TYPE_LABELS[opp.deal_type] ?? opp.deal_type}
                      </span>
                    )}
                    {opp.perspective && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                        {PERSPECTIVE_LABELS[opp.perspective] ?? opp.perspective}
                      </span>
                    )}
                    {opp.status !== 'active' && (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        Closed
                      </span>
                    )}
                    {daysLeft != null && daysLeft > 0 && opp.status === 'active' && (
                      <span className={`text-[10.5px] font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-gray-300'}`}>
                        {daysLeft}d left
                      </span>
                    )}
                  </div>
                </div>
                {hasPending && (
                  <span className="shrink-0 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    In consideration
                  </span>
                )}
                {!hasPending && hasReviewed && (() => {
                  const bestOutcome = groupScripts.find(s => s.outcome)?.outcome
                  if (bestOutcome) {
                    return (
                      <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        OUTCOME_COLORS[bestOutcome] ?? 'text-gray-600 bg-gray-100'
                      }`}>
                        {OUTCOME_LABELS[bestOutcome] ?? bestOutcome}
                      </span>
                    )
                  }
                  return (
                    <span className="shrink-0 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Feedback received
                    </span>
                  )
                })()}
                {allWithdrawn && (
                  <span className="shrink-0 text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    Withdrawn
                  </span>
                )}
              </div>
            </div>

            {/* Scripts submitted */}
            <div className="divide-y divide-gray-50">
              {groupScripts.map((s) => {
                const daysAgo = Math.floor((Date.now() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={s.subId} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center" style={{
                          background: s.score != null && s.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                        }}>
                          {s.score != null ? (
                            <span className="text-[13px] font-bold" style={{ color: s.score >= 75 ? '#7c3aed' : '#6b7280' }}>
                              {Math.round(s.score)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300">&mdash;</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-semibold m-0 truncate ${s.status === 'withdrawn' ? 'text-gray-400' : 'text-gray-900'}`}>
                            {s.scriptTitle}
                          </p>
                          <p className="text-[10.5px] text-gray-300 m-0 mt-0.5">
                            {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                            {s.reviewedAt && ` · Reviewed ${Math.floor((Date.now() - new Date(s.reviewedAt).getTime()) / (1000 * 60 * 60 * 24))}d ago`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${statusBadge(s.status, s.outcome)}`}>
                          {statusLabel(s.status, s.outcome)}
                        </span>
                        {s.evaluationId && (
                          <Link
                            href={`/report/${s.evaluationId}`}
                            className="text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md transition-colors"
                          >
                            View report
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Feedback + outcome */}
                    {s.status === 'reviewed' && (s.feedback || s.outcome || s.nextSteps) && (
                      <div className="mt-2.5 ml-[42px]">
                        {s.outcome ? (
                          <span className={`inline-block text-[10.5px] font-bold px-2.5 py-1 rounded-full mb-2 ${
                            OUTCOME_COLORS[s.outcome] ?? 'text-gray-600 bg-gray-100'
                          }`}>
                            {OUTCOME_LABELS[s.outcome] ?? s.outcome}
                          </span>
                        ) : s.nextSteps ? (
                          <span className={`inline-block text-[10.5px] font-bold px-2.5 py-1 rounded-full mb-2 ${
                            s.nextSteps === 'in_touch'
                              ? 'text-emerald-700 bg-emerald-50'
                              : s.nextSteps === 'revise_resubmit'
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-gray-600 bg-gray-100'
                          }`}>
                            {NEXT_STEPS_LABELS[s.nextSteps] ?? s.nextSteps}
                          </span>
                        ) : null}
                        {s.feedback && (
                          <div className="px-3 py-2.5 bg-gray-50 rounded-lg">
                            <p className="text-[12.5px] text-gray-500 leading-[1.6] m-0 whitespace-pre-line">{s.feedback}</p>
                            {(s.outcome === 'developing' || s.outcome === 'revise_resubmit') && (
                              <div className="flex items-center gap-1.5 mt-2 bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0"><circle cx="7" cy="7" r="7" fill="#16A34A"/><path d="M4.5 7.5L6 9L9.5 5.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <p className="text-[11px] font-semibold text-green-700 m-0">+1 bonus submission earned</p>
                              </div>
                            )}
                            {s.outcome === 'advancing' && (
                              <p className="text-[11px] font-semibold text-emerald-600 m-0 mt-2">
                                You&apos;re moving forward on this opportunity.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
