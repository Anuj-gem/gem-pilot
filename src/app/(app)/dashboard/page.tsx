// /dashboard — writer dashboard (v8, stat cards + reskinned feedback).
//
// Layout:
//   +----------------------------------------------+
//   |  PROFILE HEADER                              |
//   +----------------------------------------------+
//   |  STAT CARDS (scripts · applications · heat)  |
//   +----------------------------------------------+
//   |  YOUR FEEDBACK (white cards, left border)    |
//   +----------------------------------------------+
//   |  PENDING APPLICATIONS                        |
//   +----------------------------------------------+
//   |  AVAILABLE OPPORTUNITIES (progress bars)     |
//   +----------------------------------------------+
//   |  YOUR RECENT SCRIPTS                         |
//   +----------------------------------------------+

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { DashboardUpgradeBanner } from '@/components/dashboard/dashboard-upgrade-banner'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { DashboardScriptCard } from '@/components/dashboard/dashboard-script-card'
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
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, avatar_url, heat_score')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const isTrial = !isPro
  const service = svc()

  // ---------- YOUR scripts ----------
  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; heat_score: number | null; is_public: boolean | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at, heat_score, is_public')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
  const submissionIds = visible.map((s) => s.id)

  // ---------- EVALUATIONS ----------
  function normGenre(g: string | null | undefined): string {
    return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  type FeedEval = { id: string; weighted_score: number | null; genres: string[]; format: string | null }
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
      const genreSet = new Set<string>()
      for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
        const n = normGenre(raw)
        if (n) genreSet.add(n)
      }
      const format = (cls.format as string) || (fmt.format as string) || null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: Array.from(genreSet), format })
    }
  }

  // ---------- OPEN OPPORTUNITIES ----------
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres, min_score, subtitle, description, deadline, budget_tiers')
    .eq('status', 'active')
  const allOpenOpps = (openOpps || []) as {
    id: string; title: string; slug: string
    formats: string[] | null; genres: string[] | null; min_score: number | null
    subtitle: string | null; description: string | null
    deadline: string | null; budget_tiers: string[] | null
  }[]

  // ---------- APPLICATIONS (considerations with opportunity_id) ----------
  const { data: applications } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, writer_response, heat_earned')
    .eq('writer_id', user.id)
    .not('opportunity_id', 'is', null)
    .order('submitted_at', { ascending: false })

  const allApplications = (applications || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null; writer_response: string | null
    heat_earned: number
  }[]

  // Map opportunity IDs to info
  const oppMap = new Map(allOpenOpps.map(o => [o.id, o]))

  // ---------- MATCHING LOGIC ----------
  function getQualifyingOpps(format: string | null, scriptGenres: string[], score: number | null) {
    return allOpenOpps.filter(o => {
      if (o.min_score && (!score || score < o.min_score)) return false
      const noFormatFilter = !o.formats || o.formats.length === 0
      const noGenreFilter = !o.genres || o.genres.length === 0
      if (noFormatFilter && noGenreFilter) return true
      const fmtMatch = noFormatFilter || (format && o.formats!.some(f => f.toLowerCase() === format.toLowerCase()))
      if (!fmtMatch) return false
      if (noGenreFilter) return true
      if (scriptGenres.length === 0) return false
      const oppNorm = o.genres!.map(normGenre)
      return scriptGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
    })
  }

  // IDs of opportunities the user has already applied to
  const appliedOppIds = new Set(allApplications.map(a => a.opportunity_id))

  // Build script cards with matching opps (full objects for dropdown)
  const completedScripts = visible
    .filter(s => s.status === 'completed')
    .map(s => {
      const ev = myEvalBySub.get(s.id)
      const qualifyingOpps = getQualifyingOpps(ev?.format || s.declared_format, ev?.genres || [], ev?.weighted_score || null)
        .filter(o => !appliedOppIds.has(o.id))  // exclude already-applied
      return {
        id: s.id,
        title: s.title,
        format: ev?.format || s.declared_format,
        genres: ev?.genres || [],
        evaluationId: ev?.id ?? null,
        createdAt: s.created_at,
        qualifyingOpps: qualifyingOpps.map(o => ({ id: o.id, title: o.title, slug: o.slug })),
      }
    })

  // Scripts still being evaluated — show as individual processing cards
  const processingScripts = visible
    .filter(s => s.status === 'processing' || s.status === 'queued')
    .map(s => ({
      id: s.id,
      title: s.title,
      format: s.declared_format,
      createdAt: s.created_at,
    }))

  const isProcessing = processingScripts.length > 0

  // Total qualifying opps across all scripts (for empty-state nudge)
  const totalQualifying = completedScripts.reduce((sum, s) => sum + s.qualifyingOpps.length, 0)

  // Available opportunities: opps the user qualifies for but hasn't applied to yet
  // Sorted by deadline urgency (soonest first, then no-deadline last)
  const availableOpps = allOpenOpps
    .filter(o => {
      if (appliedOppIds.has(o.id)) return false
      return completedScripts.some(s => {
        const ev = myEvalBySub.get(s.id)
        const score = ev?.weighted_score || null
        if (o.min_score && (!score || score < o.min_score)) return false
        const noFmt = !o.formats || o.formats.length === 0
        const noGenre = !o.genres || o.genres.length === 0
        if (noFmt && noGenre) return true
        const fmtMatch = noFmt || (s.format && o.formats!.some(f => f.toLowerCase() === s.format!.toLowerCase()))
        if (!fmtMatch) return false
        if (noGenre) return true
        const sGenres = myEvalBySub.get(s.id)?.genres || []
        if (sGenres.length === 0) return false
        const oppNorm = o.genres!.map(normGenre)
        return sGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
      })
    })
    .sort((a, b) => {
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (a.deadline) return -1
      if (b.deadline) return 1
      return 0
    })

  // Count qualifying scripts per opportunity (for "N scripts qualify" label)
  function countQualifyingScripts(opp: typeof allOpenOpps[0]) {
    return completedScripts.filter(s => {
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score || null
      if (opp.min_score && (!score || score < opp.min_score)) return false
      const noFmt = !opp.formats || opp.formats.length === 0
      const noGenre = !opp.genres || opp.genres.length === 0
      if (noFmt && noGenre) return true
      const fmtMatch = noFmt || (s.format && opp.formats!.some(f => f.toLowerCase() === s.format!.toLowerCase()))
      if (!fmtMatch) return false
      if (noGenre) return true
      const sGenres = ev?.genres || []
      if (sGenres.length === 0) return false
      const oppNorm = opp.genres!.map(normGenre)
      return sGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
    }).length
  }

  // Split applications into reviewed (with feedback) and pending
  const reviewedApps = allApplications.filter(a => a.status === 'reviewed' || a.review_stage === 'complete')
  const pendingApps = allApplications.filter(a => a.status !== 'reviewed' && a.review_stage !== 'complete')

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Best score per opportunity (for progress bars)
  function bestScoreForOpp(opp: typeof allOpenOpps[0]) {
    let best = 0
    for (const s of completedScripts) {
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score ?? 0
      if (score > best) best = score
    }
    return best
  }

  const totalHeat = (profile as any)?.heat_score ?? 0

  return (
    <>
      {/* UpgradeModalListener is in app layout — no duplicate needed here */}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />

      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── PROFILE HEADER ───────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[17px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
              {profile?.full_name || 'Welcome'}
            </h1>
            {isPro ? (
              <span
                className="inline-flex items-center text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-white px-1.5 py-0.5 rounded shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
              >
                Pro
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                Free
              </span>
            )}
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-400 shrink-0"
            title="Settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </Link>
        </div>

        {isTrial && <DashboardUpgradeBanner />}

        {/* ── STAT CARDS ───────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl px-4 py-4" style={{ background: '#f9fafb' }}>
            <p className="text-[13px] text-gray-400 m-0 mb-1">Scripts</p>
            <p className="text-[24px] font-medium text-gray-900 m-0 leading-none">{completedScripts.length + processingScripts.length}</p>
          </div>
          <div className="rounded-xl px-4 py-4" style={{ background: '#f9fafb' }}>
            <p className="text-[13px] text-gray-400 m-0 mb-1">Applications</p>
            <p className="text-[24px] font-medium text-gray-900 m-0 leading-none">{allApplications.length}</p>
          </div>
          <div className="rounded-xl px-4 py-4" style={{ background: '#fff7ed' }}>
            <p className="text-[13px] m-0 mb-1" style={{ color: '#9a3412' }}>Heat score</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-[48px] font-medium m-0 leading-none" style={{ color: '#ea580c' }}>{totalHeat}</p>
              <span className="text-[16px]">🔥</span>
            </div>
          </div>
        </div>

        {/* ── YOUR FEEDBACK (reskinned) ────────────────── */}
        {reviewedApps.length > 0 && (
          <section>
            <header className="flex items-end justify-between gap-3 mb-3">
              <h2 className="text-[12px] font-semibold text-gray-400 m-0 uppercase tracking-wide">Your feedback</h2>
              {allApplications.length > 2 && (
                <Link href="/review" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-0.5">
                  View all
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              )}
            </header>
            <div className="space-y-2.5">
              {reviewedApps.slice(0, 2).map(app => {
                const opp = oppMap.get(app.opportunity_id)
                const allNextSteps = app.next_steps_tags || []
                const heatEarned = (app as any).heat_earned ?? 0

                return (
                  <Link key={app.id} href={`/applications/${app.id}`} className="block">
                    <div
                      className="bg-white px-5 py-4 hover:shadow-sm transition-all"
                      style={{
                        border: '1px solid #e5e7eb',
                        borderLeft: '3px solid #7c3aed',
                        borderRadius: '0 12px 12px 0',
                      }}
                    >
                      {/* Title row + Pass badge + heat */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-[15px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
                            {opp?.title || 'Opportunity'}
                          </p>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                            Pass
                          </span>
                        </div>
                        {heatEarned > 0 && (
                          <span className="text-[12px] font-bold shrink-0" style={{ color: '#ea580c' }}>
                            +{heatEarned} 🔥
                          </span>
                        )}
                      </div>

                      {/* Producer feedback quote */}
                      {app.feedback && (
                        <p className="text-[13px] text-gray-500 m-0 mb-2.5 leading-relaxed line-clamp-2 italic">
                          &ldquo;{app.feedback}&rdquo;
                        </p>
                      )}

                      {/* Suggested next steps */}
                      {allNextSteps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {allNextSteps.map((tag: string, i: number) => (
                            <span
                              key={`n-${i}`}
                              className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ background: '#ede9fe', color: '#5b21b6' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid #f3f4f6' }}>
                        <span className="text-[12px] text-gray-400">
                          {app.reviewed_at ? fmtDate(app.reviewed_at) : fmtDate(app.submitted_at)}
                        </span>
                        <span className="text-[12px] font-semibold flex items-center gap-1" style={{ color: '#7c3aed' }}>
                          View details
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── PENDING APPLICATIONS ─────────────────────── */}
        {pendingApps.length > 0 && (
          <section>
            <header className="mb-3">
              <h2 className="text-[12px] font-semibold text-gray-400 m-0 uppercase tracking-wide">Pending</h2>
            </header>
            <div className="space-y-2">
              {pendingApps.map(app => {
                const opp = oppMap.get(app.opportunity_id)
                const stageMap: Record<string, { label: string; bg: string; color: string }> = {
                  pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
                  in_consideration: { label: 'In consideration', bg: '#ede9fe', color: '#5b21b6' },
                  shortlisted: { label: 'Shortlisted', bg: '#dbeafe', color: '#1e40af' },
                  partner_match: { label: 'Partner match', bg: '#d1fae5', color: '#065f46' },
                }
                const stage = stageMap[app.review_stage || 'pending'] || stageMap.pending
                return (
                  <Link key={app.id} href={`/applications/${app.id}`} className="block">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-purple-200 transition-colors flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{opp?.title || 'Opportunity'}</p>
                        <p className="text-[12px] text-gray-400 m-0 mt-0.5">Applied {fmtDate(app.submitted_at)}</p>
                      </div>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: stage.bg, color: stage.color }}
                      >
                        {stage.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── EMPTY STATE (no applications at all) ──────── */}
        {allApplications.length === 0 && (
          <section>
            <header className="mb-3">
              <h2 className="text-[12px] font-semibold text-gray-400 m-0 uppercase tracking-wide">Your applications</h2>
            </header>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-center">
              {totalQualifying > 0 ? (
                <>
                  <p className="text-[14px] font-semibold text-gray-900 m-0 mb-1">
                    You qualify for {allOpenOpps.length} open {allOpenOpps.length === 1 ? 'call' : 'calls'}
                  </p>
                  <p className="text-[13px] text-gray-400 m-0 mb-4">
                    Pick an opportunity and apply with one of your scripts.
                  </p>
                  <Link
                    href="/opportunities"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors hover:brightness-110"
                    style={{ background: '#7c3aed' }}
                  >
                    Browse opportunities
                  </Link>
                </>
              ) : completedScripts.length > 0 ? (
                <>
                  <p className="text-[14px] font-semibold text-gray-900 m-0 mb-1">No applications yet</p>
                  <p className="text-[13px] text-gray-400 m-0 mb-4">
                    Check opportunities to see what you qualify for.
                  </p>
                  <Link
                    href="/opportunities"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    View opportunities
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-semibold text-gray-900 m-0 mb-1">Upload a script</p>
                  <p className="text-[13px] text-gray-400 m-0">
                    Upload a script to get your report — then apply to opportunities.
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {/* ── AVAILABLE OPPORTUNITIES (with progress bars) ── */}
        {availableOpps.length > 0 && (
          <section>
            <header className="flex items-end justify-between gap-3 mb-3">
              <h2 className="text-[12px] font-semibold text-gray-400 m-0 uppercase tracking-wide">Available opportunities</h2>
              <Link href="/opportunities" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-0.5">
                See all
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </header>
            <div className="space-y-2.5">
              {availableOpps.slice(0, 3).map(opp => {
                const deadlineDays = opp.deadline
                  ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
                  : null
                const qCount = countQualifyingScripts(opp)
                const best = bestScoreForOpp(opp)

                return (
                  <Link key={opp.id} href={`/opportunities/${opp.slug}`} className="block group">
                    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-purple-200 hover:shadow-sm transition-all">
                      {/* Title + deadline */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className="text-[16px] font-bold text-gray-900 m-0 leading-snug group-hover:text-purple-700 transition-colors"
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {opp.title}
                        </h3>
                        {deadlineDays != null && deadlineDays > 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            deadlineDays <= 7
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-gray-50 text-gray-400 border border-gray-200'
                          }`}>
                            {deadlineDays === 1 ? 'Closes tomorrow' : deadlineDays <= 7 ? `${deadlineDays} days left` : new Date(opp.deadline!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {opp.description && (
                        <p className="text-[13px] text-gray-500 m-0 mb-3 line-clamp-2 leading-relaxed">{opp.description}</p>
                      )}

                      {/* Score progress bar */}
                      {opp.min_score != null && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] text-gray-400">Your best: {Math.round(best)}</span>
                            <span className="text-[12px] text-gray-400">Requires {Math.round(opp.min_score)}+</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.round((best / opp.min_score) * 100))}%`,
                                background: best >= opp.min_score ? '#22c55e' : '#f59e0b',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer: qualifying count + Apply */}
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-400 font-medium">
                          {qCount > 0 ? `${qCount} ${qCount === 1 ? 'script qualifies' : 'scripts qualify'}` : ''}
                        </span>
                        <span className="text-[13px] font-bold flex items-center gap-1 ml-auto" style={{ color: '#7c3aed' }}>
                          Apply
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── YOUR RECENT SCRIPTS ──────────────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-3">
            <h2 className="text-[12px] font-semibold text-gray-400 m-0 uppercase tracking-wide">Your recent scripts</h2>
            {completedScripts.length > 5 && (
              <Link href="/scripts" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-0.5">
                All
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            )}
          </header>

          {completedScripts.length === 0 && processingScripts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-[13px] text-gray-500 m-0">Upload a script to get your free report.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {processingScripts.map(script => (
                <DashboardScriptCard
                  key={script.id}
                  scriptId={script.id}
                  title={script.title}
                  format={script.format}
                  genre={null}
                  evaluationId={null}
                  createdAt={script.createdAt}
                  score={null}
                  qualifyingOpps={[]}
                  isProcessing={true}
                />
              ))}
              {completedScripts.slice(0, 5).map(script => {
                const sub = visible.find(v => v.id === script.id)
                return (
                  <DashboardScriptCard
                    key={script.id}
                    scriptId={script.id}
                    title={script.title}
                    format={script.format}
                    genre={script.genres[0] || null}
                    evaluationId={script.evaluationId}
                    createdAt={script.createdAt}
                    score={myEvalBySub.get(script.id)?.weighted_score ?? null}
                    qualifyingOpps={script.qualifyingOpps}
                    heatScore={sub?.heat_score || 0}
                    isPublic={!!sub?.is_public}
                  />
                )
              })}
              {completedScripts.length > 5 && (
                <Link href="/scripts" className="block text-center text-[12px] text-gray-400 hover:text-purple-600 font-semibold py-2">
                  All {completedScripts.length} scripts →
                </Link>
              )}
            </div>
          )}
        </section>

      </div>
    </>
  )
}
