// /opportunities/[slug] — individual opportunity detail page.
// v7 — dark background throughout, big funding number, "What we look for" / "How we can help" / "Terms" cards.
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
  const cls = "text-purple-300"
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
  let freeRemaining = 2
  let totalVisibleScripts = 0

  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'

    if (!isPro) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count } = await service
        .from('opportunity_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('writer_id', user.id)
        .neq('status', 'withdrawn')
        .gte('submitted_at', monthStart)
      freeRemaining = Math.max(0, 2 - (count ?? 0))
    }

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
      <div className="max-w-2xl mx-auto px-4">

        {/* ── Back link ── */}
        <div style={{ padding: '12px 0', marginBottom: '8px' }}>
          <Link
            href="/opportunities"
            className="text-[13px] text-white/50 hover:text-white/70 transition-colors"
            style={{ textDecoration: 'none' }}
          >
            &larr; All opportunities
          </Link>
        </div>

        {/* ── Partner strip ── */}
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[15px]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            G
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-white/85">GEM Partner</span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ color: '#4ade80', background: 'rgba(74,222,128,0.12)', letterSpacing: '0.03em' }}
            >
              Verified
            </span>
          </div>
        </div>

        {/* ── Status line ── */}
        <div className="flex items-center gap-2 mb-6">
          {isClosed ? (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              Closed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Open
            </span>
          )}
          {postedDate && (
            <>
              <span className="text-[12px] text-white/30">·</span>
              <span className="text-[12px] text-white/45">Posted {postedDate}</span>
            </>
          )}
        </div>

        {/* ── Funding amount ── */}
        {opp.funding_amount && (
          <div className="mb-4">
            <div
              className="font-bold text-white leading-none"
              style={{ fontSize: '52px', letterSpacing: '-0.02em' }}
            >
              {formatFunding(opp.funding_amount)}
            </div>
            <div className="text-[13px] text-white/45 mt-1.5">per project</div>
          </div>
        )}

        {/* ── Description ── */}
        {opp.description && (
          <p
            className="text-white/70 mb-8"
            style={{ fontSize: '15px', lineHeight: 1.65 }}
          >
            {opp.description}
          </p>
        )}

        {/* ── Two stat boxes ── */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div
            className="rounded-xl px-4 py-4 text-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-[28px] font-semibold text-white leading-none mb-1">
              {applicantCount ?? 0}
            </div>
            <div className="text-[12px] text-white/45">Submitted</div>
          </div>
          <div
            className="rounded-xl px-4 py-4 text-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-[18px] font-semibold text-green-400 leading-none mb-1">
              {lastApplicationDate ? timeAgo(lastApplicationDate) : '—'}
            </div>
            <div className="text-[12px] text-white/45">Most recent</div>
          </div>
        </div>

        {/* ── What we look for ── */}
        <div
          className="rounded-xl p-5 mb-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-3.5">
            What we look for
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {lookingForPills.map((pill, i) => (
              <span
                key={i}
                className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                style={{ color: '#c4b5fd', background: 'rgba(167,139,250,0.15)' }}
              >
                {pill}
              </span>
            ))}
          </div>
          {opp.what_we_look_for && (
            <p className="text-[13px] text-white/55 leading-relaxed m-0">
              {opp.what_we_look_for}
            </p>
          )}
        </div>

        {/* ── How we can help ── */}
        {howWeHelp.length > 0 && (
          <div
            className="rounded-xl p-5 mb-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-4">
              How we can help
            </div>
            <div className="flex flex-col gap-3.5">
              {howWeHelp.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(167,139,250,0.15)' }}
                  >
                    <HelpIcon icon={item.icon} />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-white/85 mb-0.5">{item.title}</div>
                    <div className="text-[12px] text-white/50 leading-relaxed">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Terms ── */}
        {opp.terms && (
          <div
            className="rounded-xl p-5 mb-8"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-3">
              Terms
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed m-0">
              {opp.terms}
            </p>
          </div>
        )}

        {/* ── Apply CTA ── */}
        <div className="mb-6">
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
                    Apply with your script <ArrowRight size={15} />
                  </Link>
                ) : (
                  <ApplyUpgradeButton freeRemaining={freeRemaining} applyHref={`/opportunities/${opp.slug}/apply`} />
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
              Apply with your script <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {/* ── Disclaimer ── */}
        <p className="text-center text-[11px] text-white/30 leading-relaxed">
          GEM connects creators with partners. All deals are negotiated directly between parties.
        </p>

      </div>
    </div>
  )
}
