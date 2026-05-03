// /dashboard — writer pipeline center (v0.15 opportunities-v1).
// Anuj 2026-05-03.
//
// Pipeline-focused layout:
//
//   +--------------------------------------+
//   |  STAT CARDS (clickable)               |
//   |  scripts · in consideration · opps    |
//   +--------------------------------------+
//   |  IN CONSIDERATION (front & center)    |
//   |  active subs + feedback               |
//   +--------------------------------------+
//   |  AVAILABLE OPPORTUNITIES              |
//   |  matched but not yet submitted        |
//   +--------------------------------------+
//   |  YOUR SCRIPTS                         |
//   |  match count + 3-dot + subtle report  |
//   +--------------------------------------+

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { type OpportunityData, type QualifyingScript, PERSPECTIVE_LABELS, DEAL_TYPE_LABELS } from '@/components/opportunities/opportunity-card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, headline, avatar_url')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active'
  const isTrial = !isPro
  const service = svc()

  // ---------- YOUR scripts ----------
  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; is_public: boolean; hidden_at: string | null
    allow_reviews: boolean | null; allow_industry: boolean | null
    script_evaluations:
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }[]
      | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, declared_format, created_at, is_public, hidden_at,
      allow_reviews, allow_industry,
      script_evaluations ( id, weighted_score, evaluation, edited_fields )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
  const submissionIds = visible.map((s) => s.id)

  // ---------- OPPORTUNITIES ----------
  // Fetch ALL opportunities (need inactive ones too for submission lookups)
  const { data: allOppRows } = await service
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })
  const allOpportunities = (allOppRows || []) as OpportunityData[]
  const opportunities = allOpportunities.filter(o => o.status === 'active')

  type FeedEval = { id: string; weighted_score: number | null; logline: string | null; genre: string | null; budget: string | null }
  const myEvalBySub = new Map<string, FeedEval>()
  if (submissionIds.length > 0) {
    const { data: myEvs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (myEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const logline = (fmt.logline_one_line as string) || (evJson?.positioning_hook as string) || null
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      const packaging = (evJson?.packaging as Record<string, unknown>) || {}
      const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
      const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, logline, genre, budget })
    }
  }

  // ---------- QUALIFICATION ----------
  function scriptsQualifyingFor(opp: OpportunityData): QualifyingScript[] {
    const qualifying: QualifyingScript[] = []
    for (const sub of visible) {
      if (sub.status !== 'completed') continue
      const ev = myEvalBySub.get(sub.id)
      if (!ev) continue
      const genreKey = ev.genre?.toLowerCase().replace(/[^a-z-]/g, '') || null
      if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format ?? '')) continue
      if (opp.genres.length > 0 && genreKey && !opp.genres.includes(genreKey)) continue
      if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
      if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue
      qualifying.push({ id: sub.id, title: sub.title, evaluation_id: ev.id })
    }
    return qualifying
  }
  const oppWithQualifications = opportunities.map(opp => ({
    opportunity: opp,
    qualifyingScripts: scriptsQualifyingFor(opp),
  }))

  // Per-script: how many opportunities does it qualify for?
  const oppCountByScript = new Map<string, number>()
  for (const { qualifyingScripts } of oppWithQualifications) {
    for (const qs of qualifyingScripts) {
      oppCountByScript.set(qs.id, (oppCountByScript.get(qs.id) ?? 0) + 1)
    }
  }

  // Available = matched but not yet submitted
  // We need to know which scripts are already submitted to which opportunities
  const allQualifyingSubIds = [...new Set(oppWithQualifications.flatMap(o => o.qualifyingScripts.map(q => q.id)))]
  const existingOppSubs = new Map<string, Set<string>>() // opp_id -> Set<submission_id>
  if (allQualifyingSubIds.length > 0) {
    const { data: oppSubs } = await service
      .from('opportunity_submissions')
      .select('opportunity_id, submission_id, status')
      .eq('writer_id', user.id)
      .neq('status', 'withdrawn')
    for (const os of (oppSubs || []) as { opportunity_id: string; submission_id: string; status: string }[]) {
      if (!existingOppSubs.has(os.opportunity_id)) existingOppSubs.set(os.opportunity_id, new Set())
      existingOppSubs.get(os.opportunity_id)!.add(os.submission_id)
    }
  }

  // ---------- SUBMISSION STATUS ----------
  type ActiveSub = {
    id: string; opportunity_title: string; opportunity_slug: string
    script_title: string; evaluationId: string | null; status: 'pending' | 'reviewed'; feedback: string | null
    annotationCount: number; created_at: string
  }
  const activeSubs: ActiveSub[] = []
  if (submissionIds.length > 0) {
    const { data: myOppSubs } = await service
      .from('opportunity_submissions')
      .select('id, opportunity_id, submission_id, status, feedback, created_at')
      .eq('writer_id', user.id)
      .neq('status', 'withdrawn')
      .order('created_at', { ascending: false })

    // Fetch annotation counts for reviewed submissions
    const reviewedOppSubIds = (myOppSubs || [])
      .filter((os: any) => os.status === 'reviewed')
      .map((os: any) => os.id)
    const annotationCounts = new Map<string, number>()
    if (reviewedOppSubIds.length > 0) {
      const { data: annCounts } = await service
        .from('submission_annotations')
        .select('submission_id')
        .in('submission_id', reviewedOppSubIds)
      for (const ac of (annCounts || []) as { submission_id: string }[]) {
        annotationCounts.set(ac.submission_id, (annotationCounts.get(ac.submission_id) ?? 0) + 1)
      }
    }

    for (const os of (myOppSubs || []) as { id: string; opportunity_id: string; submission_id: string; status: string; feedback: string | null; created_at: string }[]) {
      const opp = allOpportunities.find(o => o.id === os.opportunity_id)
      const sub = visible.find(s => s.id === os.submission_id)
      if (!opp || !sub) continue
      const ev = myEvalBySub.get(os.submission_id)
      activeSubs.push({
        id: os.id,
        opportunity_title: opp.title,
        opportunity_slug: opp.slug ?? opp.id,
        script_title: sub.title,
        evaluationId: ev?.id ?? null,
        status: os.status as 'pending' | 'reviewed',
        feedback: os.feedback,
        annotationCount: annotationCounts.get(os.id) ?? 0,
        created_at: os.created_at,
      })
    }
  }

  // ---------- AVAILABLE OPP COUNT ----------
  let totalAvailableOpps = 0
  for (const { opportunity, qualifyingScripts } of oppWithQualifications) {
    const submitted = existingOppSubs.get(opportunity.id) ?? new Set()
    const unsubmitted = qualifyingScripts.filter(qs => !submitted.has(qs.id))
    if (unsubmitted.length > 0) totalAvailableOpps++
  }

  // ---------- PAYWALL LOGIC ----------
  const allSubs = (mySubs as MySubRow[] | null) || []
  const allCompleted = allSubs
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstCompletedId = allCompleted[0]?.id ?? null

  // Build script data
  type ScriptRow = {
    submissionId: string; evaluationId: string | null; title: string
    format: string | null; genre: string | null; score: number | null
    isProcessing: boolean; isLocked: boolean; oppCount: number
    createdAt: string
  }
  const scriptRows: ScriptRow[] = visible
    .map((s): ScriptRow | null => {
      const ev = myEvalBySub.get(s.id)
      const stillProcessing = s.status === 'processing' || s.status === 'queued'
      if (!ev && !stillProcessing) return null
      const isFirstCompleted = s.id === firstCompletedId
      return {
        submissionId: s.id,
        evaluationId: ev?.id ?? null,
        title: s.title,
        format: s.declared_format,
        genre: ev?.genre ?? null,
        score: ev?.weighted_score ?? null,
        isProcessing: stillProcessing,
        isLocked: isTrial && !stillProcessing && !isFirstCompleted,
        oppCount: oppCountByScript.get(s.id) ?? 0,
        createdAt: s.created_at,
      }
    })
    .filter((r): r is ScriptRow => r !== null)

  const isProcessing = visible.some((s) => s.status === 'processing' || s.status === 'queued')
  const completedCount = allCompleted.length
  const pendingCount = activeSubs.filter(s => s.status === 'pending').length
  const reviewedCount = activeSubs.filter(s => s.status === 'reviewed').length
  const qualifyingScriptCount = [...oppCountByScript.values()].filter(c => c > 0).length

  return (
    <>
      <ProcessingPoller active={isProcessing} />
      {isTrial && <UpgradeModalListener />}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}

      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── STAT CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2.5">
          <div className="rounded-xl bg-white border border-gray-200 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-gray-900 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {completedCount}
            </p>
            <p className="text-[10.5px] text-gray-400 font-medium mt-1 m-0">
              {completedCount === 1 ? 'Script' : 'Scripts'}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-purple-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {qualifyingScriptCount}
            </p>
            <p className="text-[10.5px] text-gray-400 font-medium mt-1 m-0">
              Qualifying
            </p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-amber-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {pendingCount}
            </p>
            <p className="text-[10.5px] text-gray-400 font-medium mt-1 m-0">
              In consideration
            </p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-emerald-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {reviewedCount}
            </p>
            <p className="text-[10.5px] text-gray-400 font-medium mt-1 m-0">
              Feedback
            </p>
          </div>
        </div>

        {/* ── YOUR OPPORTUNITIES ────────────────────────────── */}
        {activeSubs.length > 0 && (
          <section>
            <h2 className="text-[15px] font-bold text-gray-900 m-0 mb-2.5">
              Scripts you&apos;ve submitted
              {reviewedCount > 0 && (
                <span className="ml-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {reviewedCount} with feedback
                </span>
              )}
            </h2>
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {activeSubs.map((sub) => {
                const daysAgo = Math.floor((Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={sub.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Opportunity title — primary */}
                        <Link
                          href={`/opportunities/${sub.opportunity_slug}`}
                          className="text-[13.5px] font-semibold text-gray-900 hover:text-purple-700 m-0 truncate block transition-colors"
                        >
                          {sub.opportunity_title}
                        </Link>
                        {/* Script title + meta — secondary */}
                        <div className="flex items-center gap-1.5 mt-1 text-[11.5px] text-gray-400">
                          {sub.evaluationId ? (
                            <Link href={`/report/${sub.evaluationId}`} className="text-purple-600 hover:text-purple-800 font-medium">
                              {sub.script_title}
                            </Link>
                          ) : (
                            <span>{sub.script_title}</span>
                          )}
                          {daysAgo > 0 && <span>&middot; {daysAgo}d ago</span>}
                        </div>
                      </div>
                      <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        sub.status === 'reviewed'
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-amber-600 bg-amber-50'
                      }`}>
                        {sub.status === 'reviewed' ? 'Feedback' : 'In consideration'}
                      </span>
                    </div>

                    {/* Feedback section for reviewed submissions */}
                    {sub.status === 'reviewed' && sub.feedback && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1">
                          What they&apos;re looking for next
                        </p>
                        <p className="text-[12.5px] text-gray-600 leading-[1.6] m-0 whitespace-pre-line">{sub.feedback}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {sub.annotationCount > 0 && sub.evaluationId && (
                            <Link
                              href={`/report/${sub.evaluationId}`}
                              className="text-[11.5px] font-semibold text-purple-600 hover:text-purple-800"
                            >
                              {sub.annotationCount} annotation{sub.annotationCount !== 1 ? 's' : ''} on your report &rarr;
                            </Link>
                          )}
                          {sub.evaluationId && sub.annotationCount === 0 && (
                            <Link
                              href={`/report/${sub.evaluationId}`}
                              className="text-[11.5px] font-semibold text-purple-600 hover:text-purple-800"
                            >
                              View report &rarr;
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pending — still show report link */}
                    {sub.status === 'pending' && sub.evaluationId && (
                      <div className="mt-2 flex items-center">
                        <Link
                          href={`/report/${sub.evaluationId}`}
                          className="text-[11.5px] font-medium text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          View report &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── AVAILABLE OPPORTUNITIES ─────────────────────── */}
        {totalAvailableOpps > 0 && (
          <section>
            <header className="flex items-end justify-between gap-3 mb-2.5">
              <h2 className="text-[15px] font-bold text-gray-900 m-0">
                Opportunities for you
                <span className="ml-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {totalAvailableOpps} available
                </span>
              </h2>
              <Link href="/opportunities" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
                See all
              </Link>
            </header>
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {oppWithQualifications
                .filter(({ opportunity, qualifyingScripts }) => {
                  const submitted = existingOppSubs.get(opportunity.id) ?? new Set()
                  return qualifyingScripts.some(qs => !submitted.has(qs.id))
                })
                .slice(0, 5)
                .map(({ opportunity: opp, qualifyingScripts: qs }) => {
                  const deadline = opp.deadline ? new Date(opp.deadline) : null
                  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                  const submitted = existingOppSubs.get(opp.id) ?? new Set()
                  const availableCount = qs.filter(q => !submitted.has(q.id)).length

                  return (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.slug ?? opp.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-gray-900 m-0 truncate">{opp.title}</p>
                        <div className="flex items-center gap-2 mt-1">
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
                          {daysLeft != null && daysLeft > 0 && (
                            <span className={`text-[10.5px] font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-gray-300'}`}>
                              {daysLeft}d left
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        {availableCount} {availableCount === 1 ? 'script qualifies' : 'scripts qualify'}
                      </span>
                    </Link>
                  )
                })}
            </div>
          </section>
        )}

        {/* ── YOUR SCRIPTS ────────────────────────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-2.5">
            <h2 className="text-[15px] font-bold text-gray-900 m-0">
              Your scripts
            </h2>
            <Link
              href="/submit"
              className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md transition-colors"
            >
              + Submit script
            </Link>
          </header>

          {scriptRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-[13.5px] text-gray-400 m-0">Submit your first script to get started.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {scriptRows.map((s) => {
                const reportHref = s.evaluationId ? `/report/${s.evaluationId}` : '#'
                return (
                  <div key={s.submissionId} className="relative">
                    {s.isLocked && (
                      <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5V4a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Upgrade to view
                        </span>
                      </div>
                    )}
                    <div className={`px-4 py-3 ${s.isLocked ? '' : ''}`}>
                      <div className="flex items-center gap-3">
                        {/* Score badge */}
                        <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{
                          background: s.isProcessing ? '#f3f4f6' : s.score != null && s.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                        }}>
                          {s.isProcessing ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                          ) : s.score != null ? (
                            <span className="text-[15px] font-bold" style={{ color: s.score >= 75 ? '#7c3aed' : '#6b7280' }}>
                              {Math.round(s.score)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-300">&mdash;</span>
                          )}
                        </div>

                        {/* Title + meta */}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.format && <span className="text-[10.5px] text-gray-400">{s.format}</span>}
                            {s.genre && (
                              <>
                                {s.format && <span className="text-gray-200">&middot;</span>}
                                <span className="text-[10.5px] text-gray-400">{s.genre}</span>
                              </>
                            )}
                            {s.isProcessing && (
                              <span className="text-[10.5px] font-medium text-purple-500">Processing&hellip;</span>
                            )}
                          </div>
                        </div>

                        {/* Opportunity match count — prominent */}
                        {!s.isLocked && !s.isProcessing && s.oppCount > 0 && (
                          <Link
                            href="/opportunities"
                            className="shrink-0 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                          >
                            {s.oppCount} {s.oppCount === 1 ? 'opp' : 'opps'}
                          </Link>
                        )}

                        {/* View report — subtle */}
                        {!s.isLocked && !s.isProcessing && s.evaluationId && (
                          <Link
                            href={reportHref}
                            className="shrink-0 text-[11px] font-medium text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            Report
                          </Link>
                        )}

                        {/* Three-dot menu placeholder — TODO: wire up edit/settings */}
                        {!s.isLocked && !s.isProcessing && (
                          <button
                            type="button"
                            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="More options"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="3" r="1.2" fill="currentColor"/>
                              <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
                              <circle cx="7" cy="11" r="1.2" fill="currentColor"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pro/Free badge + upgrade nudge */}
          <div className="flex items-center justify-between mt-3">
            {isPro ? (
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Pro</span>
            ) : (
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Free</span>
            )}
            {isTrial && (
              <span className="text-[11.5px] text-gray-400">
                Upgrade to evaluate more scripts
              </span>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
