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
    poster_url: string | null; is_public: boolean | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at, heat_score, poster_url, is_public')
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

  // Fetch open opportunities for matching (all fields needed by scriptMatchesOpportunity)
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres, budget_tiers, tags, min_score')
    .eq('status', 'active')
  const opportunities = (openOpps || []) as { id: string; title: string; slug: string; formats: string[] | null; genres: string[] | null; budget_tiers: string[] | null; tags: string[] | null; min_score: number | null }[]

  function getMatchingOpportunities(ev: ScriptEvalData | undefined, declaredFormat: string | null) {
    if (!ev) return []
    const script = { format: ev.format || declaredFormat, genres: ev.genres, budget: ev.budget, tags: ev.tags, score: ev.score }
    return opportunities
      .filter(o => scriptMatchesOpportunity(script, o))
      .map(o => ({ title: o.title, slug: o.slug }))
  }

  // Fetch collaborator counts per script
  const collabCountByScript = new Map<string, number>()
  if (submissionIds.length > 0) {
    const { data: collabs } = await service
      .from('script_collaborators')
      .select('submission_id')
      .in('submission_id', submissionIds)
      .in('status', ['pending', 'accepted'])
    for (const c of (collabs || []) as { submission_id: string }[]) {
      collabCountByScript.set(c.submission_id, (collabCountByScript.get(c.submission_id) || 0) + 1)
    }
  }

  // Build script rows for client component (ScriptRowData-compatible)
  // Free users can see ALL their scripts — no locking.
  const scriptRows = allScripts.map(s => {
    const ev = evalBySub.get(s.id)
    const stillProcessing = s.status === 'processing' || s.status === 'queued'

    return {
      id: s.id,
      title: s.title,
      format: s.declared_format,
      genre: ev?.genres[0] ?? null,
      genres: ev?.genres ?? [],
      score: ev?.score ?? null,
      evaluationId: ev?.id ?? null,
      createdAt: s.created_at,
      heat: s.heat_score ?? 0,
      collaboratorCount: collabCountByScript.get(s.id) ?? 0,
      posterUrl: s.poster_url ?? null,
      isPublic: s.is_public ?? false,
      isProcessing: stillProcessing,
      isLocked: false,
      matchingOpportunities: getMatchingOpportunities(ev, s.declared_format),
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
