// /consideration/submit — Select scripts and submit for consideration.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ConsiderationForm } from '@/components/consideration/consideration-form'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { type OpportunityData } from '@/components/opportunities/opportunity-card'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ConsiderationSubmitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/consideration/submit')

  const service = svc()

  // Check if there's already an active consideration
  const { data: existing } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    redirect('/dashboard')
  }

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  const isPro = profile?.subscription_status === 'active'

  // Get all completed scripts
  const { data: scripts } = await supabase
    .from('script_submissions')
    .select('id, title, declared_format, created_at, status, hidden_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .is('hidden_at', null)
    .order('created_at', { ascending: true }) // oldest first so [0] is the first script

  const completedScripts = (scripts || []) as {
    id: string; title: string; declared_format: string | null; created_at: string
  }[]

  // Get evaluations for scores + matching data
  const scriptIds = completedScripts.map(s => s.id)
  type EvalInfo = { score: number | null; genre: string | null; budget: string | null }
  const evalMap = new Map<string, EvalInfo>()
  if (scriptIds.length > 0) {
    const { data: evals } = await service
      .from('script_evaluations')
      .select('submission_id, weighted_score, evaluation')
      .in('submission_id', scriptIds)
    for (const e of (evals || []) as { submission_id: string; weighted_score: number | null; evaluation: unknown }[]) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      const packaging = (evJson?.packaging as Record<string, unknown>) || {}
      const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
      const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
      evalMap.set(e.submission_id, { score: e.weighted_score, genre, budget })
    }
  }

  // Get active opportunities for matching
  const { data: allOppRows } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
  const opportunities = (allOppRows || []) as OpportunityData[]

  // Match scripts to open calls
  const matchesByScript = new Map<string, { title: string; slug: string }[]>()
  for (const opp of opportunities) {
    for (const sub of completedScripts) {
      const ev = evalMap.get(sub.id)
      if (!ev) continue
      const genreKey = ev.genre?.toLowerCase().replace(/[^a-z-]/g, '') || null
      if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format ?? '')) continue
      if (opp.genres.length > 0 && genreKey && !opp.genres.includes(genreKey)) continue
      if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
      if (opp.min_score != null && (ev.score == null || ev.score < opp.min_score)) continue
      if (!matchesByScript.has(sub.id)) matchesByScript.set(sub.id, [])
      matchesByScript.get(sub.id)!.push({ title: opp.title, slug: opp.slug ?? opp.id })
    }
  }

  // Find scripts that were in previous considerations (carry forward)
  const { data: pastConsiderations } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('status', 'reviewed')
    .order('submitted_at', { ascending: false })
    .limit(1)

  let carriedScriptIds: string[] = []
  if (pastConsiderations && pastConsiderations.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', pastConsiderations[0].id)
    carriedScriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)
  }

  // For trial users, only their first (oldest) script is eligible
  const firstScriptId = completedScripts.length > 0 ? completedScripts[0].id : null

  const scriptData = completedScripts.map(s => ({
    id: s.id,
    title: s.title,
    format: s.declared_format,
    score: evalMap.get(s.id)?.score ?? null,
    carriedForward: carriedScriptIds.includes(s.id),
    createdAt: s.created_at,
    eligible: isPro || s.id === firstScriptId,
    openCallMatches: matchesByScript.get(s.id) ?? [],
  }))

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <ConsiderationForm scripts={scriptData} isPro={isPro} />
      {!isPro && <UpgradeModalListener />}
    </div>
  )
}
