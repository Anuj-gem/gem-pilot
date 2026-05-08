// /dashboard — writer dashboard (v4, review-focused).
// Anuj 2026-05-08.
//
// Layout:
//   +--------------------------------------+
//   |  PROFILE HEADER                      |
//   +--------------------------------------+
//   |  CTAs: Upload + Start portfolio review|
//   +--------------------------------------+
//   |  MOST RECENT REVIEW (with feedback)  |
//   +--------------------------------------+
//   |  SCRIPTS PENDING REVIEW              |
//   +--------------------------------------+

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
import Link from 'next/link'
// InlineScriptUpload removed — upload now lives in the nav's "+ New" modal

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
  type FeedEval = { id: string; weighted_score: number | null; genre: string | null }
  const myEvalBySub = new Map<string, FeedEval>()
  if (submissionIds.length > 0) {
    const { data: myEvs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (myEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genre })
    }
  }

  // ---------- CONSIDERATIONS ----------
  const { data: considerations } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, outcome, next_steps')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  const allConsiderations = (considerations || []) as {
    id: string; status: string; review_stage: string; submitted_at: string; reviewed_at: string | null
    feedback: string | null; outcome: string | null; next_steps: string | null
  }[]

  const activeConsideration = allConsiderations.find(c => c.review_stage !== 'complete')
  const latestReview = allConsiderations[0] // most recent regardless of status

  // Review numbering: chronological, oldest = #1
  const latestReviewNumber = allConsiderations.length

  // Get ALL consideration_scripts across every consideration for this user.
  // This tells us which scripts have ever been attached to any review.
  const allConsiderationIds = allConsiderations.map(c => c.id)
  let allReviewedScriptIds: Set<string> = new Set()
  if (allConsiderationIds.length > 0) {
    const { data: allCs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .in('consideration_id', allConsiderationIds)
    for (const r of (allCs || []) as { script_submission_id: string }[]) {
      allReviewedScriptIds.add(r.script_submission_id)
    }
  }

  // Script count for latest review — only NEW scripts (not carried forward)
  let latestReviewScriptCount = 0
  if (latestReview) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id, carried_forward')
      .eq('consideration_id', latestReview.id)
    latestReviewScriptCount = (cs || []).filter(
      (r: { script_submission_id: string; carried_forward: boolean | null }) => !r.carried_forward
    ).length
  }

  // ---------- GATE LOGIC ----------
  const hasActiveConsideration = !!activeConsideration
  const hasBeenReviewed = allConsiderations.some(c => c.review_stage === 'complete')
  const trialReviewedGate = isTrial && hasBeenReviewed
  // Eligible if there are completed visible scripts NOT attached to any consideration
  const hasUnreviewedScripts = visible.some(
    s => s.status === 'completed' && !allReviewedScriptIds.has(s.id)
  )
  const canRequestConsideration = !hasActiveConsideration && !trialReviewedGate && hasUnreviewedScripts

  // ---------- SCRIPTS PENDING REVIEW ----------
  // "Pending review" = completed visible scripts NOT attached to ANY consideration
  const pendingScripts = visible
    .filter(s => s.status === 'completed' && !allReviewedScriptIds.has(s.id))
    .map(s => {
      const ev = myEvalBySub.get(s.id)
      return {
        id: s.id,
        title: s.title,
        format: s.declared_format,
        score: ev?.weighted_score ?? null,
        evaluationId: ev?.id ?? null,
        genre: ev?.genre ?? null,
      }
    })

  const isProcessing = visible.some((s) => s.status === 'processing' || s.status === 'queued')
  const completedCount = visible.filter(s => s.status === 'completed').length

  // Stage labels
  const STAGE_LABELS: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    initial_review: 'Initial review',
    advanced_review: 'Advanced review',
    partner_match: 'Partner match',
    complete: 'Complete',
  }
  const STAGE_COLORS: Record<string, string> = {
    draft: '#6b7280',
    pending: '#d97706',
    initial_review: '#7c3aed',
    advanced_review: '#2563eb',
    partner_match: '#059669',
    complete: '#16a34a',
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

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

        {/* ── PORTFOLIO REVIEW CTA ─────────────────────── */}
        {canRequestConsideration && pendingScripts.length > 0 && (
          <Link
            href="/consideration/submit"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-bold text-white transition-colors hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            New portfolio review
          </Link>
        )}

        {/* ── REVIEWS ─────────────────────────────────── */}
        {allConsiderations.length > 0 ? (
          <section>
            <header className="flex items-end justify-between gap-3 mb-2.5">
              <h2 className="text-[15px] font-bold text-gray-900 m-0">Your reviews</h2>
              {allConsiderations.length > 3 && (
                <Link href="/review" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
                  View all
                </Link>
              )}
            </header>

            {allConsiderations.length > 1 && (
              <p className="text-[12px] text-gray-400 m-0 mb-3">
                Each review builds on previous feedback to track your progress over time.
              </p>
            )}

            <div className="space-y-2.5">
              {allConsiderations.slice(0, 3).map((review, idx) => {
                const reviewNumber = allConsiderations.length - (allConsiderations.indexOf(review))
                return (
                  <Link key={review.id} href={`/review/c/${review.id}`} className="block">
                    <div className={`rounded-xl bg-white border border-gray-200 overflow-hidden hover:border-purple-200 transition-colors ${idx > 0 ? 'opacity-80' : ''}`}>
                      {/* Header */}
                      <div className={`px-4 py-3.5 ${(idx === 0 && review.review_stage === 'complete' && review.feedback) || (idx === 0 && review.review_stage !== 'complete') ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                              Portfolio review #{reviewNumber}
                            </span>
                            <span
                              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${STAGE_COLORS[review.review_stage] || '#6b7280'}15`,
                                color: STAGE_COLORS[review.review_stage] || '#6b7280',
                              }}
                            >
                              {STAGE_LABELS[review.review_stage] || review.review_stage}
                            </span>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 shrink-0">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>

                        {review.review_stage === 'complete' ? (
                          <div className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                              <circle cx="10" cy="10" r="9" stroke="#059669" strokeWidth="1.5" />
                              <path d="M6.5 10.5l2 2 5-5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[12px] text-gray-500">
                              Reviewed {fmtDate(review.reviewed_at!)}
                              {idx === 0 && ` · ${latestReviewScriptCount} ${latestReviewScriptCount === 1 ? 'script' : 'scripts'}`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-gray-500">
                              Submitted {fmtDate(review.submitted_at)}
                              {idx === 0 && ` · ${latestReviewScriptCount} ${latestReviewScriptCount === 1 ? 'script' : 'scripts'}`}
                            </span>
                          </div>
                        )}

                        {/* Progress bar for in-progress reviews */}
                        {review.review_stage !== 'complete' && (
                          <div className="flex items-center gap-1 mt-2.5">
                            {['draft', 'pending', 'initial_review', 'advanced_review', 'partner_match'].map((s, i) => {
                              const stageIdx = ['draft', 'pending', 'initial_review', 'advanced_review', 'partner_match'].indexOf(review.review_stage)
                              return (
                                <div
                                  key={s}
                                  className="flex-1 h-[3px] rounded-full"
                                  style={{ background: i <= stageIdx ? (STAGE_COLORS[review.review_stage] || '#7c3aed') : '#e5e7eb' }}
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Feedback body — only for the LATEST review, and only if complete with feedback */}
                      {idx === 0 && review.review_stage === 'complete' && review.feedback && (
                        <div className="px-4 py-3.5">
                          <p className="text-[12px] font-bold text-purple-600 uppercase tracking-[0.04em] m-0 mb-1.5">
                            Overall assessment
                          </p>
                          <p className="text-[13px] text-gray-600 leading-[1.55] m-0 mb-3 line-clamp-3">
                            {review.feedback}
                          </p>

                          {review.next_steps && (
                            <div className="pl-3 py-2.5 pr-3 rounded-r-lg" style={{
                              background: '#f5f3ff',
                              borderLeft: '3px solid #7c3aed',
                            }}>
                              <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-purple-600 m-0 mb-1">
                                Suggested next steps
                              </p>
                              <p className="text-[13px] text-purple-900 leading-[1.5] m-0 line-clamp-2">
                                {review.next_steps}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* In-progress message — only for the latest review */}
                      {idx === 0 && review.review_stage !== 'complete' && (
                        <div className="px-4 py-3.5">
                          <p className="text-[13px] text-gray-500 m-0">
                            {review.review_stage === 'draft'
                              ? 'Your review is in draft. Add scripts and submit when ready.'
                              : review.review_stage === 'pending'
                              ? 'Your portfolio has been submitted. Our team will begin reviewing shortly.'
                              : 'Your portfolio is being reviewed. Feedback expected within 5–7 days.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : completedCount > 0 ? (
          <section>
            <h2 className="text-[15px] font-bold text-gray-900 m-0 mb-2.5">Your reviews</h2>
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-[13px] text-gray-500 m-0 mb-3">No reviews yet. Submit your scripts for a portfolio review.</p>
              {canRequestConsideration && (
                <Link
                  href="/consideration/submit"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-purple-600 hover:text-purple-800"
                >
                  Start portfolio review
                </Link>
              )}
            </div>
          </section>
        ) : null}

        {/* ── SCRIPTS PENDING REVIEW ──────────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-2.5">
            <h2 className="text-[15px] font-bold text-gray-900 m-0">Scripts pending review</h2>
            <Link href="/scripts" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
              View full portfolio
            </Link>
          </header>

          {pendingScripts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-[13px] text-gray-500 m-0">
                No scripts pending review.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {pendingScripts.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Score badge */}
                    <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{
                      background: s.score != null && s.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                    }}>
                      {s.score != null ? (
                        <span className="text-[14px] font-bold" style={{
                          color: s.score >= 75 ? '#7c3aed' : '#6b7280',
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
                      </div>
                    </div>

                    {/* Link to report */}
                    {s.evaluationId && (
                      <Link
                        href={`/report/${s.evaluationId}`}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="View report"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Upload button removed — use "+ New" in the nav */}
        </section>
      </div>
    </>
  )
}
