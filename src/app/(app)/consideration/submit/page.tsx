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

  // Check if there's already an active consideration (edit mode)
  const { data: existing } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('status', 'pending')
    .limit(1)

  const isEditing = existing && existing.length > 0
  let currentScriptIds: string[] = []

  // Check subscription status (needed for gate logic below)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'

  if (isEditing) {
    // Load current scripts for this consideration
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', existing[0].id)
    currentScriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)
  } else {
    // Check eligibility — must have unreviewed scripts (not attached to any consideration)
    const { data: pastCons } = await service
      .from('considerations')
      .select('id')
      .eq('writer_id', user.id)
    const hasBeenReviewed = (pastCons || []).length > 0

    if (hasBeenReviewed) {
      // TRIAL GATE: free users who've been reviewed once cannot resubmit
      if (!isPro) {
        redirect('/dashboard')
      }

      // Check for scripts NOT in any consideration
      const conIds = (pastCons || []).map((c: { id: string }) => c.id)
      let reviewedScriptIds: Set<string> = new Set()
      if (conIds.length > 0) {
        const { data: conScripts } = await service
          .from('consideration_scripts')
          .select('script_submission_id')
          .in('consideration_id', conIds)
        for (const r of (conScripts || []) as { script_submission_id: string }[]) {
          reviewedScriptIds.add(r.script_submission_id)
        }
      }

      const { data: allCompleted } = await supabase
        .from('script_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('hidden_at', null)

      const hasUnreviewed = (allCompleted || []).some(
        (s: { id: string }) => !reviewedScriptIds.has(s.id)
      )

      if (!hasUnreviewed) {
        redirect('/dashboard')
      }
    }
  }

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
  function normGenre(g: string | null | undefined): string {
    return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  type EvalInfo = { score: number | null; genres: string[]; budget: string | null }
  const evalMap = new Map<string, EvalInfo>()
  if (scriptIds.length > 0) {
    const { data: evals } = await service
      .from('script_evaluations')
      .select('submission_id, weighted_score, evaluation')
      .in('submission_id', scriptIds)
    for (const e of (evals || []) as { submission_id: string; weighted_score: number | null; evaluation: unknown }[]) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const genreSet = new Set<string>()
      for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
        const n = normGenre(raw)
        if (n) genreSet.add(n)
      }
      const packaging = (evJson?.packaging as Record<string, unknown>) || {}
      const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
      const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
      evalMap.set(e.submission_id, { score: e.weighted_score, genres: Array.from(genreSet), budget })
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
      if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format ?? '')) continue
      if (opp.genres.length > 0 && ev.genres.length > 0) {
        const oppNorm = opp.genres.map(normGenre)
        const hasOverlap = ev.genres.some((sg: string) => oppNorm.some((og: string) => sg.includes(og) || og.includes(sg)))
        if (!hasOverlap) continue
      }
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
      <ConsiderationForm scripts={scriptData} isPro={isPro} isEditing={!!isEditing} currentScriptIds={currentScriptIds} />
      {!isPro && <UpgradeModalListener />}
    </div>
  )
}
