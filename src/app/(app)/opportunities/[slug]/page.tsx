// /opportunities/[slug] — individual opportunity detail page.
// v3 — council-recommended redesign: deal explanation leads, plain English, conditional CTAs.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'

const DEAL_TYPE_LABELS: Record<string, string> = {
  option: 'Option deal', purchase: 'Purchase',
  representation: 'Representation', co_finance: 'Production finance',
}
const PERSPECTIVE_LABELS: Record<string, string> = {
  producer: 'Producer', lit_rep: 'Lit rep',
  actor_rep: 'Talent rep', financier: 'Financier',
}
const GENRE_LABELS: Record<string, string> = {
  thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
  comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
  action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
}
const BUDGET_LABELS: Record<string, string> = {
  micro: 'Micro budget', indie: 'Indie budget', mid: 'Mid budget',
  studio: 'Studio budget', premium: 'Premium', tentpole: 'Tentpole',
}
const DEAL_DESCRIPTIONS: Record<string, string> = {
  option: 'They option your script with a path to production. You retain rights until a purchase is triggered. WGA minimums apply.',
  purchase: 'Outright script purchase at WGA scale or above. Writer stays attached for credit and rewrites.',
  representation: 'Join their roster and have someone actively selling your work to producers and studios.',
  co_finance: 'Production financing with shared backend. They put up the money, you share in distribution revenue.',
}

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
    .select('title, description, deal_type, perspective')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!opp) return { title: 'Opportunity not found — GEM' }
  const perspLabel = opp.perspective ? PERSPECTIVE_LABELS[opp.perspective] : null
  const dealLabel = opp.deal_type ? DEAL_TYPE_LABELS[opp.deal_type] : null
  const subtitle = [dealLabel, perspLabel].filter(Boolean).join(' · ')
  const desc = subtitle
    ? `${subtitle} — ${opp.description?.slice(0, 120) ?? ''}`
    : opp.description?.slice(0, 140) ?? ''
  const title = `${opp.title} — GEM`
  return {
    title, description: desc,
    openGraph: { title, description: desc, type: 'article', siteName: 'GEM' },
    twitter: { card: 'summary_large_image', title, description: desc },
  }
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

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  // Qualification + application check (logged-in only)
  let qualifies = false
  let hasApplied = false
  let isPro = false

  if (user) {
    // Check Pro status
    const { data: profile } = await service
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active'
    // Check for existing application
    const { data: existingApp } = await service
      .from('considerations')
      .select('id')
      .eq('writer_id', user.id)
      .eq('opportunity_id', opp.id)
      .limit(1)

    hasApplied = (existingApp || []).length > 0

    // Check qualifying scripts (non-hidden only)
    const { data: userSubs } = await service
      .from('script_submissions')
      .select('id, declared_format, hidden_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const visibleSubs = ((userSubs || []) as any[]).filter((s: any) => !s.hidden_at)
    const subIds = visibleSubs.map((s: any) => s.id)

    if (subIds.length > 0) {
      const { data: evals } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score, evaluation')
        .in('submission_id', subIds)

      for (const sub of visibleSubs) {
        const ev = ((evals || []) as any[]).find((e: any) => e.submission_id === sub.id)
        if (!ev) continue
        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
        const genre = ((cls.genre_primary as string) || (fmt.genre_primary as string) || '').toLowerCase().replace(/[^a-z-]/g, '') || null
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null

        let ok = true
        if (opp.formats?.length > 0 && !opp.formats.includes(sub.declared_format)) ok = false
        if (opp.genres?.length > 0 && genre && !opp.genres.includes(genre)) ok = false
        if (opp.budget_tiers?.length > 0 && budget && !opp.budget_tiers.includes(budget)) ok = false
        if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) ok = false

        if (ok) { qualifies = true; break }
      }
    }
  }

  const deadline = opp.deadline ? new Date(opp.deadline) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
  const perspLabel = opp.perspective ? PERSPECTIVE_LABELS[opp.perspective] ?? opp.perspective : null
  const dealLabel = opp.deal_type ? DEAL_TYPE_LABELS[opp.deal_type] ?? opp.deal_type : null

  // Build subtitle line: "Option deal · Producer · Apex Entertainment · 14 days left"
  const subtitleParts = [dealLabel, perspLabel, opp.posted_by].filter(Boolean)
  const deadlineText = daysLeft != null
    ? daysLeft <= 0 ? 'Closed' : daysLeft === 1 ? 'Closes tomorrow' : `${daysLeft} days left`
    : null

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-400 hover:text-gray-700 transition-colors mb-4"
      >
        &larr; All opportunities
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-6">

          {/* ── Title + subtitle ── */}
          <h1 className="text-[22px] font-bold text-gray-900 m-0 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {opp.title}
          </h1>
          <p className="text-[12.5px] text-gray-400 m-0 mb-5">
            {subtitleParts.join(' · ')}
            {deadlineText && (
              <>
                {subtitleParts.length > 0 && ' · '}
                <span className={daysLeft != null && daysLeft <= 7 && daysLeft > 0 ? 'text-red-500' : daysLeft != null && daysLeft <= 0 ? 'text-gray-400' : ''}>
                  {deadlineText}
                </span>
              </>
            )}
          </p>

          {/* ── 1. Deal explanation — FIRST, above the fold ── */}
          {opp.deal_type && DEAL_DESCRIPTIONS[opp.deal_type] && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 mb-5">
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide m-0 mb-1">What you get</p>
              <p className="text-[13.5px] text-emerald-800 leading-[1.6] m-0">
                <span className="font-semibold">{dealLabel}.</span>{' '}
                {DEAL_DESCRIPTIONS[opp.deal_type]}
              </p>
            </div>
          )}

          {/* ── 2. Description ── */}
          <div className="mb-5">
            <p className="text-[14px] text-gray-700 leading-[1.7] m-0 whitespace-pre-line">
              {opp.description}
            </p>
          </div>

          {/* ── 3. Requirements ── */}
          {((opp.formats?.length > 0) || (opp.genres?.length > 0) || (opp.budget_tiers?.length > 0)) && (
            <div className="border-t border-gray-100 pt-4 mb-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-2">Looking for</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.formats?.map((f: string) => (
                  <span key={f} className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">{f}</span>
                ))}
                {opp.genres?.map((g: string) => (
                  <span key={g} className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{GENRE_LABELS[g] ?? g}</span>
                ))}
                {opp.budget_tiers?.map((b: string) => (
                  <span key={b} className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{BUDGET_LABELS[b] ?? b}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── 4. CTA — conditional on auth + qualification ── */}
          <div className="border-t border-gray-100 pt-5">
            {user ? (
              hasApplied ? (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <p className="text-[13px] text-gray-500 m-0 font-medium">You&apos;ve already applied to this opportunity.</p>
                  <Link href="/dashboard" className="text-[13px] font-semibold text-purple-600 hover:text-purple-800 shrink-0">
                    View status &rarr;
                  </Link>
                </div>
              ) : qualifies ? (
                isPro ? (
                  <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-3">
                    <p className="text-[13px] text-purple-800 m-0 mb-3 font-medium">
                      You have a qualifying script. Apply now and we&apos;ll share it with the {perspLabel?.toLowerCase() ?? 'reviewer'}.
                    </p>
                    <Link
                      href={`/opportunities/${opp.slug}/apply`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:brightness-110"
                      style={{ background: '#7c3aed' }}
                    >
                      Apply now <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                    <p className="text-[13px] text-gray-700 m-0 mb-1 font-medium">
                      You have a qualifying script for this opportunity.
                    </p>
                    <p className="text-[12.5px] text-gray-500 m-0 mb-3">
                      Upgrade to Pro to apply directly and get your script in front of the {perspLabel?.toLowerCase() ?? 'reviewer'}.
                    </p>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/#pricing"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:brightness-110"
                        style={{ background: '#7c3aed' }}
                      >
                        Upgrade to Pro <ArrowRight size={14} />
                      </Link>
                      <span className="text-[12px] text-gray-400">$20/mo</span>
                    </div>
                  </div>
                )
              ) : (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                  <p className="text-[13px] text-gray-500 m-0">
                    None of your scripts currently match this opportunity&apos;s requirements. Upload a new script that fits the criteria above.
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-lg px-4 py-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02) 65%)', border: '1.5px solid rgba(124,58,237,0.20)' }}>
                <p className="text-[14.5px] font-bold text-gray-900 m-0 mb-1">
                  Interested? Here&apos;s how it works.
                </p>
                <p className="text-[13px] text-gray-500 m-0 mb-3 leading-[1.5]">
                  Upload your script, get scored in 60 seconds, and we&apos;ll match you to this opportunity automatically. Your first evaluation is free.
                </p>
                <Link
                  href="/start"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: '#7c3aed' }}
                >
                  Get started free <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
