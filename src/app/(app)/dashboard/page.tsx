// /dashboard — writer dashboard (consideration model v1).
// Anuj 2026-05-05.
//
// Layout:
//   +--------------------------------------+
//   |  TWO CTAs: Upload + Request Consider |
//   +--------------------------------------+
//   |  STAT CARDS (scripts · in review · open calls)
//   +--------------------------------------+
//   |  CONSIDERATION STATUS (if active)    |
//   +--------------------------------------+
//   |  YOUR SCRIPTS (with open call counts)|
//   +--------------------------------------+
//   |  LATEST FEEDBACK (if any)            |
//   +--------------------------------------+

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
import { type OpportunityData } from '@/components/opportunities/opportunity-card'
import { ConsiderationStatus } from '@/components/dashboard/consideration-status'
import { OpenCallsDropdown } from '@/components/dashboard/open-calls-dropdown'
import { FeedbackCycle } from '@/components/consideration/feedback-cycle'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function DashboardPage() {
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
    script_evaluations:
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }[]
      | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, declared_format, created_at, is_public, hidden_at,
      script_evaluations ( id, weighted_score, evaluation, edited_fields )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
  const submissionIds = visible.map((s) => s.id)

  // ---------- EVALUATIONS ----------
  type FeedEval = { id: string; weighted_score: number | null; logline: string | null; genre: string | null; budget: string | null }
  const myEvalBySub = new Map<string, FeedEval>()
  if (submissionIds.length > 0) {
    const { data: myEvs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation, edited_fields')
      .in('submission_id', submissionIds)
    for (const e of (myEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown; edited_fields: Record<string, unknown> | null }[] | null) || []) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const ef = e.edited_fields as Record<string, unknown> | null
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const logline = (ef?.logline as string) || (fmt.logline_one_line as string) || (evJson?.positioning_hook as string) || null
      const genre = (ef?.genre_primary as string) || (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      const packaging = (evJson?.packaging as Record<string, unknown>) || {}
      const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
      const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, logline, genre, budget })
    }
  }

  // ---------- OPPORTUNITIES (for matching) ----------
  const { data: allOppRows } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  const opportunities = (allOppRows || []) as OpportunityData[]

  // ---------- QUALIFICATION (open call matching) ----------
  type QualifyingMatch = { oppId: string; oppTitle: string; oppSlug: string }
  const matchesByScript = new Map<string, QualifyingMatch[]>()

  for (const opp of opportunities) {
    for (const sub of visible) {
      if (sub.status !== 'completed') continue
      const ev = myEvalBySub.get(sub.id)
      if (!ev) continue
      const genreKey = ev.genre?.toLowerCase().replace(/[^a-z-]/g, '') || null
      if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format ?? '')) continue
      if (opp.genres.length > 0 && genreKey && !opp.genres.includes(genreKey)) continue
      if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
      if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue
      // Matches!
      if (!matchesByScript.has(sub.id)) matchesByScript.set(sub.id, [])
      matchesByScript.get(sub.id)!.push({ oppId: opp.id, oppTitle: opp.title, oppSlug: opp.slug ?? opp.id })
    }
  }

  const totalOpenCallMatches = new Set([...matchesByScript.values()].flatMap(m => m.map(x => x.oppId))).size

  // ---------- CONSIDERATIONS ----------
  const { data: considerations } = await service
    .from('considerations')
    .select('id, status, submitted_at, reviewed_at, feedback, outcome, next_steps')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  const allConsiderations = (considerations || []) as {
    id: string; status: string; submitted_at: string; reviewed_at: string | null
    feedback: string | null; outcome: string | null; next_steps: string | null
  }[]

  const activeConsideration = allConsiderations.find(c => c.status === 'pending')
  const latestReviewed = allConsiderations.find(c => c.status === 'reviewed')

  // Get scripts in active consideration
  let activeConsiderationScriptIds: string[] = []
  if (activeConsideration) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', activeConsideration.id)
    activeConsiderationScriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)
  }

  // Get scripts in latest reviewed consideration (for feedback display)
  let latestReviewedScripts: { title: string; score: number | null }[] = []
  if (latestReviewed) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', latestReviewed.id)
    const scriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)
    latestReviewedScripts = visible
      .filter(s => scriptIds.includes(s.id))
      .map(s => ({ title: s.title, score: myEvalBySub.get(s.id)?.weighted_score ?? null }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  // ---------- GATE LOGIC ----------
  // Can they request consideration? Need: no active consideration + (no past review OR new script since last review)
  const hasActiveConsideration = !!activeConsideration
  const lastReviewDate = latestReviewed?.reviewed_at ? new Date(latestReviewed.reviewed_at) : null
  const hasNewScriptSinceLastReview = lastReviewDate
    ? visible.some(s => s.status === 'completed' && new Date(s.created_at) > lastReviewDate)
    : true // No past review = can submit
  const canRequestConsideration = !hasActiveConsideration && hasNewScriptSinceLastReview

  // ---------- BUILD SCRIPT DATA ----------
  type ScriptRow = {
    submissionId: string; evaluationId: string | null; title: string
    format: string | null; genre: string | null; score: number | null
    isProcessing: boolean; isLocked: boolean
    openCallMatches: QualifyingMatch[]
    inConsideration: boolean
    createdAt: string
  }

  const allCompleted = visible
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstCompletedId = allCompleted[0]?.id ?? null

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
        openCallMatches: matchesByScript.get(s.id) ?? [],
        inConsideration: activeConsiderationScriptIds.includes(s.id),
        createdAt: s.created_at,
      }
    })
    .filter((r): r is ScriptRow => r !== null)

  const isProcessing = visible.some((s) => s.status === 'processing' || s.status === 'queued')
  const completedCount = allCompleted.length

  return (
    <>
      <ProcessingPoller active={isProcessing} />
      {isTrial && <UpgradeModalListener />}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}

      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── PROFILE HEADER ─────────────────────────────── */}
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100 shrink-0" />
          ) : (
            <div
              className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', fontSize: 15 }}
            >
              {(profile?.full_name || profile?.handle || '·').split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase() ?? '').join('') || '·'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[17px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {profile?.full_name || (profile?.handle ? `@${profile.handle}` : 'Welcome')}
              </h1>
              {isPro && (
                <span
                  className="inline-flex items-center text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-white px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Pro
                </span>
              )}
            </div>
            {profile?.handle && (
              <p className="text-[12px] text-purple-600 font-semibold m-0 truncate">@{profile.handle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={profile?.handle ? `/w/${profile.handle}` : '/profile'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View profile
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
              title="Settings"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* ── TWO CTAs ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/submit"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white text-[13px] font-bold hover:bg-gray-800 transition-colors text-center"
          >
            Upload a script
          </Link>
          {canRequestConsideration ? (
            <Link
              href="/consideration/submit"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors text-center"
            >
              Request consideration
            </Link>
          ) : hasActiveConsideration ? (
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-100 text-purple-600 text-[13px] font-bold text-center cursor-default">
              In consideration
            </div>
          ) : (
            <Link
              href="/submit"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-500 text-[13px] font-bold text-center hover:bg-gray-200 transition-colors"
            >
              Upload a new script to resubmit
            </Link>
          )}
        </div>

        {/* ── STAT CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-purple-50 border border-purple-100 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-purple-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {completedCount}
            </p>
            <p className="text-[12px] text-purple-400 font-medium mt-1 m-0">
              {completedCount === 1 ? 'Script' : 'Scripts'}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3.5 text-center">
            <p className="text-[26px] font-bold text-emerald-600 m-0 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              {totalOpenCallMatches}
            </p>
            <p className="text-[12px] text-emerald-500 font-medium mt-1 m-0">
              Open calls you fit
            </p>
          </div>
        </div>

        {/* ── CONSIDERATION STATUS ────────────────────────── */}
        {activeConsideration && (
          <ConsiderationStatus
            submittedAt={activeConsideration.submitted_at}
            scriptCount={activeConsiderationScriptIds.length}
          />
        )}

        {/* ── YOUR SCRIPTS ────────────────────────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-2.5">
            <h2 className="text-[15px] font-bold text-gray-900 m-0">
              Your scripts
            </h2>
            {scriptRows.length > 5 && (
              <Link href="/scripts" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
                View all
              </Link>
            )}
          </header>

          {scriptRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-[13.5px] text-gray-400 m-0">Upload your first script to get started.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {scriptRows.slice(0, 5).map((s) => (
                <div key={s.submissionId} className="relative">
                  {s.isLocked && (
                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center gap-2">
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
                          {s.format && <span className="text-[12px] text-gray-400">{s.format}</span>}
                          {s.genre && (
                            <>
                              {s.format && <span className="text-gray-200">&middot;</span>}
                              <span className="text-[12px] text-gray-400">{s.genre}</span>
                            </>
                          )}
                          {!s.isProcessing && !s.isLocked && s.openCallMatches.length > 0 && (
                            <>
                              <span className="text-gray-200">&middot;</span>
                              <OpenCallsDropdown
                                count={s.openCallMatches.length}
                                matches={s.openCallMatches.map(m => ({ title: m.oppTitle, slug: m.oppSlug }))}
                              />
                            </>
                          )}
                          {s.isProcessing && (
                            <span className="text-[12px] font-medium text-purple-500">Processing&hellip;</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!s.isLocked && !s.isProcessing && (
                        <div className="flex items-center gap-2 shrink-0">
                          {s.inConsideration && (
                            <span className="text-[12px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                              In consideration
                            </span>
                          )}
                          {s.evaluationId && (
                            <Link
                              href={`/report/${s.evaluationId}`}
                              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-50 transition-colors"
                              title="View report"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pro/Free badge */}
          <div className="flex items-center justify-between mt-3">
            {isPro ? (
              <span className="text-[12px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">Pro</span>
            ) : (
              <span className="text-[12px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">Free</span>
            )}
            {isTrial && (
              <span className="text-[12px] text-gray-400">
                Upgrade for unlimited scripts
              </span>
            )}
          </div>
        </section>

        {/* ── FEEDBACK ────────────────────────────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-2.5">
            <h2 className="text-[15px] font-bold text-gray-900 m-0">
              Recent feedback
            </h2>
            <Link href="/feedback" className="text-[12px] text-purple-600 hover:text-purple-800 font-semibold">
              View all feedback
            </Link>
          </header>

          {latestReviewed && latestReviewed.feedback ? (
            <FeedbackCycle
              submittedAt={latestReviewed.submitted_at}
              reviewedAt={latestReviewed.reviewed_at}
              feedback={latestReviewed.feedback}
              nextSteps={latestReviewed.next_steps}
              scriptCount={latestReviewedScripts.length}
              linkToFull
            />
          ) : hasActiveConsideration ? (
            <div className="rounded-xl bg-white border border-gray-200 px-5 py-6 text-center">
              <p className="text-[13.5px] text-gray-500 m-0">Your portfolio is being reviewed. Feedback expected within 5–7 days.</p>
            </div>
          ) : completedCount > 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-[13.5px] text-gray-500 m-0 mb-3">No feedback yet. Request consideration to get notes on your work.</p>
              {canRequestConsideration && (
                <Link
                  href="/consideration/submit"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-purple-600 hover:text-purple-800"
                >
                  Request consideration →
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-[13.5px] text-gray-400 m-0">Upload scripts to start receiving feedback.</p>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
