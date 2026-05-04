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
import { MarkViewed } from '@/components/dashboard/mark-viewed'
import { CollapsibleOpportunity } from '@/components/dashboard/collapsible-opportunity'
import { WithdrawButton } from '@/components/dashboard/withdraw-button'
import { UpgradeBanner } from '@/components/dashboard/upgrade-banner'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
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
    .select('subscription_status, full_name, handle, headline, avatar_url, bonus_submissions')
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
    id: string; opportunity_id: string; opportunity_title: string; opportunity_slug: string
    deal_type: string | null; perspective: string | null; deadline: string | null
    script_title: string; evaluationId: string | null; score: number | null
    status: 'pending' | 'reviewed'
    feedback: string | null; nextSteps: string | null; outcome: string | null
    submitted_at: string; isNewFeedback: boolean
  }
  const activeSubs: ActiveSub[] = []
  if (submissionIds.length > 0) {
    const { data: myOppSubs } = await service
      .from('opportunity_submissions')
      .select('id, opportunity_id, submission_id, status, feedback, next_steps, outcome, submitted_at, feedback_viewed_at')
      .eq('writer_id', user.id)
      .neq('status', 'withdrawn')
      .order('submitted_at', { ascending: false })

    for (const os of (myOppSubs || []) as { id: string; opportunity_id: string; submission_id: string; status: string; feedback: string | null; next_steps: string | null; outcome: string | null; submitted_at: string; feedback_viewed_at: string | null }[]) {
      const opp = allOpportunities.find(o => o.id === os.opportunity_id)
      const sub = visible.find(s => s.id === os.submission_id)
      if (!opp || !sub) continue
      const ev = myEvalBySub.get(os.submission_id)
      activeSubs.push({
        id: os.id,
        opportunity_id: os.opportunity_id,
        opportunity_title: opp.title,
        opportunity_slug: opp.slug ?? opp.id,
        deal_type: opp.deal_type ?? null,
        perspective: opp.perspective ?? null,
        deadline: opp.deadline ?? null,
        script_title: sub.title,
        evaluationId: ev?.id ?? null,
        score: ev?.weighted_score ?? null,
        status: os.status as 'pending' | 'reviewed',
        feedback: os.feedback,
        nextSteps: os.next_steps,
        outcome: os.outcome,
        submitted_at: os.submitted_at,
        isNewFeedback: os.status === 'reviewed' && !os.feedback_viewed_at,
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
  const newFeedbackCount = activeSubs.filter(s => s.isNewFeedback).length
  const qualifyingScriptCount = [...oppCountByScript.values()].filter(c => c > 0).length

  // Sort: new feedback first, then pending, then past feedback
  const newFeedbackSubs = activeSubs.filter(s => s.isNewFeedback)
  const pendingSubs = activeSubs.filter(s => s.status === 'pending')
  const pastFeedbackSubs = activeSubs.filter(s => s.status === 'reviewed' && !s.isNewFeedback)

  // Group submissions by opportunity
  type OppGroup = {
    opportunityId: string; title: string; slug: string
    dealType: string | null; perspective: string | null; deadline: string | null
    scripts: ActiveSub[]
    hasPending: boolean; hasReviewed: boolean
    primaryOutcome: string | null
    primaryNextSteps: string | null
  }
  function groupByOpp(subs: ActiveSub[]): OppGroup[] {
    const map = new Map<string, ActiveSub[]>()
    for (const s of subs) {
      if (!map.has(s.opportunity_id)) map.set(s.opportunity_id, [])
      map.get(s.opportunity_id)!.push(s)
    }
    const groups: OppGroup[] = []
    for (const [oppId, scripts] of map) {
      const first = scripts[0]
      groups.push({
        opportunityId: oppId,
        title: first.opportunity_title,
        slug: first.opportunity_slug,
        dealType: first.deal_type,
        perspective: first.perspective,
        deadline: first.deadline,
        scripts,
        hasPending: scripts.some(s => s.status === 'pending'),
        hasReviewed: scripts.some(s => s.status === 'reviewed'),
        primaryOutcome: scripts.find(s => s.outcome)?.outcome ?? null,
        primaryNextSteps: scripts.find(s => s.nextSteps)?.nextSteps ?? null,
      })
    }
    return groups
  }

  // Pending groups: opportunities with at least one pending submission
  const pendingOppGroups = groupByOpp(activeSubs.filter(s => s.status === 'pending'))
  // Feedback groups: opportunities where submission is reviewed (and not in pending groups)
  const pendingOppIds = new Set(pendingOppGroups.map(g => g.opportunityId))
  const feedbackOppGroups = groupByOpp(activeSubs.filter(s => s.status === 'reviewed' && !pendingOppIds.has(s.opportunity_id)))

  // Monthly submission limit (Pro: 3/month + one-time bonus; Free: 0 — gated entirely)
  const bonusSubs = (profile as any)?.bonus_submissions ?? 0
  const MONTHLY_LIMIT = 3 + bonusSubs
  let monthlyUsed = 0
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const resetDaysLeft = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await service
      .from('opportunity_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('writer_id', user.id)
      .neq('status', 'withdrawn')
      .gte('submitted_at', monthStart)
    monthlyUsed = count ?? 0
  }
  const actualRemaining = Math.max(0, 3 - Math.min(monthlyUsed, 3)) + bonusSubs
  const atSubmitLimit = !isPro || actualRemaining <= 0

  const OUTCOME_LABELS: Record<string, string> = {
    pass: 'Not selected',
    developing: 'Keep developing',
    revise_resubmit: 'Invited to resubmit',
    advancing: 'Advancing',
  }
  const OUTCOME_COLORS: Record<string, string> = {
    pass: 'text-gray-500 bg-gray-100',
    developing: 'text-amber-700 bg-amber-50',
    revise_resubmit: 'text-purple-700 bg-purple-50',
    advancing: 'text-emerald-700 bg-emerald-50',
  }
  // Legacy fallback
  const NEXT_STEPS_LABELS: Record<string, string> = {
    revise_resubmit: 'Revise & resubmit',
    new_concept: 'Send a different concept',
    in_touch: "We'll be in touch",
  }

  return (
    <>
      <ProcessingPoller active={isProcessing} />
      {isTrial && <UpgradeModalListener />}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      {newFeedbackSubs.length > 0 && (
        <MarkViewed submissionIds={newFeedbackSubs.map(s => s.id)} />
      )}

      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── STAT CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2.5">
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-gray-800 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {completedCount}
            </p>
            <p className="text-[10.5px] text-gray-400 font-medium mt-1 m-0">
              {completedCount === 1 ? 'Script' : 'Scripts'}
            </p>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-100 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-purple-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {qualifyingScriptCount}
            </p>
            <p className="text-[10.5px] text-purple-400 font-medium mt-1 m-0">
              Qualifying
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-amber-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {pendingCount}
            </p>
            <p className="text-[10.5px] text-amber-500 font-medium mt-1 m-0">
              In consideration
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-emerald-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {reviewedCount}
            </p>
            <p className="text-[10.5px] text-emerald-500 font-medium mt-1 m-0">
              Feedback
            </p>
          </div>
        </div>

        {/* ── PENDING OPPORTUNITIES (grouped by opportunity) ── */}
        {(pendingOppGroups.length > 0 || feedbackOppGroups.length > 0) && (
          <section>
            <h2 className="text-[15px] font-bold text-gray-900 m-0 mb-2.5">
              Pending opportunities
              {newFeedbackCount > 0 && (
                <span className="ml-2 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {newFeedbackCount} new
                </span>
              )}
            </h2>
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">

              {/* ── In consideration groups ── */}
              {pendingOppGroups.map((group, gi) => {
                const daysLeft = group.deadline
                  ? Math.ceil((new Date(group.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null
                return (
                  <div key={group.opportunityId} className={`px-4 py-3.5 ${gi > 0 ? 'border-t border-gray-200' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/opportunities/${group.slug}`}
                          className="text-[14px] font-semibold text-gray-900 hover:text-purple-700 transition-colors truncate block"
                        >
                          {group.title}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {group.dealType && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              {DEAL_TYPE_LABELS[group.dealType] ?? group.dealType}
                            </span>
                          )}
                          {group.perspective && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                              {PERSPECTIVE_LABELS[group.perspective] ?? group.perspective}
                            </span>
                          )}
                          {daysLeft != null && daysLeft > 0 && (
                            <span className={`text-[10.5px] font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-gray-300'}`}>
                              {daysLeft}d left
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                        In consideration
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 m-0 mb-2">Scripts submitted</p>
                      {group.scripts.map((sub, si) => (
                        <div key={sub.id} className={`flex items-center justify-between py-2 ${si > 0 ? 'border-t border-gray-50' : ''}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center" style={{
                              background: sub.score != null && sub.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                            }}>
                              {sub.score != null ? (
                                <span className="text-[13px] font-bold" style={{ color: sub.score >= 75 ? '#7c3aed' : '#6b7280' }}>
                                  {Math.round(sub.score)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-300">&mdash;</span>
                              )}
                            </div>
                            <span className="text-[13px] text-gray-900 truncate">{sub.script_title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <WithdrawButton submissionRowId={sub.id} />
                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
                            {sub.evaluationId && (
                              <Link
                                href={`/report/${sub.evaluationId}`}
                                className="text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md transition-colors"
                              >
                                View report
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* ── Past feedback groups ── */}
              {feedbackOppGroups.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-200">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Past feedback</span>
                  </div>
                  {feedbackOppGroups.map((group) => (
                    <div key={group.opportunityId} className="px-4 py-3.5 border-t border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/opportunities/${group.slug}`}
                            className="text-[14px] font-semibold text-gray-500 hover:text-purple-700 transition-colors truncate block"
                          >
                            {group.title}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {group.dealType && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                {DEAL_TYPE_LABELS[group.dealType] ?? group.dealType}
                              </span>
                            )}
                            {group.perspective && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                {PERSPECTIVE_LABELS[group.perspective] ?? group.perspective}
                              </span>
                            )}
                          </div>
                        </div>
                        {group.primaryOutcome ? (
                          <span className={`shrink-0 text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                            OUTCOME_COLORS[group.primaryOutcome] ?? 'text-gray-600 bg-gray-100'
                          }`}>
                            {OUTCOME_LABELS[group.primaryOutcome] ?? group.primaryOutcome}
                          </span>
                        ) : group.primaryNextSteps ? (
                          <span className={`shrink-0 text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                            group.primaryNextSteps === 'in_touch'
                              ? 'text-emerald-700 bg-emerald-50'
                              : group.primaryNextSteps === 'revise_resubmit'
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-gray-600 bg-gray-100'
                          }`}>
                            {NEXT_STEPS_LABELS[group.primaryNextSteps] ?? group.primaryNextSteps}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-gray-100">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 m-0 mb-2">Scripts submitted</p>
                        {group.scripts.map((sub, si) => (
                          <div key={sub.id}>
                            <div className={`flex items-center justify-between py-2 ${si > 0 ? 'border-t border-gray-50' : ''}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center" style={{
                                  background: sub.score != null && sub.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                                }}>
                                  {sub.score != null ? (
                                    <span className="text-[13px] font-bold" style={{ color: sub.score >= 75 ? '#7c3aed' : '#6b7280' }}>
                                      {Math.round(sub.score)}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-300">&mdash;</span>
                                  )}
                                </div>
                                <span className="text-[13px] text-gray-700 truncate">{sub.script_title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {sub.outcome && (
                                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                                    OUTCOME_COLORS[sub.outcome] ?? 'text-gray-600 bg-gray-100'
                                  }`}>
                                    {OUTCOME_LABELS[sub.outcome] ?? sub.outcome}
                                  </span>
                                )}
                                {sub.evaluationId && (
                                  <Link
                                    href={`/report/${sub.evaluationId}`}
                                    className="shrink-0 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md transition-colors"
                                  >
                                    View report
                                  </Link>
                                )}
                              </div>
                            </div>
                            {sub.feedback && (
                              <div className="ml-10 mb-2 px-3 py-2.5 bg-gray-50 rounded-lg">
                                <p className="text-[12px] text-gray-500 leading-[1.6] m-0 whitespace-pre-line">{sub.feedback}</p>
                                {sub.outcome === 'revise_resubmit' && (
                                  <p className="text-[11px] font-semibold text-purple-600 m-0 mt-2">
                                    You earned a bonus submission — submit a revised draft or new concept.
                                  </p>
                                )}
                                {sub.outcome === 'advancing' && (
                                  <p className="text-[11px] font-semibold text-emerald-600 m-0 mt-2">
                                    You&apos;re moving forward on this opportunity.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* View all link */}
              {activeSubs.length > 3 && (
                <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                  <Link href="/opportunity-history" className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
                    View all submissions &rarr;
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── OPPORTUNITIES FOR YOU (collapsible) ────────── */}
        {totalAvailableOpps > 0 && (
          <section>
            <header className="flex items-end justify-between gap-3 mb-2.5">
              <h2 className="text-[15px] font-bold text-gray-900 m-0">
                Opportunities for you
                <span className="ml-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {totalAvailableOpps} available
                </span>
              </h2>
              <div className="flex items-center gap-3">
                {isPro && (() => {
                  const monthlyLeft = Math.max(0, 3 - Math.min(monthlyUsed, 3))
                  const bonus = bonusSubs
                  const total = monthlyLeft + bonus
                  if (total > 0) {
                    return <span className="text-[11px] text-gray-400 font-medium">{total} submission{total !== 1 ? 's' : ''} left{bonus > 0 ? ` (${bonus} bonus)` : ''}</span>
                  }
                  return <span className="text-[11px] text-gray-400 font-medium">All used · 3 more in {resetDaysLeft}d</span>
                })()}
                <Link href="/opportunities" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
                  See all
                </Link>
              </div>
            </header>
            {isTrial && (
              <UpgradeBanner message="Upgrade to Pro to submit to opportunities" />
            )}
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              {oppWithQualifications
                .filter(({ opportunity, qualifyingScripts }) => {
                  const submitted = existingOppSubs.get(opportunity.id) ?? new Set()
                  return qualifyingScripts.some(qs => !submitted.has(qs.id))
                })
                .slice(0, 5)
                .map(({ opportunity: opp, qualifyingScripts: qs }) => {
                  const submitted = existingOppSubs.get(opp.id) ?? new Set()
                  const unsubmitted = qs.filter(q => !submitted.has(q.id))
                  return (
                    <CollapsibleOpportunity
                      key={opp.id}
                      opportunityId={opp.id}
                      title={opp.title}
                      slug={opp.slug ?? opp.id}
                      dealType={opp.deal_type}
                      perspective={opp.perspective}
                      deadline={opp.deadline}
                      qualifyingScripts={unsubmitted.map(q => {
                        const ev = myEvalBySub.get(q.id)
                        return { id: q.id, title: q.title, score: ev?.weighted_score ?? null, evaluationId: q.evaluation_id }
                      })}
                      dealTypeLabels={DEAL_TYPE_LABELS}
                      perspectiveLabels={PERSPECTIVE_LABELS}
                      atLimit={atSubmitLimit}
                      isPro={isPro}
                      resetDaysLeft={atSubmitLimit && isPro ? resetDaysLeft : undefined}
                    />
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
                // Count pending submissions for this specific script
                const scriptPendingCount = activeSubs.filter(a => a.script_title === s.title && a.status === 'pending').length
                return (
                  <div key={s.submissionId} className="relative">
                    {s.isLocked && (
                      <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center gap-2">
                        {s.oppCount > 0 && (
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            Qualifies for {s.oppCount} {s.oppCount === 1 ? 'opportunity' : 'opportunities'}
                          </span>
                        )}
                        <UpgradePill />
                      </div>
                    )}
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Score badge */}
                        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{
                          background: s.isProcessing ? '#f3f4f6' : s.score != null && s.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                        }}>
                          {s.isProcessing ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                          ) : s.score != null ? (
                            <span className="text-[14px] font-bold" style={{
                              color: s.score >= 75 ? '#7c3aed' : '#6b7280',
                              ...(s.isLocked ? { filter: 'blur(6px)', userSelect: 'none' as const } : {}),
                            }}>
                              {Math.round(s.score)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-300">&mdash;</span>
                          )}
                        </div>

                        {/* Title + meta */}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
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

                        {/* Opportunity status — spelled out */}
                        {!s.isLocked && !s.isProcessing && scriptPendingCount > 0 && (
                          <span className="shrink-0 text-[11px] font-semibold text-amber-600">
                            {scriptPendingCount} {scriptPendingCount === 1 ? 'opportunity' : 'opportunities'} pending
                          </span>
                        )}
                        {!s.isLocked && !s.isProcessing && scriptPendingCount === 0 && s.oppCount > 0 && (
                          <span className="shrink-0 text-[11px] font-semibold text-emerald-600">
                            {s.oppCount} {s.oppCount === 1 ? 'opportunity' : 'opportunities'}
                          </span>
                        )}

                        {/* View report button */}
                        {!s.isLocked && !s.isProcessing && s.evaluationId && (
                          <Link
                            href={`/report/${s.evaluationId}`}
                            className="shrink-0 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md transition-colors"
                          >
                            View report
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* View all scripts link */}
              {scriptRows.length > 5 && (
                <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                  <Link href="/scripts" className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
                    View all {scriptRows.length} scripts &rarr;
                  </Link>
                </div>
              )}
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
