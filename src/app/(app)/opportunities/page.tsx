// /opportunities — browse open calls. PUBLIC page (no login required).
// v4 — vivid card redesign: color-coded deal badges, real status pills,
//       qualifying scripts dropdown, prominent score requirements.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { OpportunityListingCard, type QualScript } from '@/components/opportunities/opportunity-listing-card'
import { ArrowRight } from 'lucide-react'
import { UploadCTAButton } from '@/components/upload-cta-button'

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
  posted_by: string | null; subtitle: string | null
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
    .eq('published', true)
    .order('created_at', { ascending: false })

  const opportunities = (opps || []) as OppRow[]

  // For logged-in users: qualification + application status + qualifying scripts per opp
  const oppQualScripts = new Map<string, QualScript[]>()
  const oppStage = new Map<string, string>() // opp_id → review_stage

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

      // Normalize genre string: lowercase, unify dashes, strip junk
      function normGenre(g: string | null | undefined): string {
        return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
      }

      // Collect unique non-empty normalized genres
      function collectGenres(...sources: (string | string[] | null | undefined)[]): string[] {
        const set = new Set<string>()
        for (const s of sources) {
          if (!s) continue
          const items = Array.isArray(s) ? s : [s]
          for (const item of items) {
            const n = normGenre(item)
            if (n) set.add(n)
          }
        }
        return Array.from(set)
      }

      const evalMap = new Map<string, { weighted_score: number | null; genres: string[]; budget: string | null }>()
      for (const ev of (evals || []) as any[]) {
        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        // Collect ALL genres: primary + secondary + legacy genre_tags
        const genres = collectGenres(
          cls.genre_primary as string,
          cls.genre_secondary as string[],
          cls.genre_tags as string[],
        )
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
        evalMap.set(ev.submission_id, { weighted_score: ev.weighted_score, genres, budget })
      }

      // Build qualifying scripts per opportunity
      for (const opp of opportunities) {
        const scripts: QualScript[] = []
        for (const sub of visibleSubs) {
          const ev = evalMap.get(sub.id)
          if (!ev) continue
          if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format)) continue
          // Genre match: any of the script's genres (primary + secondary + tags)
          // overlaps with any of the opportunity's genres (substring match both ways)
          if (opp.genres.length > 0 && ev.genres.length > 0) {
            const oppGenresNorm = opp.genres.map(normGenre)
            const hasOverlap = ev.genres.some(sg =>
              oppGenresNorm.some(og => sg.includes(og) || og.includes(sg))
            )
            if (!hasOverlap) continue
          }
          if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
          if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue
          scripts.push({
            id: sub.id,
            title: sub.title,
            score: ev.weighted_score,
            format: sub.declared_format,
          })
        }
        oppQualScripts.set(opp.id, scripts)
      }
    }

    // Get consideration statuses per opportunity
    const { data: considerations } = await service
      .from('considerations')
      .select('opportunity_id, review_stage')
      .eq('writer_id', user.id)
      .not('opportunity_id', 'is', null)

    for (const c of (considerations || []) as any[]) {
      if (c.opportunity_id && c.review_stage) {
        oppStage.set(c.opportunity_id, c.review_stage)
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1
            className="text-[28px] font-bold text-gray-900 m-0"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Open Calls
          </h1>
          <p className="text-[14px] text-gray-500 mt-1 m-0">
            {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} currently open
          </p>
        </div>
        {user && (
          <Link href="/dashboard" className="text-[13px] font-semibold text-gray-400 hover:text-gray-700 transition-colors">
            &larr; Dashboard
          </Link>
        )}
      </div>

      {/* Logged-out CTA */}
      {!user && (
        <div
          className="rounded-2xl px-6 py-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02) 65%), #fff',
            border: '1.5px solid rgba(124,58,237,0.25)',
          }}
        >
          <div>
            <p className="text-[15px] font-bold text-gray-900 m-0 leading-snug">
              Upload your script to see which calls you qualify for
            </p>
            <p className="text-[13px] text-gray-500 m-0 mt-1">
              Applying to opportunities is a <span className="font-semibold text-purple-600">GEM Pro</span> feature. Your first evaluation is free.
            </p>
          </div>
          <UploadCTAButton
            className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-bold text-white transition-all hover:brightness-110 cursor-pointer border-0"
            style={{ background: '#7c3aed' }}
          >
            Upload a script <ArrowRight size={15} />
          </UploadCTAButton>
        </div>
      )}

      {/* Opportunity cards */}
      <div className="flex flex-col gap-4">
        {opportunities.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-gray-400">No open opportunities right now. Check back soon.</p>
          </div>
        ) : (
          opportunities.map((opp) => (
            <OpportunityListingCard
              key={opp.id}
              id={opp.id}
              slug={opp.slug}
              title={opp.title}
              subtitle={opp.subtitle}
              description={opp.description}
              posted_by={opp.posted_by}
              genres={opp.genres || []}
              formats={opp.formats || []}
              budget_tiers={opp.budget_tiers || []}
              min_score={opp.min_score}
              deadline={opp.deadline}
              review_stage={oppStage.get(opp.id) ?? null}
              qualifying_scripts={oppQualScripts.get(opp.id) ?? []}
              is_pro={isPro}
              is_logged_in={!!user}
            />
          ))
        )}
      </div>
    </div>
  )
}
