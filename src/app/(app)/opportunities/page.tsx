// /opportunities — browse open opportunities (login-gated).
// opportunities-v1 (2026-05-02).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { OpportunityCard, type OpportunityData, type QualifyingScript } from '@/components/opportunities/opportunity-card'
import { OpportunitiesFilter } from '@/components/opportunities/opportunities-filter'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ format?: string; genre?: string; budget?: string }>
}

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/opportunities')

  const sp = await searchParams
  const service = svc()

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

      // Check format
      if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format)) continue
      // Check genre
      if (opp.genres.length > 0 && ev.genre && !opp.genres.includes(ev.genre)) continue
      // Check budget
      if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
      // Check min score
      if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue

      qualifying.push({ id: sub.id, title: sub.title, evaluation_id: ev.id })
    }
    return qualifying
  }

  // Client-side filter params
  const filterFormat = sp.format || 'all'
  const filterGenre = sp.genre || 'all'
  const filterBudget = sp.budget || 'all'

  const filtered = opportunities.filter(opp => {
    if (filterFormat !== 'all' && !opp.formats.some(f => f.toLowerCase().includes(filterFormat.toLowerCase()))) return false
    if (filterGenre !== 'all' && !opp.genres.includes(filterGenre)) return false
    if (filterBudget !== 'all' && !opp.budget_tiers.includes(filterBudget)) return false
    return true
  })

  // Build the qualification data for each opportunity
  const oppWithQualifications = filtered.map(opp => ({
    opportunity: opp,
    qualifyingScripts: scriptsQualifyingFor(opp),
  }))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 m-0">Opportunities</h1>
        <p className="text-[14px] text-gray-500 mt-1 m-0">
          Open calls we&apos;re sourcing for. Submit your scripts for real consideration.
        </p>
      </div>

      <OpportunitiesFilter
        currentFormat={filterFormat}
        currentGenre={filterGenre}
        currentBudget={filterBudget}
      />

      <div className="flex flex-col gap-3 mt-4">
        {oppWithQualifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-400">No opportunities match your filters.</p>
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
