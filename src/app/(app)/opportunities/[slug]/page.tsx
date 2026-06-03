// /opportunities/[slug] — individual opportunity detail page.
// v8 — dark header area + white floating cards on dark bg, matching report page style.
//       Stats: 2 boxes (Submitted + Most recent). Keeps all auth/qualifying/CTA logic.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, DollarSign, Users, Mic } from 'lucide-react'
import { ApplyUpgradeButton } from '@/components/opportunities/apply-upgrade-button'
import { NoScriptsApplyButton } from '@/components/opportunities/no-scripts-apply-button'
import { normGenre, collectGenres, scriptMatchesOpportunity } from '@/lib/opportunity-matching'

const GENRE_LABELS: Record<string, string> = {
  Drama: 'Drama', Comedy: 'Comedy', Thriller: 'Thriller', Horror: 'Horror',
  'Sci-Fi': 'Sci-Fi', Fantasy: 'Fantasy', Action: 'Action', Crime: 'Crime',
  Mystery: 'Mystery', Romance: 'Romance', Western: 'Western', Musical: 'Musical',
  Family: 'Family', Historical: 'Historical', War: 'War', Sports: 'Sports',
  Documentary: 'Documentary',
}
const BUDGET_LABELS: Record<string, string> = {
  micro: 'Micro', indie: 'Indie', mid: 'Mid', studio: 'Studio', premium: 'Premium', tentpole: 'Tentpole',
}
const FORMAT_LABELS: Record<string, string> = {
  Feature: 'Feature', Series: 'Series',
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
    .select('title, subtitle, description')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!opp) return { title: 'Opportunity not found — GEM' }
  const desc = opp.subtitle ?? opp.description?.slice(0, 140) ?? ''
  const title = `${opp.title} — GEM`
  return {
    title, description: desc,
    openGraph: { title, description: desc, type: 'article', siteName: 'GEM' },
    twitter: { card: 'summary_large_image', title, description: desc },
  }
}

// Icon lookup for how_we_help rows
function HelpIcon({ icon }: { icon: string }) {
  const cls = "text-purple-600"
  if (icon === 'cash') return <DollarSign size={16} className={cls} />
  if (icon === 'users') return <Users size={16} className={cls} />
  if (icon === 'microphone') return <Mic size={16} className={cls} />
  return <DollarSign size={16} className={cls} />
}

function formatFunding(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (amount >= 1_000) {
    const k = amount / 1_000
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return `$${amount.toLocaleString()}`
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { slug } = await params
  const service = svc()

  const { data: opp } = await service
    .from('opportunities')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!opp) notFound()

  const isClosed = opp.status !== 'active'

  // ── Fetch stats ──
  const { data: considerations, count: applicantCount } = await service
    .from('considerations')
    .select('id, created_at, heat', { count: 'exact' })
    .eq('opportunity_id', opp.id)

  const conIds = ((considerations || []) as any[]).map((c: any) => c.id)
  let lastApplicationDate: string | null = null

  if (conIds.length > 0) {
    const sorted = ((considerations || []) as any[]).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    lastApplicationDate = sorted[0]?.created_at || null
  }

  // ── Auth + user-specific data ──
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  type QScript = { id: string; title: string | null; score: number | null; format: string | null }
  type PrevScript = { id: string; title: string | null; evalId: string | null }
  let qualifyingScripts: QScript[] = []
  let previouslyAppliedScripts: PrevScript[] = []
  let reviewStage: string | null = null
  let considerationId: string | null = null
  let isPro = false
  let totalVisibleScripts = 0

  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'

    const { data: userCons } = await service
      .from('considerations')
      .select('id, review_stage')
      .eq('writer_id', user.id)
      .eq('opportunity_id', opp.id)
      .neq('review_stage', 'complete')
      .limit(1)

    if (userCons && userCons.length > 0) {
      const c = userCons[0] as any
      reviewStage = c.review_stage || 'submitted'
      considerationId = c.id
    }

    const { data: allConsForOpp } = await service
      .from('considerations')
      .select('id, review_stage')
      .eq('writer_id', user.id)
      .eq('opportunity_id', opp.id)
      .eq('review_stage', 'complete')
    const completedConIds = ((allConsForOpp || []) as any[]).map((c: any) => c.id)
    let alreadySubmittedScriptIds = new Set<string>()
    if (completedConIds.length > 0) {
      const { data: prevScripts } = await service
        .from('consideration_scripts')
        .select('script_submission_id')
        .in('consideration_id', completedConIds)
      for (const ps of (prevScripts || []) as any[]) {
        alreadySubmittedScriptIds.add(ps.script_submission_id)
      }
      const prevSubIds = Array.from(alreadySubmittedScriptIds)
      if (prevSubIds.length > 0) {
        const { data: prevSubs } = await service
          .from('script_submissions')
          .select('id, title')
          .in('id', prevSubIds)
          .is('hidden_at', null)
        const { data: prevEvals } = await service
          .from('script_evaluations')
          .select('id, submission_id')
          .in('submission_id', prevSubIds)
        const evalMap = new Map<string, string>()
        for (const e of (prevEvals || []) as any[]) evalMap.set(e.submission_id, e.id)
        for (const s of (prevSubs || []) as any[]) {
          previouslyAppliedScripts.push({ id: s.id, title: s.title, evalId: evalMap.get(s.id) ?? null })
        }
      }
    }

    const { data: userSubs } = await service
      .from('script_submissions')
      .select('id, title, declared_format, hidden_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const visibleSubs = ((userSubs || []) as any[]).filter((s: any) => !s.hidden_at && !alreadySubmittedScriptIds.has(s.id))
    totalVisibleScripts = ((userSubs || []) as any[]).filter((s: any) => !s.hidden_at).length
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
        const genres = collectGenres(cls.genre_primary as string, cls.genre_secondary as string[], cls.genre_tags as string[])
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
        const scriptTags = ((cls.tags as string[]) || []).map((t: string) => t.toLowerCase().replace(/\s+/g, '-'))
        const format = sub.declared_format === 'Feature film' ? 'Feature' : sub.declared_format
        const ok = scriptMatchesOpportunity({ format, genres, budget, tags: scriptTags, score: ev.weighted_score }, opp)
        if (ok) {
          qualifyingScripts.push({ id: sub.id, title: sub.title, score: ev.weighted_score, format: sub.declared_format })
        }
      }
    }
  }

  const postedDate = opp.created_at
    ? new Date(opp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  // Build "what we look for" pills
  const lookingForPills: string[] = []
  if (opp.formats?.length > 0) {
    opp.formats.forEach((f: string) => lookingForPills.push(FORMAT_LABELS[f] ?? f))
  } else {
    lookingForPills.push('All formats')
  }
  if (opp.genres?.length > 0) {
    opp.genres.forEach((g: string) => lookingForPills.push(GENRE_LABELS[g] ?? g))
  } else {
    lookingForPills.push('All genres')
  }
  if (opp.budget_tiers?.length > 0) {
    opp.budget_tiers.forEach((b: string) => lookingForPills.push(BUDGET_LABELS[b] ?? b))
  } else {
    lookingForPills.push('All budgets')
  }
  if (opp.tags?.length > 0) {
    opp.tags.forEach((t: string) => lookingForPills.push(t))
  }

  const howWeHelp: Array<{ icon: string; title: string; description: string }> =
    Array.isArray(opp.how_we_help) ? opp.how_we_help : []

  return (
    <div style={{
      background: '#2b1a55',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      left: '50%',
      marginLeft: '-50vw',
      marginTop: '-24px',
      paddingTop: '24px',
      marginBottom: '-64px',
      paddingBottom: '80px',
    }}>
      <div className="max-w-3xl mx-auto px-4">

        {/* ── Dark header area: back link + partner badge ── */}
        <div className="flex items-center justify-between mb-6" style={{ padding: '8px 0' }}>
          <Link
            href="/opportunities"
            className="text-[12px] text-white/40 hover:text-white/60 transition-colors"
            style={{ textDecoration: 'none' }}
          >
            &larr; All opportunities
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0"
              style={{
                transform: 'rotate(45deg)',
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                borderRadius: 1,
              }}
            />
            <span className="text-[12px] text-white/50">GEM Partner</span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ color: '#4ade80', background: 'rgba(74,222,128,0.12)' }}
            >
              Verified
            </span>
          </div>
        </div>

        {/* ── Dark header area: funding amount ── */}
        {opp.funding_amount && (
          <div className="mb-6">
            <div
              className="font-bold leading-none"
              style={{ fontSize: '52px', letterSpacing: '-0.02em', color: '#4ade80' }}
            >
              {formatFunding(opp.funding_amount)}
            </div>
            <div className="text-[13px] text-white/40 mt-1.5">per project</div>
          </div>
        )}

        {/* ── Card 1: Main info ── */}
        <div
          className="rounded-none p-6 mb-4"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          {/* Title */}
          <h1
            className="font-bold m-0 mb-3"
            style={{ fontSize: '22px', lineHeight: 1.2, color: '#1C1917' }}
          >
            {opp.title}
          </h1>

          {/* Status line */}
          <div className="flex items-center gap-2 mb-5">
            {isClosed ? (
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                Closed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Open
              </span>
            )}
            {postedDate && (
              <>
                <span className="text-[12px]" style={{ color: '#D6D3D1' }}>·</span>
                <span className="text-[12px]" style={{ color: '#78716C' }}>Posted {postedDate}</span>
              </>
            )}
          </div>

          {/* Description */}
          {opp.description && (
            <p
              className="mb-6"
              style={{ fontSize: '15px', lineHeight: 1.65, color: '#44403C', margin: '0 0 24px 0' }}
            >
              {opp.description}
            </p>
          )}

          {/* Two stat boxes */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl px-4 py-4 text-center"
              style={{ background: '#f9fafb', border: '1px solid #e7e5e4' }}
            >
              <div className="font-semibold leading-none mb-1" style={{ fontSize: '28px', color: '#1C1917' }}>
                {applicantCount ?? 0}
              </div>
              <div className="text-[12px]" style={{ color: '#78716C' }}>Submitted</div>
            </div>
            <div
              className="rounded-xl px-4 py-4 text-center"
              style={{ background: '#f9fafb', border: '1px solid #e7e5e4' }}
            >
              <div className="font-semibold leading-none mb-1" style={{ fontSize: '18px', color: '#534AB7' }}>
                {lastApplicationDate ? timeAgo(lastApplicationDate) : '—'}
              </div>
              <div className="text-[12px]" style={{ color: '#78716C' }}>Most recent</div>
            </div>
          </div>
        </div>

        {/* ── Apply CTA — on dark bg between cards ── */}
        <div className="py-4">
          {isClosed ? (
            <div className="text-[13px] text-white/50 text-center">
              This opportunity has closed.{' '}
              <Link href="/opportunities" className="text-purple-400 hover:text-purple-300 font-medium">
                Browse open opportunities &rarr;
              </Link>
            </div>
          ) : user ? (
            considerationId ? (
              <Link
                href={`/applications/${considerationId}`}
                className="flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-medium text-white w-full"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
              >
                View your application <ArrowRight size={15} />
              </Link>
            ) : (
              <div className="flex flex-col gap-2.5">
                {totalVisibleScripts === 0 ? (
                  <NoScriptsApplyButton />
                ) : isPro ? (
                  <Link
                    href={`/opportunities/${opp.slug}/apply`}
                    className="flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-medium text-white w-full"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
                  >
                    Apply <ArrowRight size={15} />
                  </Link>
                ) : (
                  <ApplyUpgradeButton applyHref={`/opportunities/${opp.slug}/apply`} />
                )}
                {qualifyingScripts.length > 0 && (
                  <div className="text-center text-[12px] font-medium text-green-400">
                    {qualifyingScripts.length} of your scripts match this opportunity
                  </div>
                )}
              </div>
            )
          ) : (
            <Link
              href="/get-started"
              className="flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-medium text-white w-full"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
            >
              Apply <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {/* ── Card 2: Details ── */}
        <div
          className="rounded-none p-6"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          {/* What we look for */}
          <div className="mb-6">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#78716C' }}
            >
              What we look for
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {lookingForPills.map((pill, i) => (
                <span
                  key={i}
                  className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ color: '#534AB7', background: '#F5F3FF' }}
                >
                  {pill}
                </span>
              ))}
            </div>
            {opp.what_we_look_for && (
              <p className="text-[13px] leading-relaxed m-0" style={{ color: '#57534E' }}>
                {opp.what_we_look_for}
              </p>
            )}
          </div>

          {/* How we can help */}
          {howWeHelp.length > 0 && (
            <div className="mb-6">
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-4"
                style={{ color: '#78716C' }}
              >
                How we can help
              </div>
              <div className="flex flex-col gap-3.5">
                {howWeHelp.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: '#F5F3FF' }}
                    >
                      <HelpIcon icon={item.icon} />
                    </div>
                    <div>
                      <div className="text-[13px] font-medium mb-0.5" style={{ color: '#1C1917' }}>{item.title}</div>
                      <div className="text-[12px] leading-relaxed" style={{ color: '#78716C' }}>{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms */}
          {opp.terms && (
            <div className="mb-6">
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: '#78716C' }}
              >
                Terms
              </div>
              <p className="text-[13px] leading-relaxed m-0" style={{ color: '#57534E' }}>
                {opp.terms}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-center text-[11px] leading-relaxed m-0" style={{ color: '#A8A29E' }}>
            GEM connects creators with partners. All deals are negotiated directly between parties.
          </p>
        </div>

      </div>
    </div>
  )
}
