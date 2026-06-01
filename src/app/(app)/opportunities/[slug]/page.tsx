// /opportunities/[slug] — individual opportunity detail page.
// v6 — matches the approved mockup exactly: dark header with partner strip,
//       title, CTA buttons; white card below with stats, deal type, looking for,
//       how we work, top submissions.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, FileText, Building2, CheckCircle2, Flame, Users, Diamond } from 'lucide-react'
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
const DEAL_TYPE_LABELS: Record<string, string> = {
  representation: 'Representation',
  option: 'Option',
  development_deal: 'Development Deal',
  production_partnership: 'Production Partnership',
}
const DEAL_TYPE_DESCRIPTIONS: Record<string, string> = {
  representation: 'We sign writers and take their material to market. Standard GEM representation terms.',
  option: 'We option scripts for development with an exclusive window.',
  development_deal: 'We partner with writers to develop material for specific buyers.',
  production_partnership: 'We attach as producers and package the project together.',
}

// Poster gradient colors for top submissions
const POSTER_GRADIENTS = [
  'linear-gradient(135deg, #ddd6fe, #c4b5fd)',
  'linear-gradient(135deg, #c7d2fe, #a5b4fc)',
  'linear-gradient(135deg, #e9d5ff, #d8b4fe)',
  'linear-gradient(135deg, #fde68a, #fbbf24)',
  'linear-gradient(135deg, #a7f3d0, #6ee7b7)',
]

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
  let avgScore: number | null = null
  // Heat granted = sum of heat the partner gave via reviews on this opportunity
  let totalHeat = 0
  for (const c of (considerations || []) as any[]) {
    totalHeat += c.heat ?? 0
  }
  let lastApplicationDate: string | null = null
  type TopSub = { format: string | null; genres: string[]; score: number | null; heat: number; collaborators: number }
  let topSubmissions: TopSub[] = []

  if (conIds.length > 0) {
    const sorted = ((considerations || []) as any[]).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    lastApplicationDate = sorted[0]?.created_at || null

    const { data: conScripts } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', conIds)

    const scriptIds = [...new Set(((conScripts || []) as any[]).map((cs: any) => cs.script_submission_id))]

    if (scriptIds.length > 0) {
      const { data: subs } = await service
        .from('script_submissions')
        .select('id, declared_format, heat_score')
        .in('id', scriptIds)

      const { data: evals } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score, evaluation')
        .in('submission_id', scriptIds)

      const { data: collabs } = await service
        .from('script_collaborators')
        .select('script_id')
        .in('script_id', scriptIds)
        .eq('status', 'accepted')

      const collabCounts = new Map<string, number>()
      for (const c of (collabs || []) as any[]) {
        collabCounts.set(c.script_id, (collabCounts.get(c.script_id) || 0) + 1)
      }

      const scores: number[] = []
      const subMap = new Map<string, any>()
      for (const s of (subs || []) as any[]) subMap.set(s.id, s)

      for (const ev of (evals || []) as any[]) {
        if (ev.weighted_score != null) scores.push(ev.weighted_score)
        const sub = subMap.get(ev.submission_id)

        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const genres = [
          cls.genre_primary as string,
          ...((cls.genre_secondary as string[]) || []),
        ].filter(Boolean)

        topSubmissions.push({
          format: sub?.declared_format || null,
          genres,
          score: ev.weighted_score,
          heat: sub?.heat_score ?? 0,
          collaborators: collabCounts.get(ev.submission_id) || 0,
        })
      }

      if (scores.length > 0) {
        avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }

      topSubmissions.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      topSubmissions = topSubmissions.slice(0, 5)
    }
  }

  // ── Partner activity stats ──
  let reviewedCount = 0
  if (opp.owner_id) {
    const { count: revCount } = await service
      .from('considerations')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', opp.id)
      .eq('review_stage', 'complete')
    reviewedCount = revCount ?? 0
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

  const postedDate = opp.created_at ? new Date(opp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

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

  // Build "looking for" pills
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
      paddingBottom: '64px',
    }}>
    <div className="max-w-3xl mx-auto px-4">

      {/* ── Back link ── */}
      <div style={{ padding: '12px 0', marginBottom: '4px' }}>
        <Link
          href="/opportunities"
          className="text-[13px] text-white/50 hover:text-white/70 transition-colors"
          style={{ textDecoration: 'none' }}
        >
          &larr; All opportunities
        </Link>
      </div>

      {/* ── DARK HEADER SECTION ── */}
      <div style={{ padding: '28px 32px 0' }}>

        {/* Partner strip */}
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <Building2 size={18} className="text-white/50" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-white/85">GEM Partner</span>
              <span
                className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ color: '#d4a843', background: 'rgba(212,168,67,0.12)', letterSpacing: '0.05em' }}
              >
                Verified
              </span>
            </div>
            <span className="text-[11px] text-white/40">{opp.perspective === 'lit_rep' ? 'Talent Representative' : 'Producer'}</span>
          </div>
          {reviewedCount > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[11px] text-white/45">{reviewedCount} reviewed</span>
            </div>
          )}
        </div>

        {/* Status line */}
        <div className="flex items-center gap-2 mb-3.5">
          {isClosed ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Closed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Accepting submissions
            </span>
          )}
          {postedDate && (
            <>
              <span className="text-[11px] text-white/30">·</span>
              <span className="text-[11px] text-white/40">Posted {postedDate}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1
          className="text-[30px] font-medium text-white m-0 mb-2.5"
          style={{ fontFamily: 'Georgia, serif', lineHeight: 1.25 }}
        >
          {opp.title}
        </h1>

        {/* Subtitle */}
        {opp.subtitle && (
          <p className="text-[14px] text-white/50 m-0 mb-6" style={{ lineHeight: 1.6, maxWidth: '540px' }}>
            {opp.subtitle}
          </p>
        )}

        {/* CTA buttons row */}
        <div className="flex items-center gap-3 mb-8">
          {isClosed ? (
            <div className="text-[13px] text-white/50">
              This opportunity has closed.{' '}
              <Link href="/opportunities" className="text-purple-400 hover:text-purple-300 font-medium">
                Browse open opportunities &rarr;
              </Link>
            </div>
          ) : user ? (
            considerationId ? (
              <Link
                href={`/applications/${considerationId}`}
                className="inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-[14px] font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
              >
                View your application <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                {totalVisibleScripts === 0 ? (
                  <NoScriptsApplyButton />
                ) : isPro ? (
                  <Link
                    href={`/opportunities/${opp.slug}/apply`}
                    className="inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-[14px] font-medium text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
                  >
                    Apply now <ArrowRight size={14} />
                  </Link>
                ) : (
                  <ApplyUpgradeButton freeRemaining={freeRemaining} applyHref={`/opportunities/${opp.slug}/apply`} />
                )}
                {qualifyingScripts.length > 0 && (
                  <span className="text-[12px] font-medium text-green-400">
                    ✓ {qualifyingScripts.length} of your scripts match
                  </span>
                )}
              </>
            )
          ) : (
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-[14px] font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
            >
              Apply now <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* ── WHITE CARD SECTION ── */}
      <div style={{ padding: '0 32px 32px' }}>
        <div className="bg-white rounded-xl overflow-hidden">

          {/* Stats bar */}
          <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <div className="py-4 px-4 text-center" style={{ borderRight: '1px solid #f3f4f6' }}>
              <div className="text-[22px] font-medium text-gray-900">{applicantCount ?? 0}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Writers applied</div>
            </div>
            <div className="py-4 px-4 text-center">
              <div className="text-[13px] font-medium text-green-600">
                {lastApplicationDate ? timeAgo(lastApplicationDate) : '—'}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Last application</div>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6">

            {/* Deal type + Looking for — side by side */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Deal type */}
              <div className="rounded-lg p-3.5" style={{ background: '#f9fafb' }}>
                <div className="text-[11px] font-medium text-gray-500 mb-2">Deal type</div>
                <div className="text-[14px] font-medium text-gray-900 mb-2">
                  {opp.deal_type ? (DEAL_TYPE_LABELS[opp.deal_type] || opp.deal_type) : '—'}
                </div>
                {opp.deal_type && (
                  <div className="text-[12px] text-gray-500 leading-relaxed">
                    {DEAL_TYPE_DESCRIPTIONS[opp.deal_type] || ''}
                  </div>
                )}
              </div>

              {/* Looking for */}
              <div className="rounded-lg p-3.5" style={{ background: '#f9fafb' }}>
                <div className="text-[11px] font-medium text-gray-500 mb-2">Looking for</div>
                <div className="flex flex-wrap gap-1.5">
                  {lookingForPills.map((pill, i) => (
                    <span
                      key={i}
                      className="text-[12px] font-medium px-2.5 py-0.5 rounded"
                      style={{ color: '#534AB7', background: '#EEEDFE' }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* How we work */}
            <div className="rounded-lg p-3.5 mb-6" style={{ background: '#f9fafb' }}>
              <div className="text-[11px] font-medium text-gray-500 mb-2.5">How we work</div>
              <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
                {opp.description}
              </div>
            </div>

            {/* Investor details (shown when any investor field is populated) */}
            {(opp.investment_range || opp.investment_thesis || (opp.investment_requirements?.length > 0)) && (
              <div className="rounded-lg p-3.5 mb-6" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="text-[11px] font-medium text-green-700 mb-3">Investment details</div>
                {opp.investment_range && (
                  <div className="mb-2.5">
                    <div className="text-[11px] font-medium text-gray-500 mb-0.5">Range</div>
                    <div className="text-[14px] font-medium text-gray-900">{opp.investment_range}</div>
                  </div>
                )}
                {opp.investment_thesis && (
                  <div className="mb-2.5">
                    <div className="text-[11px] font-medium text-gray-500 mb-0.5">Thesis</div>
                    <div className="text-[13px] text-gray-700 leading-relaxed">{opp.investment_thesis}</div>
                  </div>
                )}
                {opp.investment_requirements?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-gray-500 mb-1.5">Requirements</div>
                    <div className="flex flex-wrap gap-1.5">
                      {opp.investment_requirements.map((req: string, i: number) => (
                        <span
                          key={i}
                          className="text-[12px] font-medium px-2.5 py-0.5 rounded"
                          style={{ color: '#166534', background: '#dcfce7' }}
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top submissions */}
            {topSubmissions.length > 0 && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-3.5">
                  Top submissions
                </div>
                <div className="flex flex-col gap-2">
                  {topSubmissions.map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg px-3.5 py-2.5"
                      style={{ background: '#f9fafb' }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Poster thumbnail */}
                        <div
                          className="rounded shrink-0"
                          style={{
                            width: 32, height: 40,
                            background: POSTER_GRADIENTS[i % POSTER_GRADIENTS.length],
                          }}
                        />
                        <div>
                          <div
                            className="text-[13px] font-medium text-gray-500"
                            style={{ filter: 'blur(4px)', userSelect: 'none' }}
                          >
                            Hidden Title
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {[
                              sub.format === 'Feature film' ? 'Feature' : sub.format,
                              ...sub.genres.slice(0, 2),
                            ].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {sub.score != null && (
                          <span className="text-[13px] font-medium flex items-center gap-0.5" style={{ color: '#534AB7' }}>
                            <Diamond size={13} /> {Math.round(sub.score)}
                          </span>
                        )}
                        {sub.heat > 0 && (
                          <span className="text-[12px] text-orange-500 flex items-center gap-0.5">
                            <Flame size={12} /> {sub.heat}
                          </span>
                        )}
                        {sub.collaborators > 0 && (
                          <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                            <Users size={12} /> {sub.collaborators}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {(applicantCount ?? 0) > topSubmissions.length && (
                  <div className="text-center mt-3">
                    <span className="text-[12px] text-gray-500">
                      + {(applicantCount ?? 0) - topSubmissions.length} more submissions
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
