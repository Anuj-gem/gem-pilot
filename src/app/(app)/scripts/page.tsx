// /scripts — "My Scripts" — full list with sort, bulk hide, three-dot menu.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { ScriptsList } from '@/components/dashboard/scripts-list'
import { UploadCTAButton } from '@/components/upload-cta-button'
import { NewScriptButton } from '@/components/dashboard/new-script-button'
import { scriptMatchesOpportunity, extractMatchData } from '@/lib/opportunity-matching'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ScriptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto">
        <header className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-bold text-white m-0" style={{ fontFamily: 'Georgia, serif' }}>
              Scripts
            </h1>
            <p className="text-[13px] text-white/50 mt-1 m-0">0 scripts evaluated</p>
          </div>
        </header>
        <div className="px-6 py-10 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 4 }}>
          <p className="text-[14px] font-semibold text-white m-0 mb-1">No scripts yet</p>
          <p className="text-[13px] m-0 mb-4" style={{ color: 'rgba(255,255,255,1)' }}>Upload a screenplay to get your first evaluation.</p>
          <UploadCTAButton
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors cursor-pointer border-0"
            style={{ background: 'var(--gem-accent)' }}
          >
            Upload a script
          </UploadCTAButton>
        </div>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, account_type')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const isTrial = !isPro
  const isProducer = (profile as any)?.account_type === 'producer'
  const service = svc()

  // Fetch scripts (exclude hidden legacy rows)
  type SubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; heat_score: number | null
    total_backing: number | null; backer_count: number | null
    total_following: number | null; follower_count: number | null
    poster_url: string | null; is_public: boolean | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at, heat_score, total_backing, backer_count, total_following, follower_count, poster_url, is_public')
    .eq('user_id', user.id)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  const allScripts = (mySubs as SubRow[] | null) || []
  const submissionIds = allScripts.map(s => s.id)

  // Evaluations — use canonical extractMatchData for full matching data
  type ScriptEvalData = { id: string; score: number | null; genres: string[]; format: string | null; budget: string | null; tags: string[] }
  const evalBySub = new Map<string, ScriptEvalData>()
  if (submissionIds.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (evs || []) as any[]) {
      const evJson = typeof e.evaluation === 'string' ? JSON.parse(e.evaluation) : (e.evaluation as Record<string, unknown> | null)
      const matchData = extractMatchData(evJson)
      evalBySub.set(e.submission_id, {
        id: e.id,
        score: e.weighted_score,
        genres: matchData.genres,
        format: matchData.format,
        budget: matchData.budget,
        tags: matchData.tags,
      })
    }
  }

  // Fetch open opportunities for matching
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, subtitle, formats, genres, budget_tiers, tags, min_score')
    .eq('status', 'active')
  const opportunities = (openOpps || []) as { id: string; title: string; slug: string; subtitle: string | null; formats: string[] | null; genres: string[] | null; budget_tiers: string[] | null; tags: string[] | null; min_score: number | null }[]

  function getQualifyingOpps(ev: ScriptEvalData | undefined, declaredFormat: string | null) {
    if (!ev) return []
    const script = { format: ev.format || declaredFormat, genres: ev.genres, budget: ev.budget, tags: ev.tags, score: ev.score }
    return opportunities
      .filter(o => scriptMatchesOpportunity(script, o))
      .map(o => ({ id: o.id, title: o.title, slug: o.slug, subtitle: o.subtitle }))
  }

  // ── COLLABORATOR DATA (full detail for GrowHeatSection) ──
  type CollabInfo = { id: string; email: string; name: string | null; avatarUrl: string | null; role: string; status: string }
  const collabCountByScript = new Map<string, number>()
  const collabHeatByScript = new Map<string, number>()
  const collabsByScript = new Map<string, CollabInfo[]>()

  if (submissionIds.length > 0) {
    const { data: allCollabRows } = await service
      .from('script_collaborators')
      .select('id, submission_id, collaborator_email, collaborator_id, role, role_other, status')
      .in('submission_id', submissionIds)
      .in('status', ['accepted', 'pending'])

    const collabUserIds = (allCollabRows || []).map((c: any) => c.collaborator_id).filter(Boolean) as string[]
    let collabProfiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
    if (collabUserIds.length > 0) {
      const { data: profileRows } = await service
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', collabUserIds)
      if (profileRows) {
        collabProfiles = Object.fromEntries(profileRows.map((p: any) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]))
      }
    }

    for (const c of (allCollabRows || []) as any[]) {
      const roleName = c.role === 'other' ? (c.role_other || 'Collaborator') : c.role.replace('_', ' ').replace(/^\w/, (ch: string) => ch.toUpperCase())
      const prof = c.collaborator_id ? collabProfiles[c.collaborator_id] : null
      const info: CollabInfo = { id: c.id, email: c.collaborator_email, name: prof?.full_name || null, avatarUrl: prof?.avatar_url || null, role: roleName, status: c.status }
      const list = collabsByScript.get(c.submission_id) || []
      list.push(info)
      collabsByScript.set(c.submission_id, list)

      if (c.status === 'accepted') {
        collabCountByScript.set(c.submission_id, (collabCountByScript.get(c.submission_id) || 0) + 1)
        collabHeatByScript.set(c.submission_id, (collabHeatByScript.get(c.submission_id) || 0) + 1)
      }
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

  // ── PENDING APPLICATION COUNTS PER SCRIPT ──
  const pendingAppsByScript = new Map<string, number>()
  const appliedScriptsByOpp = new Map<string, Set<string>>()

  if (submissionIds.length > 0) {
    const { data: allApps } = await service
      .from('considerations')
      .select('id, opportunity_id, status, review_stage')
      .eq('user_id', user.id)

    if (allApps && allApps.length > 0) {
      const considerationIds = allApps.map((a: any) => a.id)
      const { data: csRows } = await service
        .from('consideration_scripts')
        .select('script_submission_id, consideration_id')
        .in('consideration_id', considerationIds)

      const considerationToOpp = new Map(allApps.map((a: any) => [a.id, a.opportunity_id]))
      for (const row of (csRows || []) as { script_submission_id: string; consideration_id: string }[]) {
        const oppId = considerationToOpp.get(row.consideration_id)
        if (!oppId) continue
        if (!appliedScriptsByOpp.has(oppId)) appliedScriptsByOpp.set(oppId, new Set())
        appliedScriptsByOpp.get(oppId)!.add(row.script_submission_id)
      }

      for (const app of allApps as any[]) {
        if (app.status === 'reviewed' || app.review_stage === 'complete') continue
        for (const row of (csRows || []) as { script_submission_id: string; consideration_id: string }[]) {
          if (row.consideration_id === app.id) {
            pendingAppsByScript.set(row.script_submission_id, (pendingAppsByScript.get(row.script_submission_id) || 0) + 1)
          }
        }
      }
    }
  }

  // Build script rows for client component
  const scriptRows = allScripts.map(s => {
    const ev = evalBySub.get(s.id)
    const stillProcessing = s.status === 'processing' || s.status === 'queued'
    const qualifyingOpps = getQualifyingOpps(ev, s.declared_format)
      .filter(o => {
        const scriptsApplied = appliedScriptsByOpp.get(o.id)
        return !scriptsApplied || !scriptsApplied.has(s.id)
      })

    return {
      id: s.id,
      title: s.title,
      format: s.declared_format,
      genre: ev?.genres[0] ?? null,
      genres: ev?.genres ?? [],
      score: ev?.score ?? null,
      evaluationId: ev?.id ?? null,
      createdAt: s.created_at,
      totalBacking: s.total_backing ?? 0,
      backerCount: s.backer_count ?? 0,
      totalFollowing: s.total_following ?? 0,
      followerCount: s.follower_count ?? 0,
      collaboratorCount: collabCountByScript.get(s.id) ?? 0,
      collaborators: collabsByScript.get(s.id) ?? [],
      posterUrl: s.poster_url ?? null,
      isPublic: s.is_public ?? false,
      isProcessing: stillProcessing,
      isFailed: s.status === 'failed',
      isLocked: false,
      qualifyingOpps: qualifyingOpps,
      availableOppCount: qualifyingOpps.length,
      pendingAppCount: pendingAppsByScript.get(s.id) ?? 0,
      scoreRank: scoreRankMap.get(s.id) ?? null,
      hidden: !!s.hidden_at,
    }
  })

  const visibleCount = scriptRows.filter(s => !s.hidden).length

  return (
    <div className="max-w-3xl mx-auto">
      {isTrial && <UpgradeModalListener />}

      <header className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-white m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Scripts
          </h1>
          <p className="text-[13px] text-white/50 mt-1 m-0">
            {visibleCount} {visibleCount === 1 ? 'script' : 'scripts'} evaluated
          </p>
        </div>
        {isProducer && <NewScriptButton />}
      </header>

      {/* Script list (client component) */}
      <ScriptsList scripts={scriptRows} isPro={isPro} />
    </div>
  )
}
