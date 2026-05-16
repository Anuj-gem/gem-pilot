// /dashboard — value-loop dashboard.
//
// Same layout for anonymous + logged-in (empty states for anon).
// Hero: "What are you working on?" format selector → fires upload modal.
// Three value cards: Scripts Evaluated, Your Opportunities, 🔥 Industry Heat.
// Recent scripts with action checklist (apply + publish) and score pill.

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { FormatSelectorHero } from '@/components/dashboard/format-selector-hero'
import { OpportunityCard, type OppStatus } from '@/components/opportunities/opportunity-card'
import { DeleteScriptButton } from '@/components/dashboard/delete-script-button'
import { PendingActionsDropdown } from '@/components/dashboard/pending-actions-dropdown'
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
    heat_score: number | null
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
    created_at: string
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
    .select('id, title, slug, formats, genres, min_score, subtitle, description, deadline, budget_tiers, created_at')
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
      .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score')
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

  // ── ANONYMOUS USER: read script IDs from cookie ──
  if (!user) {
    const cookieStore = await cookies()
    const anonCookie = cookieStore.get('gem_anon_scripts')?.value
    if (anonCookie) {
      const anonIds = anonCookie.split(',').filter(Boolean)
      if (anonIds.length > 0) {
        const { data: anonSubs } = await service
          .from('script_submissions')
          .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score')
          .in('id', anonIds)
          .order('created_at', { ascending: false })
        visible = ((anonSubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
        submissionIds = visible.map((s) => s.id)

        if (submissionIds.length > 0) {
          const { data: anonEvs } = await service
            .from('script_evaluations')
            .select('id, submission_id, weighted_score, evaluation')
            .in('submission_id', submissionIds)
          for (const e of (anonEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
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
      }
    }
  }

  // Per-opp applied script tracking (which scripts have been submitted to which opps)
  const appliedScriptsByOpp = new Map<string, Set<string>>()
  const pendingOppIds = new Set<string>()

  if (user && allApplications.length > 0) {
    const considerationIds = allApplications.map(a => a.id)
    const { data: csRows } = await service
      .from('consideration_scripts')
      .select('script_id, consideration_id')
      .in('consideration_id', considerationIds)

    const considerationToOpp = new Map(allApplications.map(a => [a.id, a.opportunity_id]))
    for (const row of (csRows || []) as { script_id: string; consideration_id: string }[]) {
      const oppId = considerationToOpp.get(row.consideration_id)
      if (!oppId) continue
      if (!appliedScriptsByOpp.has(oppId)) appliedScriptsByOpp.set(oppId, new Set())
      appliedScriptsByOpp.get(oppId)!.add(row.script_id)
    }

    for (const app of allApplications) {
      if (app.status !== 'reviewed' && app.review_stage !== 'complete') {
        pendingOppIds.add(app.opportunity_id)
      }
    }
  }

  // Usage gate data for guest users
  const FREE_EVAL_LIMIT = 2
  const FREE_APP_LIMIT = 2
  let totalSubmissions = 0
  let totalApps = 0
  if (user && !isPro) {
    const { count: subCount } = await service
      .from('script_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    totalSubmissions = subCount ?? 0
    totalApps = allApplications.length
  } else if (!user) {
    // Anonymous: count from cookie
    totalSubmissions = visible.length
  }
  const evalsRemaining = Math.max(0, FREE_EVAL_LIMIT - totalSubmissions)
  const appsRemaining = Math.max(0, FREE_APP_LIMIT - totalApps)

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
        heat: s.heat_score ?? 0,
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

  // Filter out opps with pending applications — but keep previously-applied opps (can apply more scripts)
  const unappliedOpps = allOpenOpps.filter(o => !pendingOppIds.has(o.id))
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

  // Always show 3 opps: qualified first, then unqualified, then fill with most-recent-posted
  const combinedOpps = [...qualifiedOpps, ...unqualifiedOpps]
  // If we don't have 3, fill from non-pending opps sorted by created_at (most recent first)
  if (combinedOpps.length < 3) {
    const shown = new Set(combinedOpps.map(o => o.id))
    const filler = unappliedOpps
      .filter(o => !shown.has(o.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    for (const o of filler) {
      if (combinedOpps.length >= 3) break
      combinedOpps.push(o)
    }
  }
  const dashboardOpps = combinedOpps.slice(0, 3)
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

  // Get matching scripts for an opportunity (for OppScriptDropdown)
  // Excludes scripts already applied to THIS specific opp
  function getMatchingScriptsForOpp(opp: OppRow) {
    const alreadyAppliedScripts = appliedScriptsByOpp.get(opp.id) || new Set<string>()
    return completedScripts.filter(s => {
      if (alreadyAppliedScripts.has(s.id)) return false
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
    }).map(s => ({ id: s.id, title: s.title, score: s.score ? Math.round(s.score) : null }))
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

        {/* ── HERO — landing for fresh anon visitors, upload flow otherwise ── */}
        <FormatSelectorHero evalsRemaining={isPro ? 99 : evalsRemaining} />

        {/* ── THREE VALUE CARDS ── */}
        <section className="grid grid-cols-3 gap-2 lg:gap-3">

          {/* Scripts Evaluated */}
          <Link href="/scripts" className="block rounded-xl bg-white px-3 py-3 lg:px-4 lg:py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
              <span className="text-[14px] lg:text-[16px]">📄</span>
              <span className="text-[11px] lg:text-[13px] font-semibold text-gray-500">Scripts</span>
            </div>
            <div className="text-[24px] lg:text-[28px] font-bold text-gray-900 leading-none mb-1 lg:mb-1.5">
              {scriptCount}
            </div>
            {/* Detail rows — desktop only */}
            {completedScripts.length > 0 ? (
              <>
                <div className="hidden lg:block space-y-0.5">
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
                <span className="text-[11px] lg:text-[12px] font-medium text-purple-600">View all →</span>
              </>
            ) : (
              <p className="text-[11px] lg:text-[13px] text-gray-500 m-0">Upload to get started</p>
            )}
          </Link>

          {/* Your Opportunities */}
          <Link href="/review" className="block rounded-xl bg-white px-3 py-3 lg:px-4 lg:py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
              <span className="text-[14px] lg:text-[16px]">💰</span>
              <span className="text-[11px] lg:text-[13px] font-semibold text-gray-500">Opportunities</span>
            </div>
            <div className="text-[24px] lg:text-[28px] font-bold text-gray-900 leading-none mb-1 lg:mb-1.5">
              {user ? pendingCount : 0}
              <span className="text-[11px] lg:text-[13px] font-medium text-gray-400 ml-1">pending</span>
            </div>
            {/* Detail rows — desktop only */}
            {user && pendingApps.length > 0 ? (
              <>
                <div className="hidden lg:block space-y-0.5">
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
                <span className="text-[11px] lg:text-[12px] font-medium text-purple-600">View all →</span>
              </>
            ) : (
              <p className="text-[11px] lg:text-[13px] text-gray-500 m-0">Apply below</p>
            )}
          </Link>

          {/* Industry Heat */}
          <Link href="/review" className="block rounded-xl bg-white px-3 py-3 lg:px-4 lg:py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
              <span className="text-[14px] lg:text-[16px]">🔥</span>
              <span className="text-[11px] lg:text-[13px] font-semibold text-gray-500">Heat</span>
            </div>
            <div className="text-[24px] lg:text-[28px] font-bold text-gray-900 leading-none mb-1 lg:mb-1.5">
              {user ? totalHeat : 0}
            </div>
            {/* Detail rows — desktop only */}
            {user && reviewedApps.length > 0 ? (
              <>
                <div className="hidden lg:block space-y-0.5">
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
                <span className="text-[11px] lg:text-[12px] font-medium text-purple-600">View all →</span>
              </>
            ) : (
              <p className="text-[11px] lg:text-[13px] text-gray-500 m-0">Earn heat from reviews</p>
            )}
          </Link>

        </section>

        {/* ── OPPORTUNITIES FOR YOU — 3-column grid ── */}
        <section>
          <header className="flex items-center gap-2 mb-3">
            <h2 className="text-[16px] font-bold text-gray-900 m-0">Opportunities for you</h2>
            {user && !isPro && (
              <span className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: appsRemaining > 0 ? '#f3f4f6' : '#fef2f2', color: appsRemaining > 0 ? '#6b7280' : '#dc2626' }}>
                {appsRemaining > 0 ? `${appsRemaining} application${appsRemaining === 1 ? '' : 's'} remaining` : 'Limit reached'}
              </span>
            )}
            <Link href="/opportunities" className="text-[13px] font-medium text-purple-600 hover:text-purple-800 transition-colors">
              View all →
            </Link>
          </header>

          {dashboardOpps.length === 0 && pendingOppIds.size > 0 ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ boxShadow: cardShadow }}>
              <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">You&apos;ve applied to all open opportunities</p>
              <p className="text-[13px] text-gray-500 m-0">We&apos;ll notify you when new opportunities open up.</p>
            </div>
          ) : dashboardOpps.length === 0 ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ boxShadow: cardShadow }}>
              <p className="text-[13px] text-gray-500 m-0">No opportunities right now. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {dashboardOpps.map(opp => {
                const status: OppStatus = pendingOppIds.has(opp.id) ? 'pending' : appliedOppIds.has(opp.id) ? 'previously_applied' : 'available'
                const matchCount = getMatchingScriptsForOpp(opp).length

                return (
                  <OpportunityCard
                    key={opp.id}
                    id={opp.id}
                    slug={opp.slug}
                    title={opp.title}
                    subtitle={opp.subtitle}
                    description={opp.description}
                    genres={opp.genres || []}
                    formats={opp.formats || []}
                    createdAt={opp.created_at}
                    deadline={opp.deadline}
                    status={status}
                    matchingScriptCount={matchCount}
                    isAnon={!user}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* ── YOUR SCRIPTS — 2-column grid ── */}
        <section>
          <header className="flex items-center gap-2 mb-3">
            <h2 className="text-[16px] font-bold text-gray-900 m-0">Your scripts</h2>
            {!isPro && (
              <span className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: evalsRemaining > 0 ? '#f3f4f6' : '#fef2f2', color: evalsRemaining > 0 ? '#6b7280' : '#dc2626' }}>
                {evalsRemaining > 0 ? `${evalsRemaining} eval${evalsRemaining === 1 ? '' : 's'} remaining` : 'Limit reached'}
              </span>
            )}
            {completedScripts.length > 2 && (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Processing scripts */}
              {processingScripts.slice(0, 2).map(script => (
                <div key={script.id} className="rounded-xl bg-white p-3 lg:p-4 flex flex-col" style={{ boxShadow: cardShadow }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] lg:text-[15px] font-semibold text-gray-900 truncate">{script.title}</span>
                    <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#e9d5ff" strokeWidth="2.5" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[12px] lg:text-[13px] text-gray-500 m-0 mt-1">Evaluating your script...</p>
                </div>
              ))}

              {/* Completed script cards */}
              {completedScripts.slice(0, 2 - processingScripts.length).map(script => {
                const rounded = script.score ? Math.round(script.score) : null
                const reportHref = script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'

                return (
                  <div key={script.id} className="relative rounded-xl bg-white group hover:shadow-md transition-shadow flex flex-col"
                    style={{ boxShadow: cardShadow }}>

                    <div className="relative p-3 lg:p-5 flex flex-col flex-1">

                      {/* Row 1: Title + 3-dot menu */}
                      <div className="flex justify-between items-start gap-2 mb-1 lg:mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] lg:text-[17px] font-bold text-gray-900 m-0 leading-snug truncate group-hover:text-purple-700 transition-colors">
                            {script.title}
                          </h3>
                          <p className="text-[12px] lg:text-[13px] text-gray-500 m-0 mt-0.5">
                            {[script.format, script.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase())].filter(Boolean).join(' / ')}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <DeleteScriptButton scriptId={script.id} title={script.title} />
                        </div>
                      </div>

                      {/* Logline */}
                      {script.logline && (
                        <p className="text-[12px] lg:text-[13px] leading-relaxed text-gray-500 m-0 mb-2.5 lg:mb-3 line-clamp-2">
                          {script.logline}
                        </p>
                      )}

                      {/* Score + Heat pills */}
                      <div className="flex items-center gap-2 lg:gap-2.5 mb-3 lg:mb-4">
                        {/* Score pill with gem diamond */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full" style={{ background: '#EEEDFE' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 w-[13px] h-[13px] lg:w-[15px] lg:h-[15px]">
                            <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="url(#gem-score-grad1)" />
                            <path d="M12 2L4 9H20L12 2Z" fill="url(#gem-score-grad2)" opacity="0.7" />
                            <path d="M8 9H16L12 22L8 9Z" fill="url(#gem-score-grad3)" />
                            <defs>
                              <linearGradient id="gem-score-grad1" x1="4" y1="2" x2="20" y2="22"><stop stopColor="#AFA9EC" /><stop offset="1" stopColor="#534AB7" /></linearGradient>
                              <linearGradient id="gem-score-grad2" x1="4" y1="2" x2="20" y2="9"><stop stopColor="#CECBF6" /><stop offset="1" stopColor="#7F77DD" /></linearGradient>
                              <linearGradient id="gem-score-grad3" x1="12" y1="9" x2="12" y2="22"><stop stopColor="#7F77DD" /><stop offset="1" stopColor="#3C3489" /></linearGradient>
                            </defs>
                          </svg>
                          <span className="text-[12px] lg:text-[13px] font-semibold" style={{ color: '#3C3489' }}>
                            Score {rounded ?? '—'}
                          </span>
                        </div>
                        {/* Heat pill with fire emoji */}
                        <div className="inline-flex items-center gap-1 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full" style={{ background: '#FFF3E0' }}>
                          <span className="text-[12px] lg:text-[14px]">🔥</span>
                          <span className="text-[12px] lg:text-[13px] font-semibold" style={{ color: '#E65100' }}>
                            Heat {script.heat}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1" />

                      {/* Bottom row: Pending actions (left) + View report (right) */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 lg:pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <PendingActionsDropdown
                          scriptId={script.id}
                          isPublic={script.isPublic}
                          isPro={isPro}
                          isAnon={!user}
                          qualifyingOppsCount={script.qualifyingOpps.length}
                        />
                        <Link
                          href={reportHref}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-[12px] lg:text-[13px] font-semibold text-white no-underline transition-all hover:opacity-90"
                          style={{ background: '#534AB7' }}
                        >
                          View report
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="w-[13px] h-[13px] lg:w-[14px] lg:h-[14px]">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638l-3.96-4.158a.75.75 0 011.08-1.04l5.25 5.5a.75.75 0 010 1.04l-5.25 5.5a.75.75 0 11-1.08-1.04l3.96-4.158H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                          </svg>
                        </Link>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </>
  )
}
