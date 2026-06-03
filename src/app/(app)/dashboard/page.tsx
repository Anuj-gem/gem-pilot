// /dashboard — unified dashboard for writers and producers.
//
// Writers see the ProjectHub client component.
// Producers get a completely different layout (opp cards + triage CTA).

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { AnonSignupPrompt } from '@/components/dashboard/anon-signup-prompt'
import { ProjectHub } from '@/components/dashboard/project-hub'
import type { ProjectCard, CollabRequest } from '@/components/dashboard/project-hub'
import Link from 'next/link'
import { extractMatchData } from '@/lib/opportunity-matching'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/* ── Helpers ── */

function fmtShort(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`
  return `$${n.toLocaleString()}`
}

function parseBudgetHigh(rangeStr: string | null | undefined, perEpStr: string | null | undefined): number {
  const raw = perEpStr?.trim() || rangeStr?.trim()
  if (!raw) return 0
  const matches = raw.match(/\$([0-9.]+)\s*(K|M|B)?/gi)
  if (!matches || matches.length === 0) return 0
  function parse(m: string): number {
    const r = m.match(/\$([0-9.]+)\s*(K|M|B)?/i)
    if (!r) return 0
    const n = parseFloat(r[1])
    const u = (r[2] || '').toUpperCase()
    return Math.round(u === 'B' ? n * 1e9 : u === 'M' ? n * 1e6 : u === 'K' ? n * 1e3 : n)
  }
  return Math.max(...matches.map(parse))
}

function tierFromScore(s: number | null): string | null {
  if (s == null) return null
  if (s >= 80) return 'Exceptional'
  if (s >= 70) return 'Strong'
  if (s >= 60) return 'Promising'
  if (s >= 50) return 'Early Stage'
  return 'Needs Rework'
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
    total_backing: number | null; backer_count: number | null
    total_following: number | null; follower_count: number | null
  }
  let visible: MySubRow[] = []
  let submissionIds: string[] = []

  type FeedEval = { id: string; weighted_score: number | null; genres: string[]; format: string | null; logline: string | null; budget: string | null; budgetRange: string | null; budgetPerEp: string | null; tags: string[]; leadCharCount: number }
  const myEvalBySub = new Map<string, FeedEval>()

  type AppRow = {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null; writer_response: string | null
    heat_earned: number
  }
  let allApplications: AppRow[] = []

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
      .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score, total_backing, backer_count, total_following, follower_count, poster_url')
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
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budgetRange = (budgetTier?.range as string) || null
        const budgetPerEp = (budgetTier?.per_episode as string) || null
        const leadChars = Array.isArray((evJson as any)?.lead_characters) ? (evJson as any).lead_characters : []
        myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: matchData.genres, format: matchData.format, logline, budget: matchData.budget, budgetRange, budgetPerEp, tags: matchData.tags, leadCharCount: leadChars.length })
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
          .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score, total_backing, backer_count, total_following, follower_count, poster_url')
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
            const packaging = (evJson?.packaging as Record<string, unknown>) || {}
            const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
            const budgetRange = (budgetTier?.range as string) || null
            const budgetPerEp = (budgetTier?.per_episode as string) || null
            const leadChars = Array.isArray((evJson as any)?.lead_characters) ? (evJson as any).lead_characters : []
            myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: matchData.genres, format: matchData.format, logline, budget: matchData.budget, budgetRange, budgetPerEp, tags: matchData.tags, leadCharCount: leadChars.length })
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

  // ── COLLABORATOR DATA (for stat card + per-script display) ──

  type CollabInfo = { id: string; email: string; name: string | null; avatarUrl: string | null; role: string; status: string }
  const collabCountByScript = new Map<string, number>()
  const crewCountByScript = new Map<string, number>()
  const castCountByScript = new Map<string, number>()
  const collabsByScript = new Map<string, CollabInfo[]>()

  if (user && submissionIds.length > 0) {
    const { data: allCollabRows } = await service
      .from('script_collaborators')
      .select('id, submission_id, collaborator_email, collaborator_id, role, role_other, status')
      .in('submission_id', submissionIds)
      .in('status', ['accepted', 'pending'])

    // Fetch profile info for collaborators who have accounts
    const collabUserIds = (allCollabRows || [])
      .map((c: any) => c.collaborator_id)
      .filter(Boolean) as string[]
    let collabProfiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
    if (collabUserIds.length > 0) {
      const { data: profileRows } = await service
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', collabUserIds)
      if (profileRows) {
        collabProfiles = Object.fromEntries(
          profileRows.map((p: any) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
        )
      }
    }

    for (const c of (allCollabRows || []) as any[]) {
      const roleName = c.role === 'other' ? (c.role_other || 'Collaborator') : c.role.replace('_', ' ').replace(/^\w/, (ch: string) => ch.toUpperCase())
      const prof = c.collaborator_id ? collabProfiles[c.collaborator_id] : null
      const info: CollabInfo = {
        id: c.id,
        email: c.collaborator_email,
        name: prof?.full_name || null,
        avatarUrl: prof?.avatar_url || null,
        role: roleName,
        status: c.status,
      }
      const list = collabsByScript.get(c.submission_id) || []
      list.push(info)
      collabsByScript.set(c.submission_id, list)

      if (c.status === 'accepted') {
        collabCountByScript.set(c.submission_id, (collabCountByScript.get(c.submission_id) || 0) + 1)
        const roleLC = (c.role || '').toLowerCase()
        const isCast = roleLC === 'actor' || roleLC === 'actress' || roleLC === 'cast'
        if (isCast) {
          castCountByScript.set(c.submission_id, (castCountByScript.get(c.submission_id) || 0) + 1)
        } else {
          crewCountByScript.set(c.submission_id, (crewCountByScript.get(c.submission_id) || 0) + 1)
        }
      }
    }
  }

  // ── COLLABORATIONS QUERY (scripts I'm collaborating on) ──

  type CollabScript = {
    id: string; title: string; format: string | null; genres: string[]
    score: number | null; evaluationId: string | null; createdAt: string
    totalBacking: number; backerCount: number; totalFollowing: number; followerCount: number
    posterUrl: string | null; collabRole: string; heatScore: number
  }
  let collabScripts: CollabScript[] = []

  // Pending collaboration requests (invites the user hasn't accepted yet)
  type PendingCollabRow = {
    id: string; submission_id: string; role: string; role_other: string | null
  }
  let pendingCollabRows: PendingCollabRow[] = []
  let pendingCollabSubIds: string[] = []

  if (user) {
    // Fetch collabs where user is the collaborator (scripts they were invited to)
    const { data: invitedToRows } = await service
      .from('script_collaborators')
      .select('id, collaborator_email, collaborator_id, role, role_other, submission_id, status')
      .or(`collaborator_id.eq.${user.id},collaborator_email.eq.${user.email?.toLowerCase()}`)
      .order('created_at', { ascending: false })

    if (invitedToRows && invitedToRows.length > 0) {
      // Separate accepted vs pending
      const acceptedRows = (invitedToRows as any[]).filter(c => c.status === 'accepted')
      const pendingRows = (invitedToRows as any[]).filter(c => c.status === 'pending')

      pendingCollabRows = pendingRows.map((c: any) => ({
        id: c.id,
        submission_id: c.submission_id,
        role: c.role,
        role_other: c.role_other,
      }))
      pendingCollabSubIds = [...new Set(pendingRows.map((c: any) => c.submission_id as string))]

      // Build accepted collaboration scripts
      const acceptedSubIds = [...new Set(acceptedRows.map((c: any) => c.submission_id as string))]
      if (acceptedSubIds.length > 0) {
        const { data: collabSubs } = await service
          .from('script_submissions')
          .select('id, title, declared_format, status, created_at, heat_score, total_backing, backer_count, total_following, follower_count, poster_url, is_public')
          .in('id', acceptedSubIds)
          .eq('status', 'completed')

        const collabSubIdsCompleted = (collabSubs || []).map((s: any) => s.id)
        let collabEvalsBySub: Record<string, any> = {}
        if (collabSubIdsCompleted.length > 0) {
          const { data: collabEvals } = await service
            .from('script_evaluations')
            .select('id, submission_id, weighted_score, evaluation')
            .in('submission_id', collabSubIdsCompleted)
          for (const ev of (collabEvals || []) as any[]) {
            const parsed = typeof ev.evaluation === 'string' ? JSON.parse(ev.evaluation) : ev.evaluation
            collabEvalsBySub[ev.submission_id] = { id: ev.id, weighted_score: ev.weighted_score, ...parsed }
          }
        }

        const roleBySubId = new Map<string, string>()
        for (const c of acceptedRows) {
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
            totalBacking: s.total_backing ?? 0,
            backerCount: s.backer_count ?? 0,
            totalFollowing: s.total_following ?? 0,
            followerCount: s.follower_count ?? 0,
            posterUrl: s.poster_url ?? null,
            collabRole: roleBySubId.get(s.id) || 'Collaborator',
            heatScore: s.heat_score ?? 0,
          }
        })
      }
    }
  }

  // ── PENDING COLLAB REQUESTS: fetch submission + owner data ──

  let collabRequests: CollabRequest[] = []

  if (user && pendingCollabSubIds.length > 0) {
    // Fetch submission details for pending invites
    const { data: pendingSubs } = await service
      .from('script_submissions')
      .select('id, title, poster_url, user_id')
      .in('id', pendingCollabSubIds)

    // Fetch owner profiles
    const ownerIds = [...new Set((pendingSubs || []).map((s: any) => s.user_id as string))]
    let ownerNames: Record<string, string> = {}
    if (ownerIds.length > 0) {
      const { data: ownerProfiles } = await service
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds)
      for (const p of (ownerProfiles || []) as { id: string; full_name: string | null }[]) {
        ownerNames[p.id] = p.full_name || 'Unknown'
      }
    }

    // Fetch scores for pending invite scripts
    let pendingScores: Record<string, number | null> = {}
    if (pendingCollabSubIds.length > 0) {
      const { data: pendingEvs } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score')
        .in('submission_id', pendingCollabSubIds)
      for (const e of (pendingEvs || []) as { submission_id: string; weighted_score: number | null }[]) {
        pendingScores[e.submission_id] = e.weighted_score
      }
    }

    const subMap = new Map((pendingSubs || []).map((s: any) => [s.id, s]))

    for (const row of pendingCollabRows) {
      const sub = subMap.get(row.submission_id)
      if (!sub) continue

      const roleName = row.role === 'other'
        ? (row.role_other || 'Collaborator')
        : row.role.replace('_', ' ').replace(/^\w/, (ch: string) => ch.toUpperCase())

      // Determine cast vs crew
      const roleLC = (row.role || '').toLowerCase()
      const isCast = roleLC === 'actor' || roleLC === 'actress' || roleLC === 'cast'
      const roleType: 'crew' | 'cast' = isCast ? 'cast' : 'crew'

      collabRequests.push({
        id: row.id,
        submission_id: row.submission_id,
        title: sub.title,
        poster_url: sub.poster_url ?? null,
        owner_name: ownerNames[sub.user_id] || 'Unknown',
        role_type: roleType,
        role_name: roleName,
        character_detail: null,
        score: pendingScores[row.submission_id] ?? null,
      })
    }
  }

  // ── DISCOVER RANK CALCULATION ──
  const scoreRankMap = new Map<string, number>()

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
    const oppIdsForRank = partnerOpps.map(o => o.id)
    if (oppIdsForRank.length > 0) {
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

  // ── BUILD ProjectCard[] FOR WRITER ──

  const isProcessing = visible.some(s => s.status === 'processing' || s.status === 'queued')
  const firstName = profile?.full_name?.split(' ')[0] || 'Writer'

  const projectCards: ProjectCard[] = []

  // Own scripts → role: 'creator'
  for (const s of visible) {
    const ev = myEvalBySub.get(s.id)
    const score = ev?.weighted_score ?? null
    const rounded = score != null ? Math.round(score) : null

    // Determine budget display — prefer actual dollar range from eval JSON
    let budgetDisplay: string | null = null
    if (ev?.budgetPerEp) {
      // Series: show per-episode range, strip verbose "/episode" suffix
      budgetDisplay = ev.budgetPerEp.trim().replace(/\/ep(isode)?\.?/i, '/ep')
    } else if (ev?.budgetRange) {
      budgetDisplay = ev.budgetRange.trim()
    }

    const crewCount = crewCountByScript.get(s.id) ?? 0
    const castCount = castCountByScript.get(s.id) ?? 0
    const backing = s.total_backing ?? 0
    const budgetHigh = parseBudgetHigh(ev?.budgetRange, ev?.budgetPerEp)
    const fundingNeeded = Math.max(0, budgetHigh - backing)
    const leadCharCount = ev?.leadCharCount ?? 0

    let status: 'processing' | 'completed' | 'error' = 'completed'
    if (s.status === 'processing' || s.status === 'queued') status = 'processing'
    else if (s.status === 'failed') status = 'error'

    projectCards.push({
      id: s.id,
      eval_id: ev?.id ?? null,
      title: s.title,
      logline: ev?.logline ?? null,
      poster_url: s.poster_url ?? null,
      score: rounded,
      tier: tierFromScore(rounded),
      format: ev?.format || s.declared_format,
      genres: ev?.genres || [],
      heat_score: s.heat_score ?? 0,
      budget_display: budgetDisplay,
      crew_count: crewCount,
      cast_count: castCount,
      backing_total: backing,
      following_total: s.total_following ?? 0,
      funding_needed: fundingNeeded,
      lead_char_count: leadCharCount,
      role: 'creator',
      collab_role_label: null,
      status,
      has_pending_apps: (pendingAppsByScript.get(s.id) ?? 0) > 0,
      needs_funding: backing > 0 && false,
      is_public: s.is_public ?? false,
      created_at: s.created_at,
    })
  }

  // Accepted collaboration scripts → role: 'collaborator'
  for (const s of collabScripts) {
    const rounded = s.score != null ? Math.round(s.score) : null

    projectCards.push({
      id: s.id,
      eval_id: s.evaluationId ?? null,
      title: s.title,
      logline: null,
      poster_url: s.posterUrl,
      score: rounded,
      tier: tierFromScore(rounded),
      format: s.format,
      genres: s.genres,
      heat_score: s.heatScore,
      budget_display: null,
      crew_count: 0,
      cast_count: 0,
      backing_total: s.totalBacking,
      following_total: s.totalFollowing,
      funding_needed: 0,
      lead_char_count: 0,
      role: 'collaborator',
      collab_role_label: s.collabRole,
      status: 'completed',
      has_pending_apps: false,
      needs_funding: false,
      is_public: false,
      created_at: s.createdAt,
    })
  }

  // ── RENDER ──

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
          /* ── WRITER DASHBOARD — ProjectHub ── */
          <ProjectHub
            projects={projectCards}
            requests={collabRequests}
            userName={firstName}
          />
        )}

      </div>
    </div>
    </div>
  )
}
