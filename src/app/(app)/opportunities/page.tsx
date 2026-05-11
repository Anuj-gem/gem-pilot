// /opportunities — browse open calls. PUBLIC page (no login required).
// v3 — plain-English labels, better descriptions, social-ready OG metadata.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const DEAL_TYPE_LABELS: Record<string, string> = {
  option: 'Option deal',
  purchase: 'Purchase',
  representation: 'Representation',
  co_finance: 'Production finance',
}

const PERSPECTIVE_LABELS: Record<string, string> = {
  producer: 'Producer',
  lit_rep: 'Lit rep',
  actor_rep: 'Talent rep',
  financier: 'Financier',
}

const GENRE_LABELS: Record<string, string> = {
  thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
  comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
  action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
}

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 60

export const metadata = {
  title: 'Open Calls — GEM',
  description:
    "Open calls from producers and lit reps. See what's looking for scripts like yours.",
  openGraph: {
    title: 'Open Calls — GEM',
    description:
      "Open calls from producers and lit reps. See what's looking for scripts like yours.",
    type: 'website' as const,
    siteName: 'GEM',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Open Calls — GEM',
    description:
      "Open calls from producers and lit reps. See what's looking for scripts like yours.",
  },
}

type OppRow = {
  id: string; title: string; description: string; slug: string | null
  formats: string[]; genres: string[]; budget_tiers: string[]
  min_score: number | null; deadline: string | null; status: string
  posted_by: string | null; perspective: string | null; deal_type: string | null
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
    isPro = profile?.subscription_status === 'active'
  }

  const { data: opps } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const opportunities = (opps || []) as OppRow[]

  // For logged-in users: figure out which opps they qualify for + which they've applied to
  const qualifiesForOpp = new Set<string>()
  const appliedToOpp = new Set<string>()

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

      const evalMap = new Map<string, { weighted_score: number | null; genre: string | null; budget: string | null }>()
      for (const ev of (evals || []) as any[]) {
        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
        const genre = ((cls.genre_primary as string) || (fmt.genre_primary as string) || '').toLowerCase().replace(/[^a-z-]/g, '') || null
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
        evalMap.set(ev.submission_id, { weighted_score: ev.weighted_score, genre, budget })
      }

      for (const opp of opportunities) {
        for (const sub of visibleSubs) {
          const ev = evalMap.get(sub.id)
          if (!ev) continue
          if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format)) continue
          if (opp.genres.length > 0 && ev.genre && !opp.genres.includes(ev.genre)) continue
          if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
          if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue
          qualifiesForOpp.add(opp.id)
          break // one qualifying script is enough
        }
      }
    }

    // Check which opps user has already applied to
    const { data: apps } = await service
      .from('considerations')
      .select('opportunity_id')
      .eq('writer_id', user.id)
      .not('opportunity_id', 'is', null)

    for (const a of (apps || []) as any[]) {
      appliedToOpp.add(a.opportunity_id)
    }
  }

  function formatDeadline(d: string) {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Closed'
    if (days === 1) return 'Closes tomorrow'
    if (days <= 7) return `${days} days left`
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1 m-0">Browse</p>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Open calls
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} currently open
          </p>
        </div>
        {user && (
          <Link href="/dashboard" className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors">
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
              Upload your script to see which calls you qualify for
            </p>
            <p className="text-[12.5px] text-gray-500 m-0 mt-1">
              Get scored in 60 seconds. Your first evaluation is free.
            </p>
          </div>
          <Link
            href="/start"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: '#7c3aed' }}
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Opportunity cards */}
      <div className="flex flex-col gap-3">
        {opportunities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-400">No open opportunities right now. Check back soon.</p>
          </div>
        ) : (
          opportunities.map((opp) => {
            const applied = appliedToOpp.has(opp.id)
            const qualifies = qualifiesForOpp.has(opp.id)
            const perspLabel = opp.perspective ? PERSPECTIVE_LABELS[opp.perspective] ?? opp.perspective : null
            const dealLabel = opp.deal_type ? DEAL_TYPE_LABELS[opp.deal_type] ?? opp.deal_type : null

            return (
              <Link
                key={opp.id}
                href={`/opportunities/${opp.slug ?? opp.id}`}
                className="block rounded-xl bg-white border border-gray-200 hover:border-purple-200 transition-colors overflow-hidden"
              >
                <div className="px-5 py-4">
                  {/* Row 1: Title + status/action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold text-gray-900 m-0 leading-snug">{opp.title}</h3>
                      {/* Plain-English subtitle: "Option deal · Producer · Apex Entertainment" */}
                      <p className="text-[12px] text-gray-400 m-0 mt-0.5">
                        {[dealLabel, perspLabel, opp.posted_by].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {/* Right side: status */}
                    {user ? (
                      applied ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">
                          Applied
                        </span>
                      ) : qualifies ? (
                        isPro ? (
                          <span className="text-[12px] font-semibold text-purple-600 shrink-0 flex items-center gap-0.5">
                            Apply <ArrowRight size={13} />
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-400 shrink-0">
                            Pro
                          </span>
                        )
                      ) : (
                        <ArrowRight size={15} className="text-gray-300 shrink-0 mt-0.5" />
                      )
                    ) : (
                      <span className="text-[12px] font-semibold text-purple-600 shrink-0 flex items-center gap-0.5">
                        Learn more <ArrowRight size={13} />
                      </span>
                    )}
                  </div>

                  {/* Description — 2-line clamp */}
                  <p className="text-[13px] text-gray-500 m-0 mt-2 line-clamp-2 leading-[1.55]">
                    {opp.description}
                  </p>

                  {/* Tags row — genres + deadline */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {opp.genres.length > 0 && opp.genres.slice(0, 3).map(g => (
                      <span key={g} className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{GENRE_LABELS[g] ?? g}</span>
                    ))}
                    {opp.budget_tiers.length > 0 && opp.budget_tiers.slice(0, 1).map(b => (
                      <span key={b} className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{b.charAt(0).toUpperCase() + b.slice(1)}</span>
                    ))}
                    {opp.deadline && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000) <= 7
                          ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {formatDeadline(opp.deadline)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
