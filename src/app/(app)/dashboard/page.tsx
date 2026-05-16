// /dashboard — value-loop dashboard.
//
// Same layout for anonymous + logged-in (empty states for anon).
// Hero: "What are you working on?" format selector → fires upload modal.
// Three value cards: Scripts Evaluated, Your Applications, 🔥 Industry Heat.
// Recent scripts with one-click apply dropdowns.

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

  // ── DATA QUERIES (logged-in only; anon gets empty defaults) ──

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

  // Fetch opportunities for everyone (anon needs them for empty-state context)
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

    // Scripts
    const { data: mySubs } = await supabase
      .from('script_submissions')
      .select('id, title, status, declared_format, created_at, hidden_at, is_public')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
    submissionIds = visible.map((s) => s.id)

    // Evaluations
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

    // Applications (considerations with opportunity_id)
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

  // All applied opp IDs as array for QuickApplyDropdown
  const appliedOppIdsArr = Array.from(appliedOppIds)

  // ── RENDER ──

  return (
    <>
      {user && submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />

      <div className="space-y-8">

        {/* ── FORMAT SELECTOR HERO ── */}
        <section>
          <FormatSelectorHero />
        </section>

        {/* ── THREE VALUE CARDS ── */}
        <section className="grid grid-cols-3 gap-3">

          {/* Card 1: Scripts Evaluated */}
          <div className="rounded-2xl bg-white px-5 py-4"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Scripts Evaluated</div>
            <div className="text-[28px] font-bold text-gray-900 leading-none mb-2">
              {user ? scriptCount : 0}
            </div>
            {user && completedScripts.length > 0 ? (
              <div className="space-y-1">
                {completedScripts.slice(0, 2).map(s => {
                  const rounded = s.score ? Math.round(s.score) : null
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-gray-600 truncate">{s.title}</span>
                      {rounded && (
                        <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: scoreBadge(rounded).bg }}>
                          {rounded}
                        </span>
                      )}
                    </div>
                  )
                })}
                {completedScripts.length > 2 && (
                  <Link href="/scripts" className="text-[11px] font-medium text-purple-600 hover:text-purple-800 transition-colors">
                    View all →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-gray-400 m-0">Upload a script to get started</p>
            )}
          </div>

          {/* Card 2: Your Applications */}
          <div className="rounded-2xl bg-white px-5 py-4"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Your Applications</div>
            <div className="text-[28px] font-bold text-gray-900 leading-none mb-2">
              {user ? pendingCount : 0}
              <span className="text-[13px] font-medium text-gray-400 ml-1.5">pending</span>
            </div>
            {user && pendingApps.length > 0 ? (
              <div className="space-y-1">
                {pendingApps.slice(0, 2).map(app => {
                  const opp = oppMap.get(app.opportunity_id)
                  return (
                    <div key={app.id} className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-gray-600 truncate">
                        {opp?.title || 'Application'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: '#fef3c7', color: '#92400e' }}>
                        Pending
                      </span>
                    </div>
                  )
                })}
                {allApplications.length > 2 && (
                  <Link href="/applications" className="text-[11px] font-medium text-purple-600 hover:text-purple-800 transition-colors">
                    View all →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-gray-400 m-0">Apply to opportunities below</p>
            )}
          </div>

          {/* Card 3: 🔥 Industry Heat */}
          <div className="rounded-2xl bg-white px-5 py-4"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">🔥 Industry Heat</div>
            <div className="text-[28px] font-bold text-gray-900 leading-none mb-2">
              {user ? totalHeat : 0}
            </div>
            {user && reviewedApps.length > 0 ? (
              <div className="space-y-1">
                {reviewedApps.slice(0, 2).map(app => {
                  const opp = oppMap.get(app.opportunity_id)
                  return (
                    <Link key={app.id} href={`/applications/${app.id}`}
                      className="flex items-center justify-between gap-2 group">
                      <span className="text-[12px] text-gray-600 truncate group-hover:text-purple-600 transition-colors">
                        {opp?.title || 'Review'}
                      </span>
                      {app.heat_earned > 0 && (
                        <span className="text-[11px] font-bold shrink-0" style={{ color: '#ea580c' }}>
                          +{app.heat_earned} 🔥
                        </span>
                      )}
                    </Link>
                  )
                })}
                {reviewedApps.length > 2 && (
                  <Link href="/applications" className="text-[11px] font-medium text-purple-600 hover:text-purple-800 transition-colors">
                    View details →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-gray-400 m-0">Earn heat from reviews</p>
            )}
          </div>

        </section>

        {/* ── RECENT SCRIPTS ── */}
        <section>
          <header className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-[16px] font-bold text-gray-900 m-0">Your scripts</h2>
            {completedScripts.length > 3 && (
              <Link href="/scripts" className="text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                View all
              </Link>
            )}
          </header>

          {completedScripts.length === 0 && processingScripts.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-10 text-center"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: '#f5f3ff' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No scripts yet</p>
              <p className="text-[13px] text-gray-400 m-0">Upload a screenplay above to get your first evaluation.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>

              {/* Processing scripts */}
              {processingScripts.map((script, i) => (
                <div key={script.id} className="px-5 py-4"
                  style={{ borderBottom: (i < processingScripts.length - 1 || completedScripts.length > 0) ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #ede9fe, #f5f3ff)' }}>
                      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#e9d5ff" strokeWidth="2.5" />
                        <path d="M12 2a10 10 0 019.95 9" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-gray-900 truncate">{script.title}</div>
                      <div className="text-[13px] text-gray-400 mt-0.5">Evaluating...</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Completed scripts with one-click apply */}
              {completedScripts.slice(0, 5).map((script, i) => {
                const roundedScore = script.score ? Math.round(script.score) : null
                const badge = roundedScore ? scoreBadge(roundedScore) : { bg: '#d1d5db' }

                return (
                  <div key={script.id} className="px-5 py-4 group transition-colors hover:bg-gray-50/50"
                    style={{ borderBottom: i < Math.min(completedScripts.length, 5) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <div className="flex items-start gap-4">
                      {/* Score badge */}
                      <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0 text-[16px] font-bold text-white"
                        style={{ background: badge.bg }}>
                        {roundedScore ?? '—'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold text-gray-900 truncate">{script.title}</div>

                        {script.logline && (
                          <p className="text-[13px] leading-relaxed text-gray-500 m-0 mt-1 line-clamp-2">
                            {script.logline}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[12px] text-gray-400">
                            {[script.format, script.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase()), fmtDate(script.createdAt)].filter(Boolean).join(' · ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          {script.evaluationId && (
                            <Link href={`/report/${script.evaluationId}`}
                              className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
                              View report →
                            </Link>
                          )}
                          {!script.isPublic && (
                            <Link href={script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'}
                              className="text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                              Publish to Industry
                            </Link>
                          )}
                        </div>

                        {/* One-click apply dropdown */}
                        <QuickApplyDropdown
                          scriptId={script.id}
                          opportunities={script.qualifyingOpps}
                          appliedOppIds={appliedOppIdsArr}
                          className="mt-2.5"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── OPPORTUNITIES ── */}
        <section>
          <header className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-[16px] font-bold text-gray-900 m-0">Opportunities</h2>
            <Link href="/opportunities" className="text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
              View all
            </Link>
          </header>

          {allOpenOpps.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-10 text-center"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
              <p className="text-[14px] text-gray-400 m-0">No opportunities right now. Check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {allOpenOpps.slice(0, 4).map(opp => {
                const isApplied = appliedOppIds.has(opp.id)
                const deadlineDays = opp.deadline
                  ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
                  : null

                return (
                  <Link key={opp.id} href={`/opportunities/${opp.slug}`} className="block group">
                    <div className="rounded-2xl bg-white px-5 py-4 transition-shadow duration-150 hover:shadow-md"
                      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-start gap-4">
                        <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                          style={{ background: isApplied ? '#059669' : '#e5e7eb' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-[15px] font-semibold text-gray-900 m-0 leading-snug group-hover:text-purple-700 transition-colors">
                              {opp.title}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isApplied && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                  style={{ background: '#059669' }}>
                                  Applied ✓
                                </span>
                              )}
                              {deadlineDays != null && deadlineDays > 0 && deadlineDays <= 14 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: deadlineDays <= 7 ? '#dc2626' : '#d97706',
                                    color: 'white',
                                  }}>
                                  {deadlineDays === 1 ? 'Closes tomorrow' : `${deadlineDays}d left`}
                                </span>
                              )}
                            </div>
                          </div>
                          {(opp.subtitle || opp.description) && (
                            <p className="text-[13px] text-gray-500 m-0 mb-2 line-clamp-2 leading-relaxed">
                              {opp.subtitle || opp.description}
                            </p>
                          )}
                          <span className="text-[12px] font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            View details →
                          </span>
                        </div>
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
