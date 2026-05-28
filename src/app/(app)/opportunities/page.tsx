// /opportunities — browse open calls. PUBLIC page (no login required).
// v4 — vivid card redesign: color-coded deal badges, real status pills,
//       qualifying scripts dropdown, prominent score requirements.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { OpportunityCard, type OppStatus } from '@/components/opportunities/opportunity-card'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { normGenre, collectGenres, scriptMatchesOpportunity } from '@/lib/opportunity-matching'

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
    "Opportunities from our partner network. See what's looking for scripts like yours.",
  openGraph: {
    title: 'Opportunities — GEM',
    description:
      "Opportunities from our partner network. See what's looking for scripts like yours.",
    type: 'website' as const,
    siteName: 'GEM',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Opportunities — GEM',
    description:
      "Opportunities from our partner network. See what's looking for scripts like yours.",
  },
}

type OppRow = {
  id: string; title: string; description: string; slug: string | null
  formats: string[]; genres: string[]; budget_tiers: string[]; tags: string[]
  deadline: string | null; status: string
  posted_by: string | null; subtitle: string | null; created_at: string
  deal_type: string | null
}

export default async function OpportunitiesPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  const service = svc()

  // Check Pro status
  let isPro = false
  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  }

  const { data: opps } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const opportunities = (opps || []) as OppRow[]

  // Fetch total writers applied + last application per opportunity
  const oppIds = opportunities.map(o => o.id)
  const writersAppliedMap = new Map<string, number>()
  const lastAppMap = new Map<string, string>()
  if (oppIds.length > 0) {
    const { data: allCons } = await service
      .from('considerations')
      .select('opportunity_id, created_at')
      .in('opportunity_id', oppIds)
    for (const c of (allCons || []) as { opportunity_id: string; created_at: string }[]) {
      writersAppliedMap.set(c.opportunity_id, (writersAppliedMap.get(c.opportunity_id) || 0) + 1)
      const existing = lastAppMap.get(c.opportunity_id)
      if (!existing || c.created_at > existing) lastAppMap.set(c.opportunity_id, c.created_at)
    }
  }

  // For logged-in users: qualification + application status
  const oppMatchCount = new Map<string, number>()
  const oppStage = new Map<string, string>() // opp_id → review_stage
  const oppAppCount = new Map<string, number>() // opp_id → total application count

  if (user) {
    // Get non-hidden completed scripts
    const { data: userSubs } = await service
      .from('script_submissions')
      .select('id, title, declared_format, hidden_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const visibleSubs = ((userSubs || []) as any[]).filter((s: any) => !s.hidden_at)
    const subIds = visibleSubs.map((s: any) => s.id)

    if (subIds.length > 0) {
      const { data: evals } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score, evaluation')
        .in('submission_id', subIds)

      const evalMap = new Map<string, { weighted_score: number | null; genres: string[]; budget: string | null; tags: string[] }>()
      for (const ev of (evals || []) as any[]) {
        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const genres = collectGenres(
          cls.genre_primary as string,
          cls.genre_secondary as string[],
          cls.genre_tags as string[],
        )
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
        const tags = ((cls.tags as string[]) || []).map((t: string) => t.toLowerCase().replace(/\s+/g, '-'))
        evalMap.set(ev.submission_id, { weighted_score: ev.weighted_score, genres, budget, tags })
      }

      // Count qualifying scripts per opportunity
      for (const opp of opportunities) {
        let count = 0
        for (const sub of visibleSubs) {
          const ev = evalMap.get(sub.id)
          if (!ev) continue
          const declNorm = sub.declared_format === 'Feature film' ? 'Feature' : sub.declared_format
          const matches = scriptMatchesOpportunity(
            { format: declNorm, genres: ev.genres, budget: ev.budget, tags: ev.tags, score: ev.weighted_score },
            opp
          )
          if (matches) count++
        }
        oppMatchCount.set(opp.id, count)
      }
    }

    // Get consideration statuses per opportunity
    const { data: considerations } = await service
      .from('considerations')
      .select('opportunity_id, review_stage')
      .eq('writer_id', user.id)
      .not('opportunity_id', 'is', null)

    for (const c of (considerations || []) as any[]) {
      if (c.opportunity_id) {
        oppAppCount.set(c.opportunity_id, (oppAppCount.get(c.opportunity_id) || 0) + 1)
        const existing = oppStage.get(c.opportunity_id)
        // Non-complete stages take priority (writer has an active application)
        if (!existing || (existing === 'complete' && c.review_stage !== 'complete')) {
          oppStage.set(c.opportunity_id, c.review_stage || 'submitted')
        }
      }
    }
  }

  return (
    <div style={{ background: '#2b1a55', minHeight: '100vh' }}>
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-[28px] font-bold text-white m-0 mb-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Opportunities
        </h1>
        <p className="text-[14px] text-white/50 m-0 leading-relaxed max-w-[520px]">
          Real opportunities from our partner network — producers, lit reps, and financiers
          looking for scripts. Apply with your evaluated screenplay and get connected directly.
        </p>
        <p className="text-[13px] text-white/50 mt-2 m-0">
          {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} currently open
        </p>
      </div>

      {/* Logged-out CTA */}
      {!user && (
        <div
          className="rounded-2xl px-6 py-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05) 65%), rgba(255,255,255,0.05)',
            border: '1.5px solid rgba(124,58,237,0.3)',
          }}
        >
          <p className="text-[15px] font-bold text-white m-0 leading-snug">
            Upload your script to see which opportunities you qualify for
          </p>
          <Link
            href="/get-started"
            className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-bold text-white transition-all hover:brightness-110"
            style={{ background: '#7c3aed' }}
          >
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Opportunity cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {opportunities.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-white/40">No open opportunities right now. Check back soon.</p>
          </div>
        ) : (
          opportunities.map((opp) => {
            const stage = oppStage.get(opp.id)
            const status: OppStatus = stage ? (stage === 'complete' ? 'previously_applied' : 'pending') : 'available'
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
                status={status}
                matchingScriptCount={oppMatchCount.get(opp.id) ?? 0}
                isAnon={!user}
                applicationCount={oppAppCount.get(opp.id) ?? 0}
                writersApplied={writersAppliedMap.get(opp.id) ?? 0}
                lastApplicationAt={lastAppMap.get(opp.id) ?? null}
                dealType={opp.deal_type}
              />
            )
          })
        )}
      </div>
    </div>
    </div>
  )
}
