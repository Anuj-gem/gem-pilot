// Writer dashboard — Selznick-4 v3 layout.
//
// Per-script card now reads as one editorial unit:
//   1) Top: title + headline + tags on the left, GEM score + band copy on the right
//   2) Bottom: collapsible Industry Match sub-section listing script_matches
//      rows with status pills, comments, and a Send-new-draft CTA on Interested
//      (paywalled for free tier).
//
// A Pro upsell card hangs below the project list when a free-tier writer has
// at least one Interested match waiting on them.
//
// We preserve the existing flows that aren't visually replaced: drafts that
// need a PDF still get the Upload PDF CTA, the publish/private state pill is
// still here, the Remove + Edit + View report buttons are still here. The
// stats-grid and "What's next" rail from the prior version are removed —
// the v3 layout treats the project card itself as the summary.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import {
  FileText,
  Plus,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Pencil,
  Upload,
} from 'lucide-react'
import { UnlockTrigger } from '@/components/dashboard/unlock-trigger'
import { RemoveButton } from '@/components/dashboard/remove-button'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import {
  IndustryMatchSection,
  type DashboardMatch,
  type MatchStatus,
} from '@/components/dashboard/industry-match-section'
import { ScriptTagsEditor } from '@/components/dashboard/script-tags-editor'
import { ProUpsellCard } from '@/components/dashboard/pro-upsell-card'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'

export const dynamic = 'force-dynamic'

// Score band copy — surfaced as the small italic line under the GEM score.
function scoreBand(score: number | null): string | null {
  if (score === null) return null
  if (score >= 85) return 'Greenlight Material — top of the pool'
  if (score >= 70) return 'Optionable — strong commercial work'
  if (score >= 60) return 'Optionable — solid foundation'
  if (score >= 50) return 'Needs Development — real elements present'
  return 'Needs Development — early-stage draft'
}

// Producer category label inferred from `lane.format`. We don't store the
// partner category directly; v1 buckets everyone as "Producer" unless the
// producer's lane.format reads "series" (rep-style buyers tend to use
// agnostic/both formats — this is intentionally simple for v1, refine later).
function inferPartnerLabel(_lane: { format?: string | null } | null | undefined): string {
  // Until we add an explicit partner_category column, default to "Producer"
  // for everybody — keeps copy consistent and sidesteps mislabeling.
  return 'Producer'
}

function laneSummary(lane: {
  audience?: string | null
  looking_for_text?: string | null
} | null | undefined): string {
  if (!lane) return ''
  const raw = (lane.looking_for_text ?? lane.audience ?? '').trim()
  if (!raw) return ''
  if (raw.length <= 60) return `Looking for ${raw}`
  return `Looking for ${raw.slice(0, 57).trimEnd()}…`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome_back?: string; draft_saved?: string; just_signed_up?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  const sp = await searchParams
  const justDraftSaved = sp.draft_saved === '1'
  const justSignedUp = sp.just_signed_up === '1'
  const welcomeBack = sp.welcome_back === '1'

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name')
    .eq('id', user.id)
    .single()

  const isSubscribed = profile?.subscription_status === 'active'

  // Pull ALL submissions (incl. soft-hidden) so the free-eval check sees
  // them — a writer who hides their first script still counts as having
  // used their free evaluation.
  const { data: allSubmissions } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, is_public, created_at, hidden_at, declared_format, tags,
      script_evaluations ( id, evaluation, edited_fields, created_at, weighted_score )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const submissions = (allSubmissions ?? []).filter((s: any) => !s.hidden_at)
  const totalSubmissions = submissions.length
  const completedCount =
    (allSubmissions ?? []).filter((s: any) => s.status === 'completed').length
  const usedFreeEval = completedCount >= 1

  // Fetch script_matches for all visible submissions in one pass, then
  // join in the producer profile so we can show partner label + lane +
  // (post-Interested) the producer's real name. Unmatched rows are filtered
  // out — the writer ended them, they shouldn't keep cluttering the
  // industry strip.
  const submissionIds: string[] = submissions.map((s: any) => s.id)
  type RawMatch = {
    id: string
    submission_id: string
    producer_id: string
    status: MatchStatus
    comment: string | null
    created_at: string
    opened_at: string | null
    reacted_at: string | null
    expires_at: string | null
    unmatched_at: string | null
    producer_emailed_at: string | null
  }
  // Lookup so each match row knows its own script title (used to build
  // the "Reply via email" mailto subject).
  const subTitleById = new Map<string, string>()
  for (const s of submissions as any[]) {
    if (s?.id && typeof s.title === 'string') {
      subTitleById.set(s.id, s.title)
    }
  }

  let matchesBySubmission = new Map<string, DashboardMatch[]>()
  if (submissionIds.length > 0) {
    // Pending matches are hidden from the writer dashboard — they flip in
    // and out as producers' lanes shift, with no real engagement, and have
    // proven confusing. We surface only statuses where a producer has
    // actually done something with the script.
    const { data: rawMatches } = await supabase
      .from('script_matches')
      .select(
        'id, submission_id, producer_id, status, comment, created_at, opened_at, reacted_at, expires_at, unmatched_at, producer_emailed_at'
      )
      .in('submission_id', submissionIds)
      .in('status', ['opened', 'interested', 'commented', 'passed'])
      .is('unmatched_at', null)

    const producerIds = Array.from(
      new Set(((rawMatches ?? []) as RawMatch[]).map(m => m.producer_id))
    )
    type ProducerRow = {
      id: string
      lane: { format?: string | null; audience?: string | null; looking_for_text?: string | null } | null
      full_name: string | null
      email: string | null
    }
    let producerInfo = new Map<string, ProducerRow | null>()
    if (producerIds.length > 0) {
      const { data: producers } = await supabase
        .from('profiles')
        .select('id, lane, full_name, email')
        .in('id', producerIds)
      for (const p of (producers ?? []) as ProducerRow[]) {
        producerInfo.set(p.id, p)
      }
    }

    for (const m of (rawMatches ?? []) as RawMatch[]) {
      const info = producerInfo.get(m.producer_id) ?? null
      const lane = info?.lane ?? null
      // Real-name + email reveal once Interested. Pre-Interested rows stay
      // anonymous (no name, no email — just the generic role label) for
      // privacy. Falls back to the email local-part for the name when
      // full_name isn't set (producers can be onboarded without one).
      //
      // Pass-with-comment case: we ALSO reveal the producer's name (but
      // never the email) so the writer can see who passed and why. Email
      // stays gated to Interested+ since a pass shouldn't open an inbound
      // channel.
      let producerName: string | null = null
      let producerEmail: string | null = null
      const titleStr = (subTitleById.get(m.submission_id) ?? '').trim()
      const computedName = (() => {
        const fn = info?.full_name?.trim()
        if (fn) return fn
        if (info?.email) return info.email.split('@')[0]
        return null
      })()
      if (m.status === 'interested' || m.status === 'commented') {
        producerName = computedName
        producerEmail = info?.email ?? null
      } else if (m.status === 'passed' && (m.comment ?? '').trim().length > 0) {
        producerName = computedName
      }
      const dm: DashboardMatch = {
        id: m.id,
        status: m.status,
        partnerLabel: inferPartnerLabel(lane),
        producerName,
        producerEmail,
        scriptTitle: titleStr || null,
        laneSummary: laneSummary(lane),
        comment: m.comment ?? null,
        createdAt: m.created_at,
        openedAt: m.opened_at,
        reactedAt: m.reacted_at,
        expiresAt: m.expires_at,
        unmatchedAt: m.unmatched_at,
        producerEmailedAt: m.producer_emailed_at ?? null,
      }
      const arr = matchesBySubmission.get(m.submission_id) ?? []
      arr.push(dm)
      matchesBySubmission.set(m.submission_id, arr)
    }
  }

  // Pro upsell trigger: free tier with at least one Interested match.
  const hasInterestedMatch = (() => {
    if (isSubscribed) return false
    for (const arr of matchesBySubmission.values()) {
      if (arr.some(m => m.status === 'interested' || m.status === 'commented')) {
        return true
      }
    }
    return false
  })()

  const activeMatchCount = (() => {
    let n = 0
    for (const arr of matchesBySubmission.values()) {
      n += arr.filter(m => m.status !== 'passed').length
    }
    return n
  })()

  const firstName =
    profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  // Find the oldest completed submission — that one is free. All others
  // are locked for non-subscribers. Pull from the FULL list so a hidden
  // first script still consumes the free-eval slot.
  const completedSubs = ((allSubmissions ?? []) as any[])
    .filter((s: any) => s.status === 'completed')
    .sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  const firstFreeId: string | null = completedSubs[0]?.id ?? null

  return (
    <>
      <Nav />
      {!isSubscribed && <UpgradeModalListener />}
      {/* Live-update when a producer reacts to one of this writer's scripts.
          Scoped to the writer's visible submissions so the channel is tight. */}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        {/* Post-flow banner — surfaced when the writer just came back from
            the guided submit flow's OAuth round-trip. */}
        {(welcomeBack || justDraftSaved || justSignedUp) && (
          <div
            className="mb-6 rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
              background: welcomeBack
                ? 'rgba(124,58,237,0.06)'
                : 'rgba(212,160,23,0.07)',
              border: welcomeBack
                ? '1px solid rgba(124,58,237,0.25)'
                : '1px solid rgba(212,160,23,0.30)',
            }}
          >
            <span
              className="text-[15px] leading-none mt-0.5"
              style={{ color: welcomeBack ? 'var(--gem-accent)' : 'var(--gem-gold)' }}
            >
              ✦
            </span>
            <p className="text-[14px] text-[var(--gem-gray-100)] leading-snug m-0">
              {welcomeBack && justDraftSaved && (
                <>Welcome back, {firstName} — we&apos;ve added this draft to your existing account. Drop in your PDF anytime to score it.</>
              )}
              {welcomeBack && justSignedUp && (
                <>Welcome back, {firstName} — your new script has been added to your account.</>
              )}
              {welcomeBack && !justDraftSaved && !justSignedUp && (
                <>Welcome back, {firstName}.</>
              )}
              {!welcomeBack && justDraftSaved && (
                <>Your draft is saved. Drop in your PDF anytime to unlock your full GEM read.</>
              )}
              {!welcomeBack && justSignedUp && (
                <>You&apos;re signed up — your script is being scored.</>
              )}
            </p>
          </div>
        )}

        {/* Greeting strip — gold rule, big editorial title, supporting line */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <div
              className="w-12 h-0.5 mb-3.5 rounded-sm"
              style={{ background: 'var(--gem-gold)' }}
            />
            <h1 className="text-3xl sm:text-[32px] font-extrabold font-[family-name:var(--font-display)] tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2">
              Welcome back, {firstName}.
            </h1>
            <p className="text-[15px] text-[var(--gem-gray-300)] m-0">
              {totalSubmissions === 0 ? (
                <>Submit your first script to get a full evaluation.</>
              ) : (
                <>
                  <span className="font-bold text-[var(--gem-gray-50)]">
                    {totalSubmissions}
                  </span>{' '}
                  active script{totalSubmissions === 1 ? '' : 's'}
                  <span className="text-[var(--gem-gray-500)] mx-2">·</span>
                  <span className="font-bold text-[var(--gem-gray-50)]">
                    {activeMatchCount}
                  </span>{' '}
                  active producer {activeMatchCount === 1 ? 'signal' : 'signals'}
                </>
              )}
            </p>
          </div>
          <Link
            href="/submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors shrink-0"
            style={{ boxShadow: '0 1px 2px rgba(124,58,237,0.30)' }}
          >
            <Plus size={16} />
            Submit a script
          </Link>
        </div>

        {submissions && submissions.length > 0 ? (
          <>
            {/* Section header */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-400)]">
                Your projects
              </span>
              <span className="flex-1 h-px bg-[var(--gem-gray-700)]" />
            </div>

            {/* Project cards */}
            <div className="space-y-4">
              {(submissions as any[]).map((sub: any) => {
                const rawEval = sub.script_evaluations
                const eval_ = Array.isArray(rawEval) ? rawEval[0] : rawEval
                const hasReport = !!eval_
                const editedLogline =
                  typeof eval_?.edited_fields?.logline === 'string' &&
                  eval_.edited_fields.logline.trim().length > 0
                    ? eval_.edited_fields.logline
                    : null
                const positioningHook: string | null =
                  editedLogline ?? eval_?.evaluation?.positioning_hook ?? null
                const isLockedReport =
                  !isSubscribed &&
                  hasReport &&
                  sub.status === 'completed' &&
                  sub.id !== firstFreeId

                const rawScore = eval_?.weighted_score
                const scoreNum =
                  typeof rawScore === 'number'
                    ? rawScore
                    : typeof rawScore === 'string'
                      ? Number(rawScore)
                      : NaN
                const scoreDisplay = !Number.isNaN(scoreNum)
                  ? scoreNum.toFixed(1)
                  : null
                const band = !Number.isNaN(scoreNum) ? scoreBand(scoreNum) : null

                const classification = eval_?.evaluation?.classification ?? null
                const genrePrimary: string | null =
                  classification?.genre_primary ?? null
                // v5.4 standardizes secondary genres into `genre_secondary`;
                // legacy evals stored them under `genre_tags`. Read both so
                // this card stays correct across the cutover.
                const genreSecondary: string[] = Array.isArray(
                  classification?.genre_secondary
                )
                  ? classification.genre_secondary
                  : Array.isArray(classification?.genre_tags)
                    ? classification.genre_tags
                    : []
                const budgetTier: string | null =
                  eval_?.evaluation?.packaging?.budget_tier?.tier ?? null
                const formatLabel: string | null = sub.declared_format ?? null
                const tagsForScript: string[] = Array.isArray(sub.tags)
                  ? sub.tags
                  : []

                const dateStr = new Date(sub.created_at).toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )

                const matches = matchesBySubmission.get(sub.id) ?? []

                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl overflow-hidden bg-white"
                    style={{
                      border: '1px solid var(--gem-gray-700)',
                      boxShadow:
                        '0 2px 10px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Project body */}
                    <div
                      className="px-6 sm:px-8 py-6 sm:py-7"
                      style={{
                        background:
                          'radial-gradient(ellipse at 0% 0%, rgba(212,160,23,0.05) 0%, transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.04) 0%, transparent 55%), #fff',
                      }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 sm:gap-9 items-start">
                        <div className="min-w-0">
                          {/* Title row */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0">
                              {sub.title}
                            </h3>
                            {isLockedReport ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  border: '1px solid rgba(212,160,23,0.4)',
                                  background: 'rgba(212,160,23,0.10)',
                                  color: 'var(--gem-gold)',
                                }}
                              >
                                <Lock size={10} />
                                Upgrade to view
                              </span>
                            ) : sub.is_public ? (
                              <Link
                                href={`/report/${eval_.id}?privacy=1`}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors"
                                style={{
                                  border: '1px solid rgba(16,185,129,0.35)',
                                  background: 'rgba(16,185,129,0.10)',
                                  color: '#059669',
                                }}
                              >
                                <Eye size={10} />
                                Visible to industry
                              </Link>
                            ) : hasReport ? (
                              <Link
                                href={`/report/${eval_.id}?privacy=1`}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors"
                                style={{
                                  border: '1px solid var(--gem-gray-700)',
                                  color: 'var(--gem-gray-500)',
                                }}
                                title="Click to publish to industry"
                              >
                                <EyeOff size={10} />
                                Private
                              </Link>
                            ) : null}
                            {sub.status === 'failed' && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  border: '1px solid rgba(220,38,38,0.30)',
                                  background: 'rgba(220,38,38,0.08)',
                                  color: '#dc2626',
                                }}
                              >
                                Failed
                              </span>
                            )}
                            {sub.status === 'processing' && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold animate-pulse"
                                style={{
                                  border: '1px solid rgba(217,119,6,0.35)',
                                  background: 'rgba(217,119,6,0.10)',
                                  color: 'var(--gem-warning)',
                                }}
                              >
                                Processing
                              </span>
                            )}
                            {sub.status === 'awaiting_pdf' && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  border: '1px solid rgba(212,160,23,0.4)',
                                  background: 'rgba(212,160,23,0.10)',
                                  color: 'var(--gem-gold)',
                                }}
                              >
                                Draft — needs PDF
                              </span>
                            )}
                          </div>

                          {/* Headline / positioning hook */}
                          {isLockedReport ? (
                            <p className="text-[15px] text-[var(--gem-gray-400)] leading-[1.55] m-0 mb-3 max-w-[58ch]">
                              Your report is ready — upgrade to Pro to read it.
                            </p>
                          ) : positioningHook ? (
                            <p className="text-[14.5px] sm:text-[15.5px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-3 max-w-[58ch]">
                              {positioningHook}
                            </p>
                          ) : hasReport ? (
                            <p className="text-[14.5px] text-[var(--gem-gray-500)] italic leading-[1.55] m-0 mb-3 max-w-[58ch]">
                              Report ready — open to see the positioning.
                            </p>
                          ) : sub.status === 'awaiting_pdf' ? (
                            <p className="text-[14.5px] text-[var(--gem-gray-400)] leading-[1.55] m-0 mb-3 max-w-[58ch]">
                              Drop in your PDF anytime to unlock your full GEM read.
                            </p>
                          ) : null}

                          {/* Tags — small chips summarizing format / genre /
                              budget. Genre row prefers the v5.4 controlled
                              vocab (genre_primary + genre_secondary) so the
                              card lines up with the producer-side filters. */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {formatLabel && <Tag>{formatLabel}</Tag>}
                            {genrePrimary && <Tag>{genrePrimary}</Tag>}
                            {genreSecondary
                              .filter(g => typeof g === 'string' && g.trim().length > 0)
                              .slice(0, 2)
                              .map(g => (
                                <Tag key={`genre-secondary-${g}`}>{g}</Tag>
                              ))}
                            {budgetTier && <Tag>{budgetTier}</Tag>}
                          </div>

                          <div className="text-[12px] text-[var(--gem-gray-500)]">
                            Submitted {dateStr}
                          </div>

                          {/* Action row — drafts get Upload PDF, completed
                              reports get Remove + Edit + View report. Locked
                              reports get the Upgrade pill. */}
                          {sub.status === 'awaiting_pdf' && (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                              <Link
                                href={`/submit?resume=${sub.id}${
                                  sub.declared_format
                                    ? `&format=${encodeURIComponent(sub.declared_format)}`
                                    : ''
                                }`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                                style={{
                                  background: 'var(--gem-accent)',
                                  boxShadow:
                                    '0 2px 8px rgba(124,58,237,0.25)',
                                }}
                              >
                                <Upload size={14} strokeWidth={2.5} />
                                Upload PDF
                              </Link>
                            </div>
                          )}
                          {hasReport && (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                              {isLockedReport ? (
                                <UnlockTrigger
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                                  ariaLabel="Upgrade to view report"
                                >
                                  <span
                                    style={{
                                      background: 'var(--gem-gold)',
                                      padding: '8px 14px',
                                      borderRadius: '8px',
                                      margin: '-8px -14px',
                                      display: 'inline-block',
                                    }}
                                  >
                                    Upgrade — $20/mo
                                  </span>
                                </UnlockTrigger>
                              ) : (
                                <>
                                  <RemoveButton
                                    submissionId={sub.id}
                                    title={sub.title}
                                  />
                                  <Link
                                    href={`/report/${eval_.id}?edit=1`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] hover:border-[var(--gem-gray-500)] transition-colors"
                                    title="Edit title, genre, tone, and headline"
                                  >
                                    <Pencil size={12} />
                                    Edit
                                  </Link>
                                  <Link
                                    href={`/report/${eval_.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                    style={{
                                      background: 'var(--gem-accent)',
                                    }}
                                  >
                                    View report
                                    <ArrowRight size={12} />
                                  </Link>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Score column */}
                        {hasReport && !isLockedReport && scoreDisplay && (
                          <div className="flex flex-col items-start sm:items-end min-w-[140px]">
                            <div
                              className="text-[44px] sm:text-[52px] font-extrabold leading-none tabular-nums"
                              style={{
                                color: 'var(--gem-accent)',
                                letterSpacing: '-0.035em',
                              }}
                            >
                              {scoreDisplay}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--gem-gray-500)] mt-1.5">
                              GEM score
                            </div>
                            {band && (
                              <div className="text-[12px] italic text-[var(--gem-gray-400)] mt-1.5 sm:text-right max-w-[200px]">
                                {band}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags sub-section — collapsible, sits above Industry
                        Activity. Writer-editable so they can rename/remove
                        anything the v5.4 prompt got wrong. Only render once
                        a report exists and isn't paywalled — the editor
                        writes through to script_submissions.tags which is
                        what producer-side filters read. */}
                    {hasReport && !isLockedReport && (
                      <ScriptTagsEditor
                        submissionId={sub.id}
                        initialTags={tagsForScript}
                      />
                    )}

                    {/* Industry activity sub-section — only render when we
                        have a completed report and the writer can actually
                        see it (locked reports have no actionable matches
                        yet). The Opportunities checklist inside this
                        section reads `isPublic` to decide whether to
                        prompt the writer to publish to industry. */}
                    {hasReport && !isLockedReport && (
                      <IndustryMatchSection
                        matches={matches}
                        isSubscribed={!!isSubscribed}
                        isPublic={!!sub.is_public}
                        submissionId={sub.id}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pro upsell — free tier with at least one Interested match */}
            {hasInterestedMatch && <ProUpsellCard />}

            {/* Free-tier upgrade banner stays as a quieter follow-up for
                writers who've used their free eval but don't yet have an
                Interested match (no upsell card above). */}
            {!isSubscribed && usedFreeEval && !hasInterestedMatch && (
              <div className="mt-8 rounded-xl border border-[var(--gem-gray-700)] p-5 sm:p-6 bg-white">
                <p className="text-sm font-semibold text-[var(--gem-gray-50)] mb-1">
                  Ready for unlimited drafts?
                </p>
                <p className="text-sm text-[var(--gem-gray-400)] mb-4">
                  Pro keeps your scripts in continuous rotation, unlocks unlimited evaluations, and lets producers reach you directly.
                </p>
                <UnlockTrigger
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-all"
                  ariaLabel="Upgrade to Pro"
                >
                  Go Pro — $20/mo
                </UnlockTrigger>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 border border-dashed border-[var(--gem-gray-700)] rounded-xl bg-white">
            <FileText size={32} className="mx-auto text-[var(--gem-gray-500)] mb-3" />
            <p className="text-[var(--gem-gray-400)] text-sm mb-4">
              No scripts submitted yet.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                Submit your first script
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[12px] font-medium rounded-full px-2.5 py-1"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        color: 'var(--gem-gray-300)',
      }}
    >
      {children}
    </span>
  )
}
