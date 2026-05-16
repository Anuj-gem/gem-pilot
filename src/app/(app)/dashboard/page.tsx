// /dashboard — value-loop dashboard.
//
// Same layout for anonymous + logged-in (empty states for anon).
// Hero: "What are you working on?" format selector → fires upload modal.
// Three value cards: Scripts Evaluated, Your Opportunities, 🔥 Industry Heat.
// Recent scripts with action checklist (apply + publish) and score pill.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { FormatSelectorHero } from '@/components/dashboard/format-selector-hero'
import { QuickApplyDropdown } from '@/components/dashboard/quick-apply-dropdown'
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
  const service = svc()

  // ── DATA QUERIES ──

  let profile: { subscription_status: string | null; full_name: string | null; handle: string | null; avatar_url: string | null; heat_score: number | null; headline: string | null } | null = null
  let isPro = false

  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; is_public: boolean | null
  }
  let visible: MySubRow[] = []
  let submissionIds: string[] = []

  function normGenre(g: string | null | undefined): string {
    return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  type FeedEval = { id: string; weighted_score: number | null; genres: string[]; format: string | null; logline: string | null }
  const myEvalBySub = new Map<string, FeedEval>()

  type OppRow = {
    id: string; title: string; slug: string
    formats: string[] | null; genres: string[] | null; min_score: number | null
    subtitle: string | null; description: string | null
    deadline: string | null; budget_tiers: string[] | null
  }
  let allOpenOpps: OppRow[] = []

  type AppRow = {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null; writer_response: string | null
    heat_earned: number
  }
  let allApplications: AppRow[] = []

  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres, min_score, subtitle, description, deadline, budget_tiers')
    .eq('status', 'active')
  allOpenOpps = (openOpps || []) as OppRow[]

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('subscription_status, full_name, handle, avatar_url, heat_score, headline')
      .eq('id', user.id)
      .single()
    profile = p
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'

    const { data: mySubs } = await supabase
      .from('script_submissions')
      .select('id, title, status, declared_format, created_at, hidden_at, is_public')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
    submissionIds = visible.map((s) => s.id)

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
        const logline = (evJson?.positioning_hook as string) || (cls.logline as string) || null
        myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: Array.from(genreSet), format, logline })
      }
    }

    const { data: applications } = await service
      .from('considerations')
      .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, writer_response, heat_earned')
      .eq('writer_id', user.id)
      .not('opportunity_id', 'is', null)
      .order('submitted_at', { ascending: false })
    allApplications = (applications || []) as AppRow[]
  }

  // ── DERIVED DATA ──

  const appliedOppIds = new Set(allApplications.map(a => a.opportunity_id))
  const oppMap = new Map(allOpenOpps.map(o => [o.id, o]))

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

  const completedScripts = visible
    .filter(s => s.status === 'completed')
    .map(s => {
      const ev = myEvalBySub.get(s.id)
      const qualifyingOpps = getQualifyingOpps(ev?.format || s.declared_format, ev?.genres || [], ev?.weighted_score || null)
        .filter(o => !appliedOppIds.has(o.id))
      return {
        id: s.id,
        title: s.title,
        format: ev?.format || s.declared_format,
        genres: ev?.genres || [],
        score: ev?.weighted_score ?? null,
        evaluationId: ev?.id ?? null,
        createdAt: s.created_at,
        qualifyingOpps: qualifyingOpps.map(o => ({ id: o.id, title: o.title, slug: o.slug, subtitle: o.subtitle })),
        isPublic: s.is_public ?? false,
        logline: ev?.logline ?? null,
      }
    })

  const processingScripts = visible
    .filter(s => s.status === 'processing' || s.status === 'queued')
    .map(s => ({ id: s.id, title: s.title, format: s.declared_format, createdAt: s.created_at }))

  const isProcessing = processingScripts.length > 0

  const reviewedApps = allApplications.filter(a => a.status === 'reviewed' || a.review_stage === 'complete')
  const pendingApps = allApplications.filter(a => a.status !== 'reviewed' && a.review_stage !== 'complete')

  const totalHeat = (profile as any)?.heat_score ?? 0
  const scriptCount = completedScripts.length + processingScripts.length
  const pendingCount = pendingApps.length

  function scoreBadge(s: number): { bg: string } {
    if (s >= 80) return { bg: '#059669' }
    if (s >= 60) return { bg: '#7c3aed' }
    if (s >= 40) return { bg: '#d97706' }
    return { bg: '#9ca3af' }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const appliedOppIdsArr = Array.from(appliedOppIds)

  // ── OPPORTUNITIES FOR YOU: filter out applied, sort qualified first then recency ──
  // Check if ANY completed script qualifies for a given opp
  function anyScriptQualifies(opp: OppRow) {
    return completedScripts.some(s => {
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score ?? null
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
    })
  }

  const unappliedOpps = allOpenOpps.filter(o => !appliedOppIds.has(o.id))
  const qualifiedOpps = unappliedOpps.filter(o => anyScriptQualifies(o))
  const unqualifiedOpps = unappliedOpps.filter(o => !anyScriptQualifies(o))

  // Sort each group by deadline (soonest first), then no-deadline last
  const sortByDeadline = (a: OppRow, b: OppRow) => {
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  }
  qualifiedOpps.sort(sortByDeadline)
  unqualifiedOpps.sort(sortByDeadline)

  const dashboardOpps = [...qualifiedOpps, ...unqualifiedOpps].slice(0, 4)
  const qualifiedOppIds = new Set(qualifiedOpps.map(o => o.id))

  // Count how many scripts match each opp
  function matchingScriptCount(opp: OppRow) {
    return completedScripts.filter(s => {
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score ?? null
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

  // ── RENDER ──

  const cardShadow = '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)'

  return (
    <>
      {user && submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />

      <div className="space-y-5">

        {/* ── FORMAT SELECTOR HERO ── */}
        <FormatSelectorHero />

        {/* ── THREE VALUE CARDS ── */}
        <section className="grid grid-cols-3 gap-3">

          {/* Scripts Evaluated */}
          <div className="rounded-xl bg-white px-4 py-3.5" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[16px]">📄</span>
              <span className="text-[13px] font-semibold text-gray-500">Scripts Evaluated</span>
            </div>
            <div className="text-[28px] font-bold text-gray-900 leading-none mb-1.5">
              {user ? scriptCount : 0}
            </div>
            {user && completedScripts.length > 0 ? (
              <div className="space-y-0.5">
                {completedScripts.slice(0, 2).map(s => {
                  const r = s.score ? Math.round(s.score) : null
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-gray-700 truncate">{s.title}</span>
                      {r && (
                        <span className="text-[12px] font-bold text-white px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: scoreBadge(r).bg }}>{r}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] text-gray-500 m-0">Upload a script to get started</p>
            )}
          </div>

          {/* Your Opportunities */}
          <Link href="/review" className="block rounded-xl bg-white px-4 py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[16px]">💰</span>
              <span className="text-[13px] font-semibold text-gray-500">Your Opportunities</span>
            </div>
            <div className="text-[28px] font-bold text-gray-900 leading-none mb-1.5">
              {user ? pendingCount : 0}
              <span className="text-[13px] font-medium text-gray-400 ml-1.5">pending</span>
            </div>
            {user && pendingApps.length > 0 ? (
              <div className="space-y-0.5">
                {pendingApps.slice(0, 2).map(app => {
                  const opp = oppMap.get(app.opportunity_id)
                  return (
                    <div key={app.id} className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-gray-700 truncate">{opp?.title || 'Opportunity'}</span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: '#fef3c7', color: '#92400e' }}>Pending</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] text-gray-500 m-0">Apply to opportunities below</p>
            )}
          </Link>

          {/* Industry Heat */}
          <Link href="/review" className="block rounded-xl bg-white px-4 py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[16px]">🔥</span>
              <span className="text-[13px] font-semibold text-gray-500">Industry Heat</span>
            </div>
            <div className="text-[28px] font-bold text-gray-900 leading-none mb-1.5">
              {user ? totalHeat : 0}
            </div>
            {user && reviewedApps.length > 0 ? (
              <div className="space-y-0.5">
                {reviewedApps.slice(0, 2).map(app => {
                  const opp = oppMap.get(app.opportunity_id)
                  return (
                    <div key={app.id} className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-gray-700 truncate">{opp?.title || 'Review'}</span>
                      {app.heat_earned > 0 && (
                        <span className="text-[12px] font-bold shrink-0" style={{ color: '#ea580c' }}>+{app.heat_earned}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] text-gray-500 m-0">Earn heat from reviews</p>
            )}
          </Link>

        </section>

        {/* ── YOUR SCRIPTS — 3-column grid ── */}
        <section>
          <header className="flex items-center gap-2 mb-3">
            <h2 className="text-[16px] font-bold text-gray-900 m-0">Your scripts</h2>
            {completedScripts.length > 3 && (
              <Link href="/scripts" className="text-[13px] font-medium text-purple-600 hover:text-purple-800 transition-colors">
                View all →
              </Link>
            )}
          </header>

          {completedScripts.length === 0 && processingScripts.length === 0 ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ boxShadow: cardShadow }}>
              <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No scripts yet</p>
              <p className="text-[13px] text-gray-500 m-0">Upload a screenplay above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* Processing scripts */}
              {processingScripts.slice(0, 3).map(script => (
                <div key={script.id} className="rounded-xl bg-white p-4 flex flex-col" style={{ boxShadow: cardShadow }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[14px] font-semibold text-gray-900 truncate">{script.title}</span>
                    <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#e9d5ff" strokeWidth="2.5" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-gray-500 m-0">Evaluating your script...</p>
                </div>
              ))}

              {/* Completed script cards */}
              {completedScripts.slice(0, 3 - processingScripts.length).map(script => {
                const rounded = script.score ? Math.round(script.score) : null
                const badge = rounded ? scoreBadge(rounded) : null
                const reportHref = script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'

                return (
                  <div key={script.id} className="relative rounded-xl bg-white overflow-hidden group hover:shadow-md transition-shadow flex flex-col"
                    style={{ boxShadow: cardShadow }}>

                    {/* Full-card link (behind everything) */}
                    <Link href={reportHref} className="absolute inset-0 z-0" aria-label={`View report for ${script.title}`} />

                    <div className="relative z-10 p-4 flex flex-col flex-1 pointer-events-none">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-[15px] font-semibold text-gray-900 m-0 leading-snug truncate group-hover:text-purple-700 transition-colors">
                          {script.title}
                        </h3>
                        {/* Two-line GEM Score badge */}
                        {badge && rounded && (
                          <div className="shrink-0 text-center rounded-lg px-2.5 py-1.5" style={{ background: badge.bg }}>
                            <div className="text-[9px] font-semibold text-white/80 uppercase leading-none tracking-wide">GEM Score</div>
                            <div className="text-[18px] font-bold text-white leading-tight">{rounded}</div>
                          </div>
                        )}
                      </div>

                      {/* Logline */}
                      {script.logline && (
                        <p className="text-[13px] leading-snug text-gray-700 m-0 mb-2 line-clamp-2">
                          {script.logline}
                        </p>
                      )}

                      {/* Format · Genre */}
                      <div className="text-[13px] font-medium text-gray-500 mb-3">
                        {[script.format, script.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase())].filter(Boolean).join(' · ')}
                      </div>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Actions row — pointer events enabled */}
                      <div className="flex items-center gap-2 pointer-events-auto pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <Link href={reportHref}
                          className="text-[13px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
                          View report →
                        </Link>
                        <div className="flex-1" />
                        {script.qualifyingOpps.length > 0 && (
                          <QuickApplyDropdown
                            scriptId={script.id}
                            opportunities={script.qualifyingOpps}
                            appliedOppIds={appliedOppIdsArr}
                          />
                        )}
                        {script.isPublic ? (
                          <span className="text-[12px] font-semibold text-emerald-600">✓ Published</span>
                        ) : (
                          <Link href={reportHref}
                            className="text-[12px] font-semibold text-gray-400 hover:text-purple-600 transition-colors">
                            Publish to Industry
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── OPPORTUNITIES FOR YOU — 3-column grid ── */}
        <section>
          <header className="flex items-center gap-2 mb-3">
            <h2 className="text-[16px] font-bold text-gray-900 m-0">Opportunities for you</h2>
            <Link href="/opportunities" className="text-[13px] font-medium text-purple-600 hover:text-purple-800 transition-colors">
              View all →
            </Link>
          </header>

          {dashboardOpps.length === 0 ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ boxShadow: cardShadow }}>
              <p className="text-[13px] text-gray-500 m-0">No opportunities right now. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {dashboardOpps.slice(0, 3).map(opp => {
                const matchCount = matchingScriptCount(opp)

                return (
                  <Link key={opp.id} href={`/opportunities/${opp.slug}`} className="block group">
                    <div className="rounded-xl bg-white overflow-hidden h-full hover:shadow-md transition-shadow flex flex-col"
                      style={{ boxShadow: cardShadow }}>

                      {/* Card body */}
                      <div className="p-4 flex-1 flex flex-col">

                        {/* 💰 Paid badge — top right */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-bold px-2 py-0.5 rounded"
                            style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                            💰 Paid
                          </span>
                          {opp.deadline && (
                            <span className="text-[12px] text-gray-500">
                              Due {new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-[15px] font-bold text-gray-900 m-0 mb-2 leading-snug group-hover:text-purple-700 transition-colors">
                          {opp.title}
                        </h3>

                        {/* Format + Genre as labeled lines */}
                        <div className="space-y-0.5 mb-2">
                          {opp.formats && opp.formats.length > 0 && (
                            <div className="text-[13px] text-gray-700">
                              <span className="text-gray-400">Format:</span> {opp.formats.join(', ')}
                            </div>
                          )}
                          {opp.genres && opp.genres.length > 0 && (
                            <div className="text-[13px] text-gray-700">
                              <span className="text-gray-400">Genre:</span> {opp.genres.slice(0, 3).join(', ')}
                            </div>
                          )}
                        </div>

                        {/* Subtitle / description */}
                        {(opp.subtitle || opp.description) && (
                          <p className="text-[13px] text-gray-600 m-0 line-clamp-2 leading-snug">
                            {opp.subtitle || opp.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom bar — View details + match count */}
                      <div className="px-4 py-2.5 flex items-center justify-between"
                        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <span className="text-[13px] font-semibold text-purple-600 group-hover:text-purple-800 transition-colors">
                          View details →
                        </span>
                        {matchCount > 0 && (
                          <span className="text-[12px] font-semibold text-purple-600">
                            {matchCount} {matchCount === 1 ? 'script matches' : 'scripts match'}
                          </span>
                        )}
                      </div>

                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </>
  )
}
