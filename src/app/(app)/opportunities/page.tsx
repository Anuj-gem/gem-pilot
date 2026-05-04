// /opportunities — browse open opportunities (login-gated).
// opportunities-v2 (2026-05-03). Simplified: no filters, scannable cards.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { OpportunityCard, type OpportunityData, type QualifyingScript } from '@/components/opportunities/opportunity-card'
import { UpgradeBanner } from '@/components/dashboard/upgrade-banner'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import Link from 'next/link'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 60

export default async function OpportunitiesPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/opportunities')

  const service = svc()

  // Check subscription
  const { data: profile } = await auth
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'

  // Monthly submission count for Pro users
  let monthlyUsed = 0
  if (isPro) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await service
      .from('opportunity_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('writer_id', user.id)
      .neq('status', 'withdrawn')
      .gte('submitted_at', monthStart)
    monthlyUsed = count ?? 0
  }

  // Fetch active opportunities
  const { data: opps } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const opportunities = (opps || []) as OpportunityData[]

  // Fetch user's completed scripts with their eval data for qualification matching
  const { data: userSubs } = await service
    .from('script_submissions')
    .select('id, title, declared_format, user_id')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const subIds = (userSubs || []).map((s: any) => s.id)

  let evalsBySubmission = new Map<string, { id: string; weighted_score: number | null; genre: string | null; budget: string | null }>()

  if (subIds.length > 0) {
    const { data: evals } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', subIds)

    for (const ev of (evals || []) as any[]) {
      const evJson = ev.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const genre = ((cls.genre_primary as string) || (fmt.genre_primary as string) || '').toLowerCase().replace(/[^a-z-]/g, '') || null
      const packaging = (evJson?.packaging as Record<string, unknown>) || {}
      const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
      const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
      evalsBySubmission.set(ev.submission_id, {
        id: ev.id,
        weighted_score: ev.weighted_score,
        genre,
        budget,
      })
    }
  }

  // Build qualification map: for each opportunity, which scripts qualify?
  function scriptsQualifyingFor(opp: OpportunityData): QualifyingScript[] {
    if (!userSubs) return []
    const qualifying: QualifyingScript[] = []
    for (const sub of userSubs as any[]) {
      const ev = evalsBySubmission.get(sub.id)
      if (!ev) continue
      if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format)) continue
      if (opp.genres.length > 0 && ev.genre && !opp.genres.includes(ev.genre)) continue
      if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
      if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue
      qualifying.push({ id: sub.id, title: sub.title, evaluation_id: ev.id })
    }
    return qualifying
  }

  const oppWithQualifications = opportunities.map(opp => ({
    opportunity: opp,
    qualifyingScripts: scriptsQualifyingFor(opp),
  }))

  return (
    <div className="max-w-2xl mx-auto">
      {!isPro && <UpgradeModalListener />}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1 m-0">Browse</p>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Open opportunities
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} accepting submissions
            {isPro && <span className="ml-2 text-purple-500 font-medium">&middot; {Math.max(0, 3 - monthlyUsed)} of 3 submissions left</span>}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
        >
          &larr; Dashboard
        </Link>
      </div>

      {!isPro && (
        <UpgradeBanner message="Upgrade to Pro to submit to opportunities" />
      )}

      <div className="flex flex-col gap-3">
        {oppWithQualifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-400">No open opportunities right now. Check back soon.</p>
          </div>
        ) : (
          oppWithQualifications.map(({ opportunity, qualifyingScripts }) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              qualifyingScripts={qualifyingScripts}
            />
          ))
        )}
      </div>
    </div>
  )
}
