// /opportunities/[slug] — individual opportunity detail page.
// v6 — professional layout: partner strip, stats bar, deal type card,
//       looking for tags, how we work, top submissions.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, FileText, Clock, Building2, CheckCircle2, Flame } from 'lucide-react'
import { ApplyUpgradeButton } from '@/components/opportunities/apply-upgrade-button'
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

  // ── Fetch stats for this opportunity ──
  const { data: considerations, count: applicantCount } = await service
    .from('considerations')
    .select('id, created_at', { count: 'exact' })
    .eq('opportunity_id', opp.id)

  // Get scripts + scores for considerations (for avg score + heat + top submissions)
  const conIds = ((considerations || []) as any[]).map((c: any) => c.id)
  let avgScore: number | null = null
  let totalHeat = 0
  let lastApplicationDate: string | null = null
  type TopSub = { format: string | null; genres: string[]; score: number | null; heat: number; collaborators: number }
  let topSubmissions: TopSub[] = []

  if (conIds.length > 0) {
    // Last application
    const sorted = ((considerations || []) as any[]).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    lastApplicationDate = sorted[0]?.created_at || null

    // Get consideration_scripts → script_submissions for scores + heat
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

      // Get collaborator counts
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
        const heat = sub?.heat_score ?? 0
        totalHeat += heat

        // Build top submission entry
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
          heat,
          collaborators: collabCounts.get(ev.submission_id) || 0,
        })
      }

      if (scores.length > 0) {
        avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }

      // Sort top submissions by score desc, take top 5
      topSubmissions.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      topSubmissions = topSubmissions.slice(0, 5)
    }
  }

  // ── Fetch owner profile for partner strip ──
  let ownerName: string | null = opp.posted_by || null
  let ownerRole: string | null = null
  let reviewedCount = 0
  let heatGranted = 0

  if (opp.owner_id) {
    const { data: ownerProfile } = await service
      .from('profiles')
      .select('full_name, account_type')
      .eq('id', opp.owner_id)
      .single()
    if (ownerProfile) {
      ownerName = ownerProfile.full_name || ownerName
      ownerRole = ownerProfile.account_type === 'producer' ? 'Producer' : null
    }

    // Count how many considerations this owner has reviewed (complete stage)
    const { count: revCount } = await service
      .from('considerations')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', opp.id)
      .eq('review_stage', 'complete')
    reviewedCount = revCount ?? 0
    heatGranted = totalHeat
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

    // Get previously applied scripts
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

    // Get qualifying scripts
    const { data: userSubs } = await service
      .from('script_submissions')
      .select('id, title, declared_format, hidden_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const visibleSubs = ((userSubs || []) as any[]).filter((s: any) => !s.hidden_at && !alreadySubmittedScriptIds.has(s.id))
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

  const deadline = opp.deadline ? new Date(opp.deadline) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  // Format last application date
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

  return (
    <div className="max-w-3xl mx-auto px-4">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/40 hover:text-white/70 transition-colors mb-5"
      >
        &larr; All opportunities
      </Link>

      {/* ── Partner strip ── */}
      <div
        className="rounded-xl px-5 py-4 mb-4 flex items-center justify-between"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.15)' }}
          >
            <Building2 size={20} className="text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-white">
                {ownerName || 'GEM Partner'}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}
              >
                <CheckCircle2 size={10} /> Verified
              </span>
            </div>
            {ownerRole && (
              <span className="text-[12px] text-white/50">{ownerRole}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-white/40">
          {reviewedCount > 0 && (
            <span>{reviewedCount} reviewed</span>
          )}
          {heatGranted > 0 && (
            <span className="flex items-center gap-1">
              <Flame size={11} className="text-orange-400" />
              {heatGranted} heat granted
            </span>
          )}
        </div>
      </div>

      {/* ── Main card ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-0">
          {/* Status + deadline */}
          <div className="flex items-center gap-2 mb-3">
            {isClosed ? (
              <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-400">
                Closed
              </span>
            ) : (
              <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-400">
                Open
              </span>
            )}
            {daysLeft != null && daysLeft > 0 && (
              <span className={`flex items-center gap-1 text-[12px] font-semibold ${daysLeft <= 7 ? 'text-red-400' : 'text-white/40'}`}>
                <Clock size={12} />
                {daysLeft === 1 ? 'Closes tomorrow' : `${daysLeft} days left`}
              </span>
            )}
          </div>

          <h1
            className="text-[28px] sm:text-[32px] font-bold text-white m-0 mb-1 leading-tight"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {opp.title}
          </h1>

          {opp.subtitle && (
            <p className="text-[15px] text-white/50 m-0 mb-0 font-medium leading-snug">
              {opp.subtitle}
            </p>
          )}
        </div>

        {/* ── Stats bar ── */}
        <div
          className="mx-6 sm:mx-8 mt-5 mb-6 rounded-xl px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <p className="text-[22px] font-bold text-white m-0">{applicantCount ?? 0}</p>
            <p className="text-[12px] text-white/40 m-0">Writers applied</p>
          </div>
          <div>
            <p className="text-[22px] font-bold text-white m-0">{avgScore ?? '—'}</p>
            <p className="text-[12px] text-white/40 m-0">Avg. score</p>
          </div>
          <div>
            <p className="text-[22px] font-bold text-white m-0 flex items-center gap-1">
              {totalHeat > 0 ? totalHeat : '—'}
              {totalHeat > 0 && <Flame size={14} className="text-orange-400" />}
            </p>
            <p className="text-[12px] text-white/40 m-0">Heat granted</p>
          </div>
          <div>
            <p className="text-[22px] font-bold text-white m-0">
              {lastApplicationDate ? timeAgo(lastApplicationDate) : '—'}
            </p>
            <p className="text-[12px] text-white/40 m-0">Last application</p>
          </div>
        </div>

        {/* ── Content sections ── */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-6">

          {/* ── Deal type card ── */}
          {opp.deal_type && (
            <div
              className="rounded-xl px-5 py-4"
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.15)',
              }}
            >
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider m-0 mb-1">Deal type</p>
              <p className="text-[16px] font-bold text-purple-300 m-0">
                {DEAL_TYPE_LABELS[opp.deal_type] || opp.deal_type}
              </p>
            </div>
          )}

          {/* ── Looking for ── */}
          {(opp.formats?.length > 0 || opp.genres?.length > 0 || opp.budget_tiers?.length > 0 || opp.tags?.length > 0) && (
            <div>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider m-0 mb-3">Looking for</p>
              <div className="flex flex-wrap gap-2">
                {(opp.formats || []).map((f: string) => (
                  <span key={`f-${f}`} className="text-[12px] font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    {FORMAT_LABELS[f] ?? f}
                  </span>
                ))}
                {(opp.genres || []).map((g: string) => (
                  <span key={`g-${g}`} className="text-[12px] font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    {GENRE_LABELS[g] ?? g}
                  </span>
                ))}
                {(opp.budget_tiers || []).map((b: string) => (
                  <span key={`b-${b}`} className="text-[12px] font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    {BUDGET_LABELS[b] ?? b}
                  </span>
                ))}
                {(opp.tags || []).map((t: string) => (
                  <span key={`t-${t}`} className="text-[12px] font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── How we work / Description ── */}
          <div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider m-0 mb-3">How we work</p>
            <p className="text-[14px] text-white/70 leading-[1.7] m-0 whitespace-pre-line">
              {opp.description}
            </p>
          </div>

          {/* ── Top submissions ── */}
          {topSubmissions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider m-0 mb-3">Top submissions</p>
              <div className="space-y-2">
                {topSubmissions.map((sub, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <FileText size={15} className="text-white/20 shrink-0" />
                    <span className="text-[13px] text-white/30 font-medium truncate flex-1" style={{ filter: 'blur(4px)' }}>
                      Untitled Script
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      {sub.format && (
                        <span className="text-[11px] text-white/30">{sub.format === 'Feature film' ? 'Feature' : sub.format}</span>
                      )}
                      {sub.genres.length > 0 && (
                        <span className="text-[11px] text-white/30">{sub.genres[0]}</span>
                      )}
                      {sub.score != null && (
                        <span className="text-[13px] font-bold text-purple-400">{Math.round(sub.score)}</span>
                      )}
                      {sub.heat > 0 && (
                        <span className="flex items-center gap-0.5 text-[12px] font-semibold text-orange-400">
                          <Flame size={11} /> {sub.heat}
                        </span>
                      )}
                      {sub.collaborators > 0 && (
                        <span className="text-[11px] text-white/30">
                          {sub.collaborators} collab{sub.collaborators > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* ── CTA section ── */}
          {isClosed ? (
            <div className="rounded-xl px-5 py-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[15px] font-semibold text-white/70 m-0 mb-1">This opportunity has closed</p>
              <p className="text-[13px] text-white/40 m-0">Applications are no longer being accepted.</p>
              <Link href="/opportunities" className="inline-block mt-3 text-[13px] font-semibold text-purple-400 hover:text-purple-300">
                Browse open opportunities &rarr;
              </Link>
            </div>
          ) : user ? (
            considerationId ? (
              <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-bold px-3 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                    Application Pending
                  </span>
                </div>
                <p className="text-[14px] m-0 mb-3 text-purple-300">
                  You have an active application for this opportunity.
                </p>
                <Link href={`/applications/${considerationId}`} className="text-[13px] font-bold text-purple-400 hover:text-purple-300 inline-block">
                  View your application &rarr;
                </Link>
              </div>
            ) : qualifyingScripts.length > 0 ? (
              <div>
                <p className="text-[13px] font-bold text-green-400 m-0 mb-3">
                  {qualifyingScripts.length} {qualifyingScripts.length === 1 ? 'script qualifies' : 'scripts qualify'} for this opportunity
                </p>
                <div className="space-y-2 mb-4">
                  {qualifyingScripts.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg px-4 py-2.5"
                      style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
                    >
                      <FileText size={15} className="text-green-400 shrink-0" />
                      <span className="text-[14px] text-white/80 font-medium truncate flex-1">{s.title || 'Untitled'}</span>
                      {s.score != null && (
                        <span className="text-[13px] font-bold text-purple-400 shrink-0">
                          {Math.round(s.score)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {previouslyAppliedScripts.length > 0 && (
                  <div className="mb-4 rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[12px] font-semibold text-white/40 m-0 mb-1.5">Previously applied with:</p>
                    <div className="space-y-1">
                      {previouslyAppliedScripts.map(s => (
                        <div key={s.id} className="flex items-center gap-2">
                          <span className="text-[12px] text-white/20">•</span>
                          {s.evalId ? (
                            <Link href={`/report/${s.evalId}`} className="text-[13px] text-purple-400 hover:text-purple-300 font-medium truncate">
                              {s.title || 'Untitled'}
                            </Link>
                          ) : (
                            <span className="text-[13px] text-white/60 font-medium truncate">{s.title || 'Untitled'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isPro ? (
                  <Link
                    href={`/opportunities/${opp.slug}/apply`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                  >
                    Apply now <ArrowRight size={16} />
                  </Link>
                ) : (
                  <ApplyUpgradeButton freeRemaining={freeRemaining} applyHref={`/opportunities/${opp.slug}/apply`} />
                )}
              </div>
            ) : (
              <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[14px] text-white/60 font-medium m-0 mb-1">
                  None of your scripts match this opportunity yet.
                </p>
                <p className="text-[13px] text-white/40 m-0">
                  Upload a script that matches the requirements above.{' '}
                  <Link href="/dashboard" className="font-semibold text-purple-400 hover:text-purple-300">
                    Upload a script
                  </Link>
                </p>
              </div>
            )
          ) : (
            <div
              className="rounded-xl px-6 py-6"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(124,58,237,0.04) 65%)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <h3 className="text-[20px] font-bold text-white m-0 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Want to apply?
              </h3>
              <p className="text-[14px] text-white/60 m-0 mb-4 leading-relaxed">
                Upload your script and we&apos;ll evaluate it against the requirements above. If you qualify, you can submit directly.
              </p>
              <Link
                href="/get-started"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
              >
                Get started <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
