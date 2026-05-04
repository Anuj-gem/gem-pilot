// /opportunities — browse open opportunities. PUBLIC page (no login required).
// Logged-in users see which of their scripts qualify for each opportunity.
// Logged-out users see the opportunities with a CTA to sign up.
// opportunities-v3 (2026-05-03).

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { OpportunityCard, type OpportunityData, type QualifyingScript } from '@/components/opportunities/opportunity-card'
import { UpgradeBanner } from '@/components/dashboard/upgrade-banner'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 60

export const metadata = {
  title: 'Opportunities — GEM',
  description:
    'Browse active opportunities from producers, lit reps, and financiers. Submit your qualifying scripts directly — no query letters, no entry fees.',
}

export default async function OpportunitiesPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  const service = svc()

  // Check subscription (only if logged in)
  let isPro = false
  let monthlyUsed = 0
  let monthlyLimit = 3
  if (user) {
    const { data: profile } = await auth
      .from('profiles')
      .select('subscription_status, bonus_submissions')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active'
    const bonusSubs = (profile as any)?.bonus_submissions ?? 0
    monthlyLimit = 3 + bonusSubs

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
  }

  // Fetch active opportunities
  const { data: opps } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const opportunities = (opps || []) as OpportunityData[]

  // Fetch user's completed scripts with their eval data (only if logged in)
  let oppWithQualifications: { opportunity: OpportunityData; qualifyingScripts: QualifyingScript[] }[] = []

  if (user) {
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

    oppWithQualifications = opportunities.map(opp => ({
      opportunity: opp,
      qualifyingScripts: scriptsQualifyingFor(opp),
    }))
  } else {
    // Logged-out: show opportunities without qualification data
    oppWithQualifications = opportunities.map(opp => ({
      opportunity: opp,
      qualifyingScripts: [],
    }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      {user && !isPro && <UpgradeModalListener />}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1 m-0">Browse</p>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Open opportunities
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} accepting submissions
            {user && isPro && (() => {
              const monthlyLeft = Math.max(0, 3 - Math.min(monthlyUsed, 3))
              const bonus = (monthlyLimit - 3)
              const total = monthlyLeft + bonus
              const now = new Date()
              const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
              const resetDays = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              if (total > 0) {
                return <span className="ml-2 text-purple-500 font-medium">&middot; {total} submission{total !== 1 ? 's' : ''} left{bonus > 0 ? ` (${bonus} bonus)` : ''}</span>
              }
              return <span className="ml-2 text-gray-400 font-medium">&middot; All used · 3 more in {resetDays}d</span>
            })()}
          </p>
        </div>
        {user && (
          <Link
            href="/dashboard"
            className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
          >
            &larr; Dashboard
          </Link>
        )}
      </div>

      {/* Logged-out CTA */}
      {!user && (
        <div
          className="rounded-xl px-5 py-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02) 65%), #fff',
            border: '1.5px solid rgba(124,58,237,0.20)',
          }}
        >
          <div>
            <p className="text-[14px] font-bold text-gray-900 m-0 leading-snug">
              Submit your script and see which opportunities you qualify for
            </p>
            <p className="text-[12.5px] text-gray-500 m-0 mt-1">
              Upload your screenplay, get a structured evaluation, and match to real opportunities.
            </p>
          </div>
          <Link
            href="/submit"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: '#7c3aed' }}
          >
            Get your free evaluation <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {user && !isPro && (
        <UpgradeBanner message="Upgrade to Pro to submit to opportunities" />
      )}

      <div className="flex flex-col gap-3">
        {oppWithQualifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-400">No open opportunities right now. Check back soon.</p>
          </div>
        ) : (
          oppWithQualifications.map(({ opportunity, qualifyingScripts }) => (
            <div key={opportunity.id}>
              <OpportunityCard
                opportunity={opportunity}
                qualifyingScripts={qualifyingScripts}
              />
              {/* Logged-out: show sign-in prompt per card */}
              {!user && (
                <div className="mt-1.5 mb-1 px-3">
                  <Link
                    href="/submit"
                    className="text-[11.5px] font-medium text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    Sign in to see if your scripts qualify →
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
