// /scripts — "My Scripts" — full list in dashboard row format.
// Shows consideration status per script + latest feedback summary.
// Consideration model v1 (2026-05-05).

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ScriptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/scripts')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active'
  const isTrial = !isPro
  const service = svc()

  // Fetch scripts
  type SubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const visible = ((mySubs as SubRow[] | null) || []).filter(s => !s.hidden_at)
  const submissionIds = visible.map(s => s.id)

  // Evaluations
  const evalBySub = new Map<string, { id: string; score: number | null; genre: string | null }>()
  if (submissionIds.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (evs || []) as any[]) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      evalBySub.set(e.submission_id, { id: e.id, score: e.weighted_score, genre })
    }
  }

  // Considerations — figure out which scripts are in active consideration or were previously considered
  const { data: considerations } = await service
    .from('considerations')
    .select('id, status, submitted_at, reviewed_at, feedback, outcome')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  const allConsiderations = (considerations || []) as {
    id: string; status: string; submitted_at: string; reviewed_at: string | null
    feedback: string | null; outcome: string | null
  }[]

  const activeConsideration = allConsiderations.find(c => c.status === 'pending')
  const latestReviewed = allConsiderations.find(c => c.status === 'reviewed')

  // Scripts in active consideration
  let activeScriptIds = new Set<string>()
  if (activeConsideration) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', activeConsideration.id)
    for (const r of (cs || []) as { script_submission_id: string }[]) {
      activeScriptIds.add(r.script_submission_id)
    }
  }

  // Scripts in latest reviewed consideration
  let reviewedScriptIds = new Set<string>()
  if (latestReviewed) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', latestReviewed.id)
    for (const r of (cs || []) as { script_submission_id: string }[]) {
      reviewedScriptIds.add(r.script_submission_id)
    }
  }

  // Paywall logic
  const allCompleted = visible
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstCompletedId = allCompleted[0]?.id ?? null

  // Gate logic
  const hasActiveConsideration = !!activeConsideration
  const lastReviewDate = latestReviewed?.reviewed_at ? new Date(latestReviewed.reviewed_at) : null
  const hasNewScriptSinceLastReview = lastReviewDate
    ? visible.some(s => s.status === 'completed' && new Date(s.created_at) > lastReviewDate)
    : true
  const canRequestConsideration = !hasActiveConsideration && hasNewScriptSinceLastReview

  const OUTCOME_LABELS: Record<string, string> = {
    pass: 'Pass',
    developing: 'Keep developing',
    advancing: 'Advancing',
  }

  return (
    <div className="max-w-2xl mx-auto">
      {isTrial && <UpgradeModalListener />}

      <header className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            My Scripts
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {allCompleted.length} {allCompleted.length === 1 ? 'script' : 'scripts'} evaluated
          </p>
        </div>
        <Link
          href="/submit"
          className="text-[12px] font-bold text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          + New script
        </Link>
      </header>

      {/* Consideration CTA */}
      {canRequestConsideration && (
        <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3.5 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-purple-900 m-0">Ready for consideration</p>
            <p className="text-[11.5px] text-purple-600 m-0 mt-0.5">Submit your portfolio for holistic feedback.</p>
          </div>
          <Link
            href="/consideration/submit"
            className="shrink-0 text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 rounded-lg transition-colors"
          >
            Request consideration
          </Link>
        </div>
      )}

      {/* Latest feedback summary */}
      {latestReviewed && latestReviewed.feedback && (
        <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Latest feedback</span>
            {latestReviewed.outcome && (
              <span className="text-[10.5px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                {OUTCOME_LABELS[latestReviewed.outcome] ?? latestReviewed.outcome}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-gray-600 m-0 line-clamp-2 leading-[1.5]">
            {latestReviewed.feedback}
          </p>
          <Link href="/feedback" className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 mt-1.5 inline-block">
            View full feedback →
          </Link>
        </div>
      )}

      {/* Script list */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
          <p className="text-[14px] text-gray-400 m-0 mb-3">No scripts yet. Upload your first to get started.</p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
          >
            Upload a script
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {visible.map(s => {
            const ev = evalBySub.get(s.id)
            const stillProcessing = s.status === 'processing' || s.status === 'queued'
            const isFirstCompleted = s.id === firstCompletedId
            const isLocked = isTrial && !stillProcessing && s.status === 'completed' && !isFirstCompleted
            const inActive = activeScriptIds.has(s.id)
            const wasReviewed = reviewedScriptIds.has(s.id)

            return (
              <div key={s.id} className="relative">
                {isLocked && (
                  <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                    <UpgradePill />
                  </div>
                )}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Score */}
                    <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{
                      background: stillProcessing ? '#f3f4f6' : ev?.score != null && ev.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                    }}>
                      {stillProcessing ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                      ) : ev?.score != null ? (
                        <span className="text-[14px] font-bold" style={{
                          color: ev.score >= 75 ? '#7c3aed' : '#6b7280',
                          ...(isLocked ? { filter: 'blur(6px)', userSelect: 'none' as const } : {}),
                        }}>
                          {Math.round(ev.score)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-300">&mdash;</span>
                      )}
                    </div>

                    {/* Title + meta */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {s.declared_format && <span className="text-[10.5px] text-gray-400">{s.declared_format}</span>}
                        {ev?.genre && (
                          <>
                            {s.declared_format && <span className="text-gray-200">&middot;</span>}
                            <span className="text-[10.5px] text-gray-400">{ev.genre}</span>
                          </>
                        )}
                        {stillProcessing && (
                          <span className="text-[10.5px] font-medium text-purple-500">Processing&hellip;</span>
                        )}
                      </div>
                    </div>

                    {/* Status + action */}
                    {!isLocked && !stillProcessing && (
                      <div className="flex items-center gap-2 shrink-0">
                        {inActive && (
                          <span className="text-[10.5px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            In consideration
                          </span>
                        )}
                        {!inActive && wasReviewed && (
                          <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Considered
                          </span>
                        )}
                        {ev && (
                          <Link
                            href={`/report/${ev.id}`}
                            className="shrink-0 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md transition-colors"
                          >
                            Report
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pro/Free badge */}
      <div className="flex items-center justify-between mt-3">
        {isPro ? (
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Pro</span>
        ) : (
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Free</span>
        )}
        {isTrial && (
          <span className="text-[11.5px] text-gray-400">
            Upgrade for unlimited scripts &amp; consideration
          </span>
        )}
      </div>
    </div>
  )
}
