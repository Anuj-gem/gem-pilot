// /dashboard — unified dashboard for writers and producers.
//
// Layout: stats row → two-column (recent scripts + opportunities) → collaborations.
// Writers see scripts, pending/available opps, and collaborations inline (no tabs).
// Producers get a completely different layout (opp cards + triage CTA).

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
import { ScriptCardMenu } from '@/components/dashboard/script-card-menu'
import { AddCollaboratorButton } from '@/components/dashboard/add-collaborator-button'
// DashboardTabs removed — writer dashboard is now a flat two-column layout
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
  const pendingAppsByScript = new Map<string, number>()

  if (user && allApplications.length > 0) {
    const considerationIds = allApplications.map(a => a.id)
    const { data: csRows } = await service
      .from('consideration_scripts')
      .select('script_submission_id, consideration_id')
      .in('consideration_id', considerationIds)

    const considerationToOpp = new Map(allApplications.map(a => [a.id, a.opportunity_id]))
    for (const row of (csRows || []) as { script_submission_id: string; consideration_id: string }[]) {
      const oppId = considerationToOpp.get(row.consideration_id)
      if (!oppId) continue
      if (!appliedScriptsByOpp.has(oppId)) appliedScriptsByOpp.set(oppId, new Set())
      appliedScriptsByOpp.get(oppId)!.add(row.script_submission_id)
    }

    // Build map: consideration_id → script titles for display in app cards
    const visibleTitleMap = new Map(visible.map(s => [s.id, s.title]))
    for (const row of (csRows || []) as { script_submission_id: string; consideration_id: string }[]) {
      const title = visibleTitleMap.get(row.script_submission_id)
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

    // Build per-script pending application count
    for (const app of allApplications) {
      if (app.status === 'reviewed' || app.review_stage === 'complete') continue
      for (const row of (csRows || []) as { script_submission_id: string; consideration_id: string }[]) {
        if (row.consideration_id === app.id) {
          pendingAppsByScript.set(row.script_submission_id, (pendingAppsByScript.get(row.script_submission_id) || 0) + 1)
        }
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

  // ── COLLABORATOR COUNTS (for stat card + per-script display) ──

  let totalCollaborators = 0
  let pendingCollaborators = 0
  const collabCountByScript = new Map<string, number>()

  if (user && submissionIds.length > 0) {
    // Active (accepted) collaborators on my scripts
    const { data: activeCollabs } = await service
      .from('script_collaborators')
      .select('id, submission_id')
      .in('submission_id', submissionIds)
      .eq('status', 'accepted')
    totalCollaborators = (activeCollabs || []).length
    for (const c of (activeCollabs || []) as { id: string; submission_id: string }[]) {
      collabCountByScript.set(c.submission_id, (collabCountByScript.get(c.submission_id) || 0) + 1)
    }

    // Pending collaborator invitations on my scripts
    const { count: pendingCount2 } = await service
      .from('script_collaborators')
      .select('id', { count: 'exact', head: true })
      .in('submission_id', submissionIds)
      .eq('status', 'pending')
    pendingCollaborators = pendingCount2 ?? 0
  }

  // ── COLLABORATIONS QUERY (scripts I'm collaborating on) ──

  type CollabScript = {
    id: string; title: string; format: string | null; genres: string[]
    score: number | null; evaluationId: string | null; createdAt: string
    heat: number; posterUrl: string | null; collabRole: string
  }
  let collabScripts: CollabScript[] = []

  if (user) {
    // Fetch collabs where user is the collaborator (scripts they were invited to)
    const { data: invitedToRows } = await service
      .from('script_collaborators')
      .select('id, collaborator_email, collaborator_id, role, role_other, submission_id')
      .or(`collaborator_id.eq.${user.id},collaborator_email.eq.${user.email?.toLowerCase()}`)
      .order('created_at', { ascending: false })

    if (invitedToRows && invitedToRows.length > 0) {
      const collabSubIds = [...new Set(invitedToRows.map((c: any) => c.submission_id))]
      // Fetch submission details for those scripts
      const { data: collabSubs } = await service
        .from('script_submissions')
        .select('id, title, declared_format, status, created_at, heat_score, poster_url, is_public')
        .in('id', collabSubIds)
        .eq('status', 'completed')

      // Fetch evaluations for those submissions
      const collabSubIdsCompleted = (collabSubs || []).map((s: any) => s.id)
      let collabEvalsBySub: Record<string, any> = {}
      if (collabSubIdsCompleted.length > 0) {
        const { data: collabEvals } = await service
          .from('script_evaluations')
          .select('id, submission_id, evaluation')
          .in('submission_id', collabSubIdsCompleted)
        for (const ev of (collabEvals || []) as any[]) {
          const parsed = typeof ev.evaluation === 'string' ? JSON.parse(ev.evaluation) : ev.evaluation
          collabEvalsBySub[ev.submission_id] = { id: ev.id, ...parsed }
        }
      }

      // Build collab script cards
      const roleBySubId = new Map<string, string>()
      for (const c of invitedToRows as any[]) {
        const roleName = c.role === 'other' ? (c.role_other || 'Collaborator') : c.role.replace('_', ' ').replace(/^\w/, (ch: string) => ch.toUpperCase())
        roleBySubId.set(c.submission_id, roleName)
      }

      collabScripts = (collabSubs || []).map((s: any) => {
        const ev = collabEvalsBySub[s.id]
        return {
          id: s.id,
          title: s.title,
          format: ev?.format || s.declared_format,
          genres: ev?.genres || [],
          score: ev?.weighted_score ?? null,
          evaluationId: ev?.id ?? null,
          createdAt: s.created_at,
          heat: s.heat_score ?? 0,
          posterUrl: s.poster_url ?? null,
          collabRole: roleBySubId.get(s.id) || 'Collaborator',
        }
      })
    }
  }

  // ── DISCOVER RANK CALCULATION ──
  const scoreRankMap = new Map<string, number>()
  const heatRankMap = new Map<string, number>()

  if (submissionIds.length > 0) {
    const { data: allPublicScripts } = await service
      .from('script_submissions')
      .select('id, heat_score')
      .eq('status', 'completed')
      .eq('is_public', true)

    const allPublicIds = (allPublicScripts || []).map((s: any) => s.id)

    let allPublicEvals = new Map<string, number>()
    if (allPublicIds.length > 0) {
      const { data: pubEvs } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score')
        .in('submission_id', allPublicIds)
      for (const e of (pubEvs || []) as { submission_id: string; weighted_score: number | null }[]) {
        if (e.weighted_score != null) allPublicEvals.set(e.submission_id, e.weighted_score)
      }
    }

    const publicWithScores = (allPublicScripts || [])
      .map((s: any) => ({ id: s.id, score: allPublicEvals.get(s.id) ?? 0, heat: s.heat_score ?? 0 }))

    const byScore = [...publicWithScores].sort((a, b) => b.score - a.score)
    byScore.forEach((s, i) => scoreRankMap.set(s.id, i + 1))

    const byHeat = [...publicWithScores].sort((a, b) => b.heat - a.heat)
    byHeat.forEach((s, i) => heatRankMap.set(s.id, i + 1))
  }

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
        .filter(o => {
          const scriptsApplied = appliedScriptsByOpp.get(o.id)
          return !scriptsApplied || !scriptsApplied.has(s.id)
        })
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
        collaboratorCount: collabCountByScript.get(s.id) ?? 0,
        pendingAppCount: pendingAppsByScript.get(s.id) ?? 0,
        availableOppCount: qualifyingOpps.length,
        scoreRank: scoreRankMap.get(s.id) ?? null,
        heatRank: heatRankMap.get(s.id) ?? null,
      }
    })

  const processingScripts = visible
    .filter(s => s.status === 'processing' || s.status === 'queued')
    .map(s => ({ id: s.id, title: s.title, format: s.declared_format, createdAt: s.created_at }))

  const isProcessing = processingScripts.length > 0

  const reviewedApps = allApplications.filter(a => a.status === 'reviewed' || a.review_stage === 'complete')
  const pendingApps = allApplications.filter(a => a.status !== 'reviewed' && a.review_stage !== 'complete')

  // Derive account heat from sum of all script heat — single source of truth
  const totalHeat = visible.reduce((sum, s) => sum + (s.heat_score ?? 0), 0)
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

  // Compute stats for the prominent stats section
  const topScore = completedScripts.length > 0
    ? Math.round(Math.max(...completedScripts.map(s => s.score ?? 0)))
    : 0

  return (
    <div style={{ position: 'relative' }}>
      {/* Full-bleed dark background — fixed so it doesn't affect scroll behavior */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#2b1a55',
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
                <span className="text-[13px] text-white block">Open Opportunities</span>
              </div>
              <Link href="/partner" className="no-underline block">
                <div className="py-5 px-4 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(251,146,60,0.06) 100%)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 16 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[24px] leading-none shrink-0">📨</span>
                    <span className="text-[28px] sm:text-[34px] font-bold text-white leading-none">{partnerPendingTotal}</span>
                  </div>
                  <span className="text-[13px] text-white block">Pending Applications</span>
                </div>
              </Link>
              <div className="py-5 px-4" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(52,211,153,0.06) 100%)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[24px] leading-none shrink-0">🤝</span>
                  <span className="text-[28px] sm:text-[34px] font-bold text-white leading-none">{totalWriterConnections}</span>
                </div>
                <span className="text-[13px] text-white block">Writer Connections</span>
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
                <p className="text-[14px] text-white m-0 mb-5">Create your first opportunity to start receiving pitches from writers.</p>
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
                              color: isActive ? '#34d399' : 'rgba(255,255,255,0.9)',
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
                            <span className="text-[12px] text-white mt-0.5 block">
                              Applicants {partnerOpps.length > 1 ? `(#${rank})` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-[22px] font-bold block leading-none" style={{ color: stats.pending > 0 ? '#fb923c' : 'rgba(255,255,255,0.7)' }}>{stats.pending}</span>
                            <span className="text-[12px] text-white mt-0.5 block">Pending</span>
                          </div>
                          <div>
                            <span className="text-[22px] font-bold block leading-none" style={{ color: stats.connections > 0 ? '#34d399' : 'rgba(255,255,255,0.7)' }}>{stats.connections}</span>
                            <span className="text-[12px] text-white mt-0.5 block">Connections</span>
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
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            <Link href="/scripts" className="no-underline block">
              <div className="py-3 px-3 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12 }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] leading-none shrink-0">📄</span>
                  <span className="text-[26px] sm:text-[32px] font-bold text-white leading-none">{scriptCount}</span>
                </div>
                <span className="text-[12px] font-bold text-white mt-1 block">Scripts</span>
              </div>
            </Link>
            <Link href={topScoringScript?.evaluationId ? `/report/${topScoringScript.evaluationId}` : '/scripts'} className="no-underline block">
              <div className="py-3 px-3 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.06) 100%)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12 }}>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex shrink-0">{gemDiamond(9)}</span>
                  <span className="text-[26px] sm:text-[32px] font-bold text-white leading-none">
                    {topScore > 0 ? topScore : '—'}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-white mt-1 block">Top Score</span>
              </div>
            </Link>
            <Link href="/applications" className="no-underline block">
              <div className="py-3 px-3 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(251,146,60,0.06) 100%)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 12 }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] leading-none shrink-0">🔥</span>
                  <span className="text-[26px] sm:text-[32px] font-bold text-white leading-none">
                    {totalHeat > 0 ? totalHeat : '—'}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-white mt-1 block">Heat</span>
              </div>
            </Link>
            <div className="block">
              <div className="py-3 px-3" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.06) 100%)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12 }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] leading-none shrink-0">🧑</span>
                  <span className="text-[26px] sm:text-[32px] font-bold text-white leading-none">
                    {totalCollaborators > 0 ? totalCollaborators : '—'}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-white mt-1 block">
                  {totalCollaborators === 0 && pendingCollaborators > 0 ? `Collabs (${pendingCollaborators} pending)` : 'Collaborators'}
                </span>
              </div>
            </div>
            <Link href="/applications" className="no-underline block">
              <div className="py-3 px-3 hover:brightness-110 transition-all" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12 }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] leading-none shrink-0">📨</span>
                  <span className="text-[26px] sm:text-[32px] font-bold text-white leading-none">
                    {pendingCount > 0 ? pendingCount : '—'}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-white mt-1 block">Pending</span>
              </div>
            </Link>
          </div>

          {/* ── TWO-COLUMN: SCRIPTS + OPPORTUNITIES ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* LEFT: Recent Scripts */}
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold m-0 uppercase" style={{ color: 'rgba(255,255,255,1)', letterSpacing: '0.04em' }}>Recent scripts</h2>
                {completedScripts.length > 0 && (
                  <Link href="/scripts" className="text-[12px] font-medium text-purple-300 hover:text-purple-200 transition-colors no-underline">View all →</Link>
                )}
              </div>

              {completedScripts.length === 0 && processingScripts.length === 0 ? (
                <div className="px-6 py-10 text-center" style={{ background: '#ffffff', border: '1px dashed #d1d5db', borderRadius: 4 }}>
                  <p className="text-[14px] font-semibold m-0 mb-1" style={{ color: '#111827' }}>No scripts yet</p>
                  <p className="text-[13px] m-0 mb-3" style={{ color: '#6b7280' }}>Upload your first screenplay to get a full evaluation.</p>
                  <NewScriptButton />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Processing scripts */}
                  {processingScripts.map(script => (
                    <div key={script.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                      <div className="w-[40px] h-[50px] shrink-0 rounded flex items-center justify-center" style={{ background: placeholderGradient }}>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold m-0 truncate" style={{ color: '#111827' }}>{script.title}</p>
                        <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>Evaluating...</p>
                      </div>
                    </div>
                  ))}

                  {/* Completed scripts + collab scripts — compact rows */}
                  {[
                    ...completedScripts.slice(0, 3).map(s => ({ ...s, collabRole: null as string | null })),
                    ...collabScripts.slice(0, 3 - Math.min(completedScripts.length, 3)).map(s => ({ ...s, collaboratorCount: 0, pendingAppCount: 0, availableOppCount: 0, isPublic: false, qualifyingOpps: [] as { id: string; title: string; slug: string; subtitle: string | null }[], scoreRank: null as number | null, heatRank: null as number | null })),
                  ].map(script => {
                    const rounded = script.score ? Math.round(script.score) : null
                    const reportHref = script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'
                    return (
                      <div key={script.id} className="px-3 py-2.5" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                        {/* Row 1: poster + title + format/genre/date + menu */}
                        <div className="flex items-start gap-2.5">
                          <Link href={reportHref} className="flex-1 min-w-0 no-underline group">
                            <div className="flex items-center gap-2.5">
                              {script.posterUrl && (
                                <div className="w-[40px] h-[50px] shrink-0 rounded overflow-hidden">
                                  <img src={script.posterUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold m-0 truncate group-hover:text-purple-600 transition-colors" style={{ color: '#111827' }}>{script.title}</p>
                                <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>
                                  {[script.format, script.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase()), fmtDate(script.createdAt)].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              {script.collabRole && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 shrink-0" style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', borderRadius: 3 }}>{script.collabRole}</span>
                              )}
                            </div>
                          </Link>
                          {!script.collabRole && (
                            <ScriptCardMenu scriptId={script.id} evaluationId={script.evaluationId} />
                          )}
                        </div>

                        {/* Ranking section */}
                        <div className="mt-2 space-y-1.5" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                          {/* GEM Score + rank */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold" style={{ color: '#7c3aed' }}>GEM Score</span>
                            <span className="inline-flex">{gemDiamond(5)}</span>
                            <span className="text-[15px] font-extrabold leading-none" style={{ color: '#6d28d9' }}>{rounded || '—'}</span>
                            <span className="text-[11px] font-semibold" style={{ color: '#9ca3af' }}>·</span>
                            {script.isPublic && script.scoreRank ? (
                              <span className="text-[12px] font-bold" style={{ color: '#7c3aed' }}>Ranked #{script.scoreRank}</span>
                            ) : (
                              <span className="text-[11px] font-medium" style={{ color: '#9ca3af' }}>Not ranked</span>
                            )}
                          </div>

                          {/* Project Heat + rank */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold" style={{ color: '#ea580c' }}>Project Heat</span>
                            <span className="text-[11px] leading-none">🔥</span>
                            <span className="text-[15px] font-extrabold leading-none" style={{ color: script.heat > 0 ? '#ea580c' : '#d1d5db' }}>{script.heat}</span>
                            <span className="text-[11px] font-semibold" style={{ color: '#9ca3af' }}>·</span>
                            {script.isPublic && script.heat > 0 && script.heatRank ? (
                              <span className="text-[12px] font-bold" style={{ color: '#ea580c' }}>Ranked #{script.heatRank}</span>
                            ) : (
                              <span className="text-[11px] font-medium" style={{ color: '#9ca3af' }}>Not ranked</span>
                            )}
                          </div>

                          {/* Discover toggle */}
                          {!script.collabRole && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <DiscoverToggle scriptId={script.id} isPublic={script.isPublic} />
                            </div>
                          )}
                        </div>

                        {/* Actions section */}
                        <div className="flex items-center gap-0 mt-2 flex-wrap" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 6 }}>
                          {!script.collabRole && (
                            <AddCollaboratorButton scriptId={script.id} collaboratorCount={script.collaboratorCount} />
                          )}
                          {script.collabRole && (
                            <span className="text-[12px] shrink-0" style={{ color: '#6b7280' }}>🧑 {script.collaboratorCount}</span>
                          )}
                          {script.availableOppCount > 0 && (
                            <>
                              <span className="shrink-0 mx-3" style={{ width: 1, height: 16, background: '#e5e7eb', display: 'inline-block' }} />
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 shrink-0" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', borderRadius: 3 }}>
                                {script.availableOppCount} {script.availableOppCount === 1 ? 'opportunity' : 'opportunities'}
                              </span>
                            </>
                          )}
                          {script.pendingAppCount > 0 && (
                            <>
                              <span className="shrink-0 mx-3" style={{ width: 1, height: 16, background: '#e5e7eb', display: 'inline-block' }} />
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 shrink-0" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c', borderRadius: 3 }}>
                                {script.pendingAppCount} pending
                              </span>
                            </>
                          )}
                          <span className="flex-1" />
                          {script.evaluationId && (
                            <Link href={reportHref} className="text-[12px] font-semibold no-underline shrink-0" style={{ color: '#7c3aed' }}>
                              View report →
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: Opportunities — Pending + Available */}
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold m-0 uppercase" style={{ color: 'rgba(255,255,255,1)', letterSpacing: '0.04em' }}>Opportunities</h2>
                <Link href="/opportunities" className="text-[12px] font-medium text-purple-300 hover:text-purple-200 transition-colors no-underline">Browse all →</Link>
              </div>

              {/* Pending applications */}
              {pendingApps.length > 0 && (
                <div className="mb-3">
                  <p className="text-[12px] font-semibold m-0 mb-1.5" style={{ color: 'rgba(255,255,255,1)' }}>Pending</p>
                  <div className="space-y-1.5">
                    {pendingApps.slice(0, 3).map(app => {
                      const opp = oppMap.get(app.opportunity_id)
                      const scripts = scriptTitlesByApp.get(app.id) || []
                      return (
                        <Link key={app.id} href={`/applications/${app.id}`} className="block no-underline">
                          <div className="px-3 py-2.5 hover:brightness-95 transition-all" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                            <p className="text-[14px] font-semibold m-0 truncate" style={{ color: '#111827' }}>{opp?.title || 'Opportunity'}</p>
                            <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>
                              Applied {fmtDate(app.submitted_at)}
                            </p>
                            {scripts.length > 0 && (
                              <p className="text-[11px] font-bold m-0 mt-1" style={{ color: '#6b7280' }}>
                                📄 {scripts.join(', ')}
                              </p>
                            )}
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 mt-1" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c', borderRadius: 3 }}>In consideration</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                  {/* Divider between pending and available */}
                  {dashboardOpps.length > 0 && (
                    <div className="my-3" style={{ borderTop: '1px solid #e5e7eb' }} />
                  )}
                </div>
              )}

              {/* Available opportunities */}
              {dashboardOpps.length > 0 ? (
                <div>
                  <p className="text-[12px] font-semibold m-0 mb-1.5" style={{ color: 'rgba(255,255,255,1)' }}>Available</p>
                  <div className="space-y-1.5">
                    {dashboardOpps.map(opp => {
                      const matchCount = getMatchingScriptsForOpp(opp).length
                      const qualCriteria = [
                        opp.formats?.length ? opp.formats.join(', ') : null,
                        opp.genres?.length ? opp.genres.join(', ') : null,
                        opp.min_score ? `Score ${opp.min_score}+` : null,
                        opp.budget_tiers?.length ? opp.budget_tiers.join(', ') : null,
                      ].filter(Boolean)
                      return (
                        <Link key={opp.id} href={`/opportunities/${opp.slug}`} className="block no-underline">
                          <div className="px-3 py-2.5 hover:brightness-95 transition-all" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                            <p className="text-[14px] font-semibold m-0 truncate" style={{ color: '#111827' }}>{opp.title}</p>
                            {opp.description && (
                              <p className="text-[11px] font-bold m-0 mt-1 line-clamp-2" style={{ color: '#6b7280' }}>
                                {opp.description}
                              </p>
                            )}
                            {qualCriteria.length > 0 && (
                              <p className="text-[11px] font-bold m-0 mt-1" style={{ color: '#6b7280' }}>
                                Qualification Criteria: {qualCriteria.join(', ')}
                              </p>
                            )}
                            {matchCount > 0 && (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 mt-1" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 3 }}>
                                {matchCount} script{matchCount !== 1 ? 's' : ''} qualify
                              </span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : pendingApps.length === 0 ? (
                <div className="px-6 py-10 text-center" style={{ background: '#ffffff', border: '1px dashed #d1d5db', borderRadius: 4 }}>
                  <p className="text-[14px] font-semibold m-0 mb-1" style={{ color: '#111827' }}>No opportunities yet</p>
                  <p className="text-[13px] m-0 mb-3" style={{ color: '#6b7280' }}>Upload scripts to qualify for open opportunities.</p>
                  <Link href="/opportunities" className="inline-flex items-center gap-1 px-4 py-2 text-[13px] font-semibold text-white no-underline" style={{ background: '#7c3aed', borderRadius: 8 }}>
                    Browse opportunities →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {/* Collaborations section removed — collab scripts now appear in Recent Scripts with a role pill */}
          </>
        )}

      </div>
    </div>
    </div>
  )
}
