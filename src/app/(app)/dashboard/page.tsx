// /dashboard — unified dashboard for writers and producers.
//
// Layout: top row (profile + CTA) → stat cards → tabbed content.
// Writers get Scripts + Applications tabs.
// Producers get a third "Manage" tab showing applications to their opportunities.

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { AnonSignupPrompt } from '@/components/dashboard/anon-signup-prompt'
import { NewScriptButton } from '@/components/dashboard/new-script-button'
// StickyNewScript removed — collided with Intercom
import { DeleteScriptButton } from '@/components/dashboard/delete-script-button'
import { DiscoverToggle } from '@/components/dashboard/discover-toggle'
import { DashboardTabs, type TabDef } from '@/components/dashboard/dashboard-tabs'
import Link from 'next/link'
import { OpportunityCard, type OppStatus } from '@/components/opportunities/opportunity-card'
import { normGenre, collectGenres, scriptMatchesOpportunity, extractMatchData } from '@/lib/opportunity-matching'

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

  type ProfileRow = { subscription_status: string | null; full_name: string | null; handle: string | null; avatar_url: string | null; heat_score: number | null; headline: string | null; account_type: string | null }
  let profile: ProfileRow | null = null
  let isPro = false
  let accountType = 'writer'

  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; is_public: boolean | null
    heat_score: number | null; poster_url: string | null
  }
  let visible: MySubRow[] = []
  let submissionIds: string[] = []

  type FeedEval = { id: string; weighted_score: number | null; genres: string[]; format: string | null; logline: string | null; budget: string | null; tags: string[] }
  const myEvalBySub = new Map<string, FeedEval>()

  type OppRow = {
    id: string; title: string; slug: string
    formats: string[] | null; genres: string[] | null; min_score: number | null
    subtitle: string | null; description: string | null
    deadline: string | null; budget_tiers: string[] | null
    tags: string[] | null
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
    .select('id, title, slug, formats, genres, min_score, subtitle, description, deadline, budget_tiers, tags, created_at')
    .eq('status', 'active')
  allOpenOpps = (openOpps || []) as OppRow[]

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('subscription_status, full_name, handle, avatar_url, heat_score, headline, account_type')
      .eq('id', user.id)
      .single()
    profile = p as ProfileRow | null
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
    accountType = profile?.account_type ?? 'writer'

    const { data: mySubs } = await supabase
      .from('script_submissions')
      .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score, poster_url')
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
        const matchData = extractMatchData(evJson)
        const logline = (evJson?.positioning_hook as string) || ((evJson?.classification as Record<string, unknown>)?.logline as string) || null
        myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: matchData.genres, format: matchData.format, logline, budget: matchData.budget, tags: matchData.tags })
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
          .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score, poster_url')
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
            const matchData = extractMatchData(evJson)
            const logline = (evJson?.positioning_hook as string) || ((evJson?.classification as Record<string, unknown>)?.logline as string) || null
            myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: matchData.genres, format: matchData.format, logline, budget: matchData.budget, tags: matchData.tags })
          }
        }
      }
    }
  }

  // Per-opp applied script tracking
  const appliedScriptsByOpp = new Map<string, Set<string>>()
  const pendingOppIds = new Set<string>()
  const scriptTitlesByApp = new Map<string, string[]>()

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

    // Build map: consideration_id → script titles for display in app cards
    const visibleTitleMap = new Map(visible.map(s => [s.id, s.title]))
    for (const row of (csRows || []) as { script_id: string; consideration_id: string }[]) {
      const title = visibleTitleMap.get(row.script_id)
      if (title) {
        const existing = scriptTitlesByApp.get(row.consideration_id) || []
        existing.push(title)
        scriptTitlesByApp.set(row.consideration_id, existing)
      }
    }

    for (const app of allApplications) {
      if (app.status !== 'reviewed' && app.review_stage !== 'complete') {
        pendingOppIds.add(app.opportunity_id)
      }
    }
  }

  // Usage gate
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
    totalSubmissions = visible.length
  }
  const evalsRemaining = Math.max(0, FREE_EVAL_LIMIT - totalSubmissions)
  const appsRemaining = Math.max(0, FREE_APP_LIMIT - totalApps)

  // ── DERIVED DATA ──

  const appliedOppIds = new Set(allApplications.map(a => a.opportunity_id))
  const oppAppCount = new Map<string, number>()
  for (const a of allApplications) {
    oppAppCount.set(a.opportunity_id, (oppAppCount.get(a.opportunity_id) || 0) + 1)
  }
  const oppMap = new Map(allOpenOpps.map(o => [o.id, o]))

  // Fetch opportunity titles for all applied opps (including closed ones not in allOpenOpps)
  const appliedOppIdsForTitles = [...new Set(allApplications.map(a => a.opportunity_id))]
  const missingOppIds = appliedOppIdsForTitles.filter(id => !oppMap.has(id))
  if (missingOppIds.length > 0) {
    const { data: closedOpps } = await service
      .from('opportunities')
      .select('id, title, slug, formats, genres, min_score, subtitle, description, deadline, budget_tiers, tags, created_at')
      .in('id', missingOppIds)
    for (const o of (closedOpps || []) as OppRow[]) {
      oppMap.set(o.id, o)
    }
  }

  function getQualifyingOpps(ev: FeedEval | undefined, declaredFormat: string | null) {
    if (!ev) return []
    const script = { format: ev.format || declaredFormat, genres: ev.genres, budget: ev.budget, tags: ev.tags, score: ev.weighted_score }
    return allOpenOpps.filter(o => scriptMatchesOpportunity(script, o))
  }

  const completedScripts = visible
    .filter(s => s.status === 'completed')
    .map(s => {
      const ev = myEvalBySub.get(s.id)
      const qualifyingOpps = getQualifyingOpps(ev, s.declared_format)
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
        posterUrl: s.poster_url ?? null,
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

  // Find the top-scoring script for linking
  const topScoringScript = completedScripts.reduce<{ score: number; evaluationId: string | null } | null>((best, s) => {
    const score = s.score ?? 0
    if (!best || score > best.score) return { score, evaluationId: s.evaluationId }
    return best
  }, null)

  function scoreBadge(s: number): { bg: string } {
    if (s >= 80) return { bg: '#059669' }
    if (s >= 60) return { bg: '#7c3aed' }
    if (s >= 40) return { bg: '#d97706' }
    return { bg: '#9ca3af' }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Opportunity qualification helpers
  function anyScriptQualifies(opp: OppRow) {
    return completedScripts.some(s => {
      const ev = myEvalBySub.get(s.id)
      if (!ev) return false
      const script = { format: ev.format || s.format, genres: ev.genres, budget: ev.budget, tags: ev.tags, score: ev.weighted_score }
      return scriptMatchesOpportunity(script, opp)
    })
  }

  const unappliedOpps = allOpenOpps.filter(o => !pendingOppIds.has(o.id))
  const qualifiedOpps = unappliedOpps.filter(o => anyScriptQualifies(o))
  const unqualifiedOpps = unappliedOpps.filter(o => !anyScriptQualifies(o))

  const sortByDeadline = (a: OppRow, b: OppRow) => {
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  }
  qualifiedOpps.sort(sortByDeadline)
  unqualifiedOpps.sort(sortByDeadline)

  const combinedOpps = [...qualifiedOpps, ...unqualifiedOpps]
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

  function getMatchingScriptsForOpp(opp: OppRow) {
    const alreadyAppliedScripts = appliedScriptsByOpp.get(opp.id) || new Set<string>()
    return completedScripts.filter(s => {
      if (alreadyAppliedScripts.has(s.id)) return false
      const ev = myEvalBySub.get(s.id)
      if (!ev) return false
      const script = { format: ev.format || s.format, genres: ev.genres, budget: ev.budget, tags: ev.tags, score: ev.weighted_score }
      return scriptMatchesOpportunity(script, opp)
    }).map(s => ({ id: s.id, title: s.title, score: s.score ? Math.round(s.score) : null }))
  }

  // ── PRODUCER DATA (for Manage tab) ──

  type PartnerApp = {
    id: string; status: string; review_stage: string; submitted_at: string
    opportunity_id: string; writer_id: string; writer_pitch: string | null; heat_earned: number
    triage_status: string | null
  }
  let partnerOpps: { id: string; title: string; slug: string | null; status: string }[] = []
  let partnerApps: PartnerApp[] = []
  const partnerWriterMap = new Map<string, { full_name: string | null; email: string | null }>()
  const partnerScriptsByApp = new Map<string, { title: string; score: number | null }[]>()

  let meetingsCount = 0
  const newCountByOpp = new Map<string, number>()

  if (user && accountType === 'producer') {
    const { data: opps } = await service
      .from('opportunities')
      .select('id, title, slug, status')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    partnerOpps = (opps || []) as typeof partnerOpps
    const oppIds = partnerOpps.map(o => o.id)

    if (oppIds.length > 0) {
      const { data: rawApps } = await service
        .from('considerations')
        .select('id, status, review_stage, submitted_at, opportunity_id, writer_id, writer_pitch, heat_earned, triage_status')
        .in('opportunity_id', oppIds)
        .order('submitted_at', { ascending: false })
        .limit(50)
      partnerApps = (rawApps || []) as PartnerApp[]

      // Compute "new" (untriaged) count per opportunity
      for (const app of partnerApps) {
        if (!app.triage_status) {
          newCountByOpp.set(app.opportunity_id, (newCountByOpp.get(app.opportunity_id) || 0) + 1)
        }
      }

      // Count meetings
      meetingsCount = partnerApps.filter(a => a.triage_status === 'meet').length

      // Load writer profiles
      const writerIds = [...new Set(partnerApps.map(a => a.writer_id))]
      if (writerIds.length > 0) {
        const { data: writers } = await service
          .from('profiles')
          .select('id, full_name, email')
          .in('id', writerIds)
        for (const w of (writers || []) as { id: string; full_name: string | null; email: string | null }[]) {
          partnerWriterMap.set(w.id, { full_name: w.full_name, email: w.email })
        }
      }

      // Load scripts
      const pAppIds = partnerApps.map(a => a.id)
      if (pAppIds.length > 0) {
        const { data: cs } = await service
          .from('consideration_scripts')
          .select('consideration_id, script_submission_id')
          .in('consideration_id', pAppIds)
        const scriptIds = (cs || []).map((c: any) => c.script_submission_id)
        const evalMap = new Map<string, number | null>()
        const titleMap = new Map<string, string>()
        if (scriptIds.length > 0) {
          const { data: subs } = await service.from('script_submissions').select('id, title').in('id', scriptIds)
          for (const s of (subs || []) as { id: string; title: string }[]) titleMap.set(s.id, s.title)
          const { data: evals } = await service.from('script_evaluations').select('submission_id, weighted_score').in('submission_id', scriptIds)
          for (const e of (evals || []) as { submission_id: string; weighted_score: number | null }[]) evalMap.set(e.submission_id, e.weighted_score)
        }
        for (const c of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
          const existing = partnerScriptsByApp.get(c.consideration_id) || []
          existing.push({ title: titleMap.get(c.script_submission_id) || 'Untitled', score: evalMap.get(c.script_submission_id) ?? null })
          partnerScriptsByApp.set(c.consideration_id, existing)
        }
      }
    }

  }

  const partnerPendingTotal = partnerApps.filter(a => a.review_stage !== 'complete').length
  const partnerOppMap = new Map(partnerOpps.map(o => [o.id, o]))

  // Compute per-opp stats for producer dashboard
  const partnerOppStats = new Map<string, { total: number; pending: number; connections: number }>()
  for (const opp of partnerOpps) {
    const apps = partnerApps.filter(a => a.opportunity_id === opp.id)
    partnerOppStats.set(opp.id, {
      total: apps.length,
      pending: apps.filter(a => !a.triage_status).length,
      connections: apps.filter(a => a.triage_status === 'meet').length,
    })
  }

  // Rank opportunities by total applications across ALL active opportunities
  let oppRankMap = new Map<string, number>()
  if (accountType === 'producer') {
    // Get app counts for ALL opportunities (not just this producer's) for ranking
    const oppIdsForRank = partnerOpps.map(o => o.id)
    if (oppIdsForRank.length > 0) {
      // Rank by total apps descending among this producer's opportunities
      const sorted = [...partnerOpps].sort((a, b) => {
        const aTotal = partnerOppStats.get(a.id)?.total ?? 0
        const bTotal = partnerOppStats.get(b.id)?.total ?? 0
        return bTotal - aTotal
      })
      sorted.forEach((o, i) => oppRankMap.set(o.id, i + 1))
    }
  }

  const openOppCount = partnerOpps.filter(o => o.status === 'active').length
  const totalWriterConnections = partnerApps.filter(a => a.triage_status === 'meet').length

  // ── RENDER ──

  const cardShadow = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'

  // Uniform placeholder gradient for scripts without posters
  const placeholderGradient = 'linear-gradient(135deg, #7c3aed, #6d28d9)'

  // GEM diamond logo — the ACTUAL logo: concentric layered diamond with
  // radiating purple layers (inner solid → progressively lighter outer rings).
  // Matches the brand asset in marketing/gem_diamond_*.png.
  const gemDiamond = (size = 14) => (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center shrink-0 rotate-45"
      style={{ width: size * 1.8, height: size * 1.8 }}
    >
      {/* Outer ring — lightest */}
      <span className="absolute rotate-0" style={{
        width: size * 1.8, height: size * 1.8,
        background: 'rgba(167, 139, 250, 0.15)',
        borderRadius: size * 0.06,
      }} />
      {/* Middle ring */}
      <span className="absolute rotate-0" style={{
        width: size * 1.35, height: size * 1.35,
        background: 'rgba(139, 92, 246, 0.35)',
        borderRadius: size * 0.06,
      }} />
      {/* Inner core — solid purple */}
      <span className="absolute rotate-0" style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
        borderRadius: size * 0.06,
      }} />
    </span>
  )

  // Build tabs — writers only (producers get a completely different layout, no tabs)
  const tabs: TabDef[] = [
    { id: 'scripts', label: 'Scripts', count: scriptCount },
    { id: 'opportunities', label: 'Opportunities' },
  ]

  // ── TAB PANELS ──

  // Compute stats for the prominent stats section
  const avgScore = completedScripts.length > 0
    ? Math.round(completedScripts.reduce((sum, s) => sum + (s.score ?? 0), 0) / completedScripts.filter(s => s.score).length) || 0
    : 0
  const topScore = completedScripts.length > 0
    ? Math.round(Math.max(...completedScripts.map(s => s.score ?? 0)))
    : 0
  const totalOpps = completedScripts.reduce((sum, s) => sum + s.qualifyingOpps.length, 0)

  // Scripts panel — poster-first visual cards with light card backgrounds
  const scriptsPanel = (
    <div>
      {completedScripts.length === 0 && processingScripts.length === 0 ? (
        <div className="rounded-2xl px-8 py-16 text-center" style={{ background: '#ffffff', boxShadow: cardShadow }}>
          <div className="w-16 h-20 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: '#f3f0ff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2v6h6M12 18v-6M9 15h6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-gray-900 m-0 mb-1">No scripts yet</p>
          <p className="text-[13px] text-gray-500 m-0 mb-4">Upload your first screenplay to get a full evaluation.</p>
          <NewScriptButton />
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Processing scripts */}
          {processingScripts.map(script => (
            <div key={script.id} className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', boxShadow: cardShadow }}>
              <div className="aspect-[5/4] sm:aspect-[3/2] w-full flex items-center justify-center" style={{ background: placeholderGradient }}>
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[12px] font-medium text-white/70 m-0">Evaluating...</p>
                </div>
              </div>
              <div className="px-4 py-4">
                <h3 className="text-[16px] font-bold text-gray-900 m-0 truncate">{script.title}</h3>
                <p className="text-[13px] text-gray-600 m-0 mt-0.5">{script.format || 'Script'}</p>
              </div>
            </div>
          ))}

          {/* Completed scripts — poster-first cards (limited to 3) */}
          {completedScripts.slice(0, 3).map(script => {
            const rounded = script.score ? Math.round(script.score) : null
            const reportHref = script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'

            return (
              <div key={script.id} className="rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-200" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                {/* Poster image area — no score overlay */}
                <Link href={reportHref} className="block no-underline">
                  <div className="aspect-[5/4] sm:aspect-[3/2] w-full relative overflow-hidden">
                    {script.posterUrl ? (
                      <img
                        src={script.posterUrl}
                        alt={script.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: placeholderGradient }}>
                        {/* Layered concentric diamond — white version for dark background */}
                        <span className="inline-flex items-center justify-center rotate-45" style={{ width: 72, height: 72 }}>
                          <span className="absolute" style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
                          <span className="absolute" style={{ width: 54, height: 54, background: 'rgba(255,255,255,0.15)', borderRadius: 3 }} />
                          <span className="absolute" style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.22)', borderRadius: 2 }} />
                        </span>
                        <p className="text-[11px] text-white/50 m-0 mt-3">Add a poster</p>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Card info — light background */}
                <div className="px-4 py-4 relative">
                  {/* Three-dot menu — top right */}
                  <div className="absolute top-3 right-3">
                    <DeleteScriptButton scriptId={script.id} title={script.title} evaluationId={script.evaluationId} />
                  </div>

                  <Link href={reportHref} className="block no-underline">
                    <h3 className="text-[16px] font-bold text-gray-900 m-0 line-clamp-2 pr-8 group-hover:text-purple-700 transition-colors">
                      {script.title}
                    </h3>
                    <p className="text-[13px] text-gray-600 m-0 mt-1">
                      {[script.format, script.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase()), fmtDate(script.createdAt)].filter(Boolean).join(' · ')}
                    </p>
                  </Link>

                  {/* Score + Heat — both large and prominent */}
                  <div className="flex items-center gap-4 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[20px] font-bold" style={{ color: '#7c3aed' }}>
                      {gemDiamond(10)} {rounded || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[20px] font-bold" style={{ color: script.heat > 0 ? '#ea580c' : '#9ca3af' }}>
                      <span className="text-[18px]">🔥</span> {script.heat}
                    </span>
                  </div>

                  {/* Bottom row: Discover toggle + view report */}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                    <div className="flex items-center gap-2">
                      <DiscoverToggle scriptId={script.id} isPublic={script.isPublic} isAnon={!user} />
                      <span className="text-[12px] text-gray-600">{script.isPublic ? 'Published to Leaderboard' : 'Not published to Leaderboard'}</span>
                    </div>
                    <Link href={reportHref} className="text-[13px] font-semibold text-purple-600 hover:text-purple-700 transition-colors no-underline whitespace-nowrap">
                      View report →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {completedScripts.length > 3 && (
          <div className="mt-6 text-center">
            <Link
              href="/scripts"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white no-underline transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              View all {completedScripts.length} scripts →
            </Link>
          </div>
        )}
        </>
      )}
    </div>
  )

  // Opportunities panel — matching opps + pending applications
  const opportunitiesPanel = (
    <div className="space-y-6">
      {/* Matching opportunities */}
      {dashboardOpps.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-white/60 m-0 uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>Matches for your scripts</h3>
            <Link href="/opportunities" className="text-[13px] font-medium text-purple-300 hover:text-purple-200 transition-colors no-underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dashboardOpps.map(opp => {
              const matchCount = getMatchingScriptsForOpp(opp).length
              const oppStatus: OppStatus = pendingOppIds.has(opp.id)
                ? 'pending'
                : appliedOppIds.has(opp.id)
                  ? 'previously_applied'
                  : 'available'
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
                  status={oppStatus}
                  matchingScriptCount={matchCount}
                  isAnon={!user}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl px-6 py-10 text-center" style={{ background: '#ffffff', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No matching opportunities right now</p>
          <p className="text-[13px] text-gray-500 m-0 mb-3">Upload more scripts to qualify for open opportunities.</p>
          <Link href="/opportunities" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[13px] font-semibold text-white no-underline" style={{ background: '#7c3aed' }}>
            Browse opportunities →
          </Link>
        </div>
      )}

      {/* Pending applications */}
      {pendingApps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-semibold text-white/60 m-0 uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>Pending Applications</h3>
            <Link href="/applications" className="text-[13px] font-medium text-purple-300 hover:text-purple-200 transition-colors no-underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingApps.slice(0, 3).map(app => {
              const opp = oppMap.get(app.opportunity_id)
              return (
                <Link key={app.id} href={`/review/applications/${app.id}`} className="block no-underline">
                  <div className="rounded-xl px-4 py-3.5 flex items-center justify-between hover:shadow-md transition-all" style={{ background: '#ffffff', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{opp?.title || 'Opportunity'}</p>
                      <p className="text-[12px] text-gray-600 m-0 mt-0.5">
                        {scriptTitlesByApp.get(app.id)?.[0] ? `${scriptTitlesByApp.get(app.id)![0]} · ` : ''}{fmtDate(app.submitted_at)}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#f3f0ff', color: '#7c3aed' }}>In Consideration</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const panels: Record<string, React.ReactNode> = {
    scripts: scriptsPanel,
    opportunities: opportunitiesPanel,
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Full-bleed dark background — fixed so it doesn't affect scroll behavior */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, #110f1d 0%, #171428 60%, #1d1932 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {user && submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />
      {!user && isProcessing && <AnonSignupPrompt />}

      <div className="space-y-8">

        {accountType === 'producer' ? (
          /* ── PRODUCER DASHBOARD — vivid, no tabs ── */
          <>
            {/* Welcome */}
            <h1 className="text-[28px] sm:text-[34px] font-bold text-white m-0 leading-tight">
              Welcome, {profile?.full_name?.split(' ')[0] || 'Producer'}
            </h1>

            {/* Stat cards — emoji-driven */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="py-5 px-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[24px] leading-none shrink-0">📋</span>
                  <span className="text-[28px] sm:text-[34px] font-bold text-white leading-none">{openOppCount}</span>
                </div>
                <span className="text-[13px] text-white/60 block">Open Opportunities</span>
              </div>
              <Link href="/partner" className="no-underline block">
                <div className="py-5 px-4 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(251,146,60,0.06) 100%)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 16 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[24px] leading-none shrink-0">📨</span>
                    <span className="text-[28px] sm:text-[34px] font-bold text-white leading-none">{partnerPendingTotal}</span>
                  </div>
                  <span className="text-[13px] text-white/60 block">Pending Applications</span>
                </div>
              </Link>
              <div className="py-5 px-4" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(52,211,153,0.06) 100%)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[24px] leading-none shrink-0">🤝</span>
                  <span className="text-[28px] sm:text-[34px] font-bold text-white leading-none">{totalWriterConnections}</span>
                </div>
                <span className="text-[13px] text-white/60 block">Writer Connections</span>
              </div>
            </div>

            {/* Opportunity cards header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-bold text-white m-0">Your Opportunities</h2>
                {partnerOpps.length > 0 && (
                  <Link href="/partner" className="text-[13px] font-medium text-purple-300 hover:text-purple-200 transition-colors no-underline">
                    View all →
                  </Link>
                )}
              </div>
              <Link
                href="/partner/opportunities/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white no-underline transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 10 }}
              >
                + New
              </Link>
            </div>

            {/* Opportunity cards — only show opps with pending (untriaged) applications */}
            {(() => {
              const oppsWithPending = partnerOpps.filter(opp => {
                const stats = partnerOppStats.get(opp.id)
                return stats && stats.pending > 0
              })
              return oppsWithPending.length === 0 ? (
              <div className="px-8 py-14 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4 }}>
                <span className="text-[40px] block mb-3">🎬</span>
                <p className="text-[17px] font-bold text-white m-0 mb-1">No opportunities yet</p>
                <p className="text-[14px] text-white/50 m-0 mb-5">Create your first opportunity to start receiving pitches from writers.</p>
                <Link
                  href="/partner/opportunities/create"
                  className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold text-white no-underline transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 10 }}
                >
                  Create opportunity
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {oppsWithPending.map(opp => {
                  const stats = partnerOppStats.get(opp.id) || { total: 0, pending: 0, connections: 0 }
                  const rank = oppRankMap.get(opp.id) || 1
                  const newForOpp = newCountByOpp.get(opp.id) || 0
                  const isActive = opp.status === 'active'
                  return (
                    <Link key={opp.id} href="/partner" className="block no-underline group">
                      <div
                        className="p-5 transition-all hover:translate-y-[-2px]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                          border: '1px solid rgba(124,58,237,0.2)',
                          borderRadius: 4,
                        }}
                      >
                        {/* Title + status */}
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <h3 className="text-[17px] font-bold text-white m-0 line-clamp-2 group-hover:text-purple-300 transition-colors">
                            {opp.title}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
<span className="text-[11px] font-bold px-2 py-0.5" style={{
                              background: isActive ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                              color: isActive ? '#34d399' : 'rgba(255,255,255,0.4)',
                              borderRadius: 4,
                            }}>
                              {isActive ? 'Active' : opp.status}
                            </span>
                          </div>
                        </div>

                        {/* Stats row — big, vivid numbers */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <span className="text-[22px] font-bold text-white block leading-none">{stats.total}</span>
                            <span className="text-[12px] text-white/40 mt-0.5 block">
                              Applicants {partnerOpps.length > 1 ? `(#${rank})` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-[22px] font-bold block leading-none" style={{ color: stats.pending > 0 ? '#fb923c' : 'rgba(255,255,255,0.25)' }}>{stats.pending}</span>
                            <span className="text-[12px] text-white/40 mt-0.5 block">Pending</span>
                          </div>
                          <div>
                            <span className="text-[22px] font-bold block leading-none" style={{ color: stats.connections > 0 ? '#34d399' : 'rgba(255,255,255,0.25)' }}>{stats.connections}</span>
                            <span className="text-[12px] text-white/40 mt-0.5 block">Connections</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )})()}

            {/* Triage CTA — if there are pending */}
            {partnerPendingTotal > 0 && (
              <Link
                href="/partner"
                className="block no-underline text-center py-4 transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 10 }}
              >
                <p className="text-[16px] font-bold text-white m-0">
                  📨 {partnerPendingTotal} pitch{partnerPendingTotal !== 1 ? 'es' : ''} to review
                </p>
                <p className="text-[13px] text-white/70 m-0 mt-0.5">Open triage →</p>
              </Link>
            )}
          </>
        ) : (
          <>
          {/* ── WELCOME HEADER ── */}
          <h1 className="text-[24px] sm:text-[28px] font-bold text-white m-0 mb-6 leading-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Writer'}
          </h1>

          {/* ── WRITER STATS ROW ── */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            <Link href="/scripts" className="no-underline block">
              <div className="py-5 px-4 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[24px] leading-none shrink-0">📄</span>
                  <span className="text-[28px] sm:text-[34px] font-bold text-white leading-none">{scriptCount}</span>
                </div>
                <span className="text-[13px] text-white/60 block">Scripts</span>
              </div>
            </Link>
            <Link href={topScoringScript?.evaluationId ? `/report/${topScoringScript.evaluationId}` : '/scripts'} className="no-underline block">
              <div className="py-5 px-4 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.06) 100%)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex shrink-0">{gemDiamond(10)}</span>
                  <span className="text-[28px] sm:text-[34px] font-bold leading-none" style={{ color: topScore >= 80 ? '#34d399' : topScore >= 70 ? '#a78bfa' : topScore >= 60 ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
                    {topScore > 0 ? topScore : '—'}
                  </span>
                </div>
                <span className="text-[13px] text-white/60 block">Top Score</span>
              </div>
            </Link>
            <Link href="/applications" className="no-underline block">
              <div className="py-5 px-4 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(251,146,60,0.06) 100%)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[24px] leading-none shrink-0">🔥</span>
                  <span className="text-[28px] sm:text-[34px] font-bold leading-none" style={{ color: totalHeat > 0 ? '#fb923c' : 'rgba(255,255,255,0.3)' }}>
                    {totalHeat > 0 ? totalHeat : '—'}
                  </span>
                </div>
                <span className="text-[13px] text-white/60 block">Heat</span>
              </div>
            </Link>
            <Link href="/applications" className="no-underline block">
              <div className="py-5 px-4 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[24px] leading-none shrink-0">📨</span>
                  <span className="text-[28px] sm:text-[34px] font-bold leading-none" style={{ color: pendingCount > 0 ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                    {pendingCount > 0 ? pendingCount : '—'}
                  </span>
                </div>
                <span className="text-[13px] text-white/60 block">Pending</span>
              </div>
            </Link>
          </div>

          {/* ── TABBED CONTENT ── */}
          <DashboardTabs tabs={tabs} panels={panels} />
          </>
        )}

      </div>
    </div>
    </div>
  )
}
