// /opportunities/[slug] — individual opportunity detail page.
// Shareable URL for marketing each gig individually.
// opportunities-v1 (2026-05-02).

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Metadata } from 'next'
import { type SubmissionState } from '@/components/opportunities/submit-button'
import { SubmissionList } from '@/components/opportunities/submission-list'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = svc()
  const { data: opp } = await service
    .from('opportunities')
    .select('title, description')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!opp) return { title: 'Opportunity not found — GEM' }
  return {
    title: `${opp.title} — GEM Opportunities`,
    description: opp.description?.slice(0, 160),
  }
}

const GENRE_LABELS: Record<string, string> = {
  thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
  comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
  action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
}

const BUDGET_LABELS: Record<string, string> = {
  micro: 'Micro (<$1M)', indie: 'Indie ($1-5M)', mid: 'Mid ($5-20M)',
  studio: 'Studio ($20-80M)', premium: 'Premium', tentpole: 'Tentpole ($80M+)',
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { slug } = await params
  const service = svc()

  const { data: opp } = await service
    .from('opportunities')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!opp) notFound()

  // Check if user is logged in — show qualification info if so
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  let qualifyingScripts: { id: string; title: string; evaluation_id: string }[] = []
  const existingSubmissions = new Map<string, SubmissionState>()
  let totalActiveSubmissions = 0
  // Limit is enforced client-side in SubmissionList (5 pending max)

  if (user) {
    const { data: userSubs } = await service
      .from('script_submissions')
      .select('id, title, declared_format')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const subIds = (userSubs || []).map((s: any) => s.id)

    if (subIds.length > 0) {
      const { data: evals } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score, evaluation')
        .in('submission_id', subIds)

      for (const sub of (userSubs || []) as any[]) {
        const ev = (evals || []).find((e: any) => e.submission_id === sub.id) as any
        if (!ev) continue
        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
        const genre = ((cls.genre_primary as string) || (fmt.genre_primary as string) || '').toLowerCase().replace(/[^a-z-]/g, '') || null
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null

        let qualifies = true
        if (opp.formats?.length > 0 && !opp.formats.includes(sub.declared_format)) qualifies = false
        if (opp.genres?.length > 0 && genre && !opp.genres.includes(genre)) qualifies = false
        if (opp.budget_tiers?.length > 0 && budget && !opp.budget_tiers.includes(budget)) qualifies = false
        if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) qualifies = false

        if (qualifies) {
          qualifyingScripts.push({ id: sub.id, title: sub.title, evaluation_id: ev.id })
        }
      }
    }

    // Fetch existing submissions for this opportunity
    const qualifyingSubIds = qualifyingScripts.map(s => s.id)
    if (qualifyingSubIds.length > 0) {
      const { data: existingSubs } = await service
        .from('opportunity_submissions')
        .select('id, submission_id, status, feedback')
        .eq('opportunity_id', opp.id)
        .in('submission_id', qualifyingSubIds)
        .neq('status', 'withdrawn')
      for (const es of (existingSubs || []) as { id: string; submission_id: string; status: string; feedback: string | null }[]) {
        existingSubmissions.set(es.submission_id, { id: es.id, status: es.status as any, feedback: es.feedback })
      }
    }

    // Count active submissions across ALL opportunities for limit check
    const { count: activeCount } = await service
      .from('opportunity_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('writer_id', user.id)
      .eq('status', 'pending')
    totalActiveSubmissions = activeCount ?? 0
  }

  const deadline = opp.deadline ? new Date(opp.deadline) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-400 hover:text-gray-700 transition-colors mb-4"
      >
        ← All opportunities
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <h1 className="text-[20px] font-bold text-gray-900 m-0 mb-2">{opp.title}</h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {opp.posted_by && (
              <span className="text-[12.5px] text-gray-500">Posted by {opp.posted_by}</span>
            )}
            {deadline && daysLeft != null && (
              <span className={`text-[12.5px] font-medium ${daysLeft <= 7 ? 'text-red-500' : 'text-gray-500'}`}>
                {daysLeft <= 0 ? 'Closed' : `${daysLeft} days left`}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-[14.5px] text-gray-700 leading-[1.65] m-0 mb-5 whitespace-pre-line">
            {opp.description}
          </p>

          {/* Requirements */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wide m-0 mb-3">
              What we&apos;re looking for
            </h2>
            <div className="flex flex-col gap-2.5">
              {opp.formats?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-gray-400 w-16 flex-shrink-0">Format</span>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.formats.map((f: string) => (
                      <span key={f} className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {opp.genres?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-gray-400 w-16 flex-shrink-0">Genre</span>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.genres.map((g: string) => (
                      <span key={g} className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{GENRE_LABELS[g] ?? g}</span>
                    ))}
                  </div>
                </div>
              )}
              {opp.budget_tiers?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-gray-400 w-16 flex-shrink-0">Budget</span>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.budget_tiers.map((b: string) => (
                      <span key={b} className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{BUDGET_LABELS[b] ?? b}</span>
                    ))}
                  </div>
                </div>
              )}
              {opp.min_score && (
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-gray-400 w-16 flex-shrink-0">Score</span>
                  <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    Minimum {opp.min_score}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Qualification section */}
          {user ? (
            <div className="border-t border-gray-100 pt-4">
              <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wide m-0 mb-3">
                Your scripts
              </h2>
              {qualifyingScripts.length > 0 ? (
                <SubmissionList
                  opportunityId={opp.id}
                  scripts={qualifyingScripts.map(s => ({ id: s.id, title: s.title }))}
                  existingSubmissions={Object.fromEntries(existingSubmissions)}
                  pendingCount={totalActiveSubmissions}
                />
              ) : (
                <div className="px-3 py-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-[13px] text-gray-500 m-0">
                    None of your scripts match this opportunity yet.{' '}
                    <Link href="/submit" className="text-purple-600 font-semibold hover:underline">
                      Submit a new script
                    </Link>{' '}
                    that fits the criteria above.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-4">
              <div className="px-3 py-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-[13px] text-gray-500 m-0">
                  <Link href={`/login?redirect=/opportunities/${opp.slug}`} className="text-purple-600 font-semibold hover:underline">
                    Sign in
                  </Link>{' '}
                  to see if your scripts qualify for this opportunity.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
