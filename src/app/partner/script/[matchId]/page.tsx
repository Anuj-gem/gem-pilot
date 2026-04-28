// /partner/script/[matchId] — producer-facing script detail page.
//
// Selznick-4 v4 (2026-04-27): rebuilt to mirror the writer's report page so
// the layout reads as a single artifact for both audiences. Producers see
// the SAME top card (title + score + headline + "show details") and the
// SAME section structure, plus producer-specific surfaces:
//
//   - Pre-Interested: top card + "Why this is a hit" lede + a gate card
//     that explains what marking Interested unlocks. Everything else hidden.
//   - Post-Interested: full report (all sections, same order as writer view)
//     plus a Script download panel and a "Reach out to the writer" panel.
//   - Ended (unmatched_at): same as post-Interested visually, with a "Match
//     ended" notice up top and the reach-out panel hidden.
//
// Auth gates mirror /partner:
//   1. Not signed in            → /login
//   2. Signed in, not producer  → /dashboard
//   3. Producer, lane null      → /onboarding/producer
//   4. Match not owned by user  → notFound (RLS would hide it anyway)
//
// Side effect on load: any 'pending' match flips to 'opened'.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import {
  Section,
  EditorialSection,
  Collapsible,
  FactList,
  Fact,
} from '@/components/report/v5-components'
import { PackagingSection } from '@/components/report/packaging-block'
import { SupportingCharactersCarousel } from '@/components/report/supporting-characters-carousel'
import { RiskDetailsSection } from '@/components/report/risk-details-card'
import { EditableTopCard } from '@/components/report/editable-top-card'
import { MatchActions } from '@/components/partner/match-actions'
import { StickyMatchActions } from '@/components/partner/sticky-actions'
import { ScriptDownloadButton } from '@/components/partner/script-download-button'
import { ProducerIntroButton } from '@/components/partner/producer-intro-button'
import { getDisplayTopCard } from '@/lib/edited-fields'
import { isScoreVisible, normalizePrivacy, resolveVisibility } from '@/lib/report-privacy'
import {
  normalizeEvaluation,
  calculateWeightedScore,
  DIMENSION_META,
} from '@/types'
import type {
  GEMEvaluation,
  LeadCharacter,
  DimensionId,
} from '@/types'

export const dynamic = 'force-dynamic'

type MatchStatus = 'pending' | 'opened' | 'interested' | 'passed' | 'commented'

interface PageProps {
  params: Promise<{ matchId: string }>
}

interface MatchRow {
  id: string
  producer_id: string
  status: MatchStatus
  comment: string | null
  submission_id: string
  unmatched_at: string | null
  unmatched_by: string | null
  unmatch_reason: string | null
  producer_emailed_at: string | null
  script_submissions: {
    id: string
    title: string
    declared_format: string | null
    user_id: string | null
    tags: string[] | null
    report_privacy: unknown
    profiles: {
      full_name: string | null
      email: string | null
    } | null
    script_evaluations:
      | Array<{
          id: string
          weighted_score: number | null
          tier: string | null
          evaluation: GEMEvaluation | null
          edited_fields: { logline?: string; title?: string } | null
        }>
      | {
          id: string
          weighted_score: number | null
          tier: string | null
          evaluation: GEMEvaluation | null
          edited_fields: { logline?: string; title?: string } | null
        }
      | null
  } | null
}

interface V5Extras {
  positioning_hook?: string
  lead_characters?: LeadCharacter[]
  considerations?: {
    area: string
    detail: string
    source?: string
    is_primary_lever?: boolean
  }[]
  craft_note?: string
  package_angles?: {
    director_appeal: { hook: string; fit_profile?: string; detail: string }
    buyer_appeal: { tier: string; lane: string; detail: string }
  }
}

export default async function PartnerScriptDetailPage({ params }: PageProps) {
  const { matchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/partner/script/${matchId}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, lane')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') {
    redirect('/dashboard')
  }
  if (!profile?.lane) {
    redirect('/onboarding/producer')
  }

  const { data: matchRaw } = await supabase
    .from('script_matches')
    .select(
      `
      id, producer_id, status, comment, submission_id,
      unmatched_at, unmatched_by, unmatch_reason, producer_emailed_at,
      script_submissions (
        id, title, declared_format, user_id, tags, report_privacy,
        profiles ( full_name, email ),
        script_evaluations ( id, weighted_score, tier, evaluation, edited_fields )
      )
      `
    )
    .eq('id', matchId)
    .maybeSingle()

  const match = matchRaw as unknown as MatchRow | null

  if (!match || match.producer_id !== user.id) {
    notFound()
  }
  const sub = match.script_submissions
  if (!sub) notFound()

  const evalRaw = Array.isArray(sub.script_evaluations)
    ? sub.script_evaluations[0]
    : sub.script_evaluations
  if (!evalRaw) notFound()

  const evaluation = evalRaw.evaluation as
    | (GEMEvaluation & V5Extras)
    | null
  if (!evaluation) notFound()

  // Promote pending → opened on first view.
  if (match.status === 'pending') {
    await supabase
      .from('script_matches')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', matchId)
      .eq('status', 'pending')
    match.status = 'opened'
  }

  // Display-ready top card, identical to the writer's view.
  const topCard = getDisplayTopCard(
    evaluation,
    evalRaw.edited_fields ?? null,
    sub.title,
    sub.tags ?? []
  )

  const score =
    typeof evalRaw.weighted_score === 'number'
      ? evalRaw.weighted_score
      : evalRaw.weighted_score != null
        ? Number(evalRaw.weighted_score)
        : null

  // Score visibility: producer is a non-owner. Honor the writer's privacy
  // toggle. If unset, default is visible.
  const privacy = normalizePrivacy(sub.report_privacy)
  const scoreShown =
    typeof score === 'number' && !Number.isNaN(score) && isScoreVisible(privacy)

  // Compute commercial score from per-dim scores when weighted_score isn't
  // already on the eval row (legacy data path).
  let commercialScore: number | null =
    typeof score === 'number' && !Number.isNaN(score) ? score : null
  if (commercialScore === null) {
    try {
      const s = (evaluation as GEMEvaluation).scores ?? {}
      if (Object.keys(s).length >= 10) {
        commercialScore = calculateWeightedScore(
          s as Record<DimensionId, { score: number }>
        )
      }
    } catch {
      commercialScore = null
    }
  }

  // Body data — same shape as the writer's report page.
  const { whatsSpecial } = normalizeEvaluation(evaluation)
  const allStrengths = whatsSpecial.strengths ?? []
  const leadCharacters = evaluation.lead_characters ?? []
  const considerations = evaluation.considerations ?? []
  const packageAngles = evaluation.package_angles
  const production = evaluation.production_reality
  const scores = evaluation.scores ?? {}
  const craftNote = evaluation.craft_note ?? null
  const riskDetails = evaluation.risk_details
  const packaging = evaluation.packaging
  const issues = (evaluation as {
    issues?: {
      headline?: string
      items?: { area: string; detail: string; is_primary_lever?: boolean }[]
    }
  }).issues

  // Gate state.
  const isUnlocked =
    match.status === 'interested' || match.status === 'commented'
  const isUnmatched = !!match.unmatched_at

  // Writer display name for the reach-out panel. The writer's EMAIL is
  // intentionally never exposed to the producer — intros go through the
  // /api/partner/match/[id]/intro endpoint which sends a Postmark email
  // with ReplyTo set to the producer.
  const writerProfile = sub.profiles ?? null
  const writerName = (() => {
    const fn = writerProfile?.full_name?.trim()
    if (fn) return fn
    if (writerProfile?.email) return writerProfile.email.split('@')[0]
    return null
  })()

  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
        {/* Back link */}
        <Link
          href="/partner"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] mb-4"
        >
          <ArrowLeft size={14} />
          Back to your inbox
        </Link>

        {/* Match-ended notice. */}
        {isUnmatched && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-[13px] text-[var(--gem-gray-200)]"
            style={{
              background: 'var(--gem-gray-900)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            <span className="font-semibold text-[var(--gem-gray-50)]">
              Match ended
            </span>
            {match.unmatched_by === 'writer' ? ' by the writer.' : '.'}
            {match.unmatch_reason ? ` Reason: ${match.unmatch_reason}` : ''}
          </div>
        )}

        {/* TOP CARD — same component the writer sees. Read-only here
            (isOwner=false hides the Edit button + tag editing). Score badge
            honors the writer's privacy toggle. */}
        <EditableTopCard
          evaluationId={evalRaw.id}
          submissionId={sub.id}
          initial={topCard}
          isOwner={false}
          hasEdits={false}
          postedAt={null}
          authorName={writerName}
          commercialScore={scoreShown ? commercialScore : null}
        />

        {/* Producer action row — Interested / Pass. Sits right under the
            top card so the primary decision is unmissable. */}
        {!isUnmatched && (
          <div className="mb-10">
            <MatchActions
              matchId={match.id}
              status={match.status}
              variant="detail"
              hideComment
            />
          </div>
        )}

        {/* Selznick-4 v9 (2026-04-28): the producer page now mirrors the
            writer's report. Sections respect the writer's per-section
            privacy (resolveVisibility). The Interested gate only controls
            the producer-only items: script PDF download + writer's name /
            email. The Interested/Pass buttons live at the top (under the
            top card) AND in a sticky bar at the bottom — producer can
            mark interest from anywhere. The big "Mark Interested to
            unlock the full report" card is gone — content was always
            available, the gate was misleading. */}

        {/* WHY THIS CAN BE A HIT — full layout, same as writer view. */}
        {(isUnlocked || resolveVisibility(privacy, 'whats_working') === 'public') &&
          (whatsSpecial.headline || allStrengths.length > 0) && (
          <EditorialSection label="Why this can be a hit" accent="gold">
            {whatsSpecial.headline && (
              <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-100)] leading-[1.55] m-0 mb-5 sm:mb-7 max-w-[62ch] font-medium">
                {whatsSpecial.headline}
              </p>
            )}
            {allStrengths.length > 0 && (
              <ol className="list-none m-0 p-0 space-y-2.5 sm:space-y-3">
                {allStrengths.map((s, i) => (
                  <li key={i}>
                    <details className="group [&_summary::-webkit-details-marker]:hidden">
                      <summary className="cursor-pointer list-none grid grid-cols-[28px_1fr_auto] sm:grid-cols-[36px_1fr_auto] gap-x-3 sm:gap-x-4 items-center py-2.5 px-3 sm:px-4 rounded-lg hover:bg-[var(--gem-gray-900)] transition-colors -mx-3 sm:-mx-4">
                        <span
                          className="text-[16px] sm:text-[20px] font-bold tabular-nums leading-tight"
                          style={{ color: 'var(--gem-gold)' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="text-[15.5px] sm:text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 leading-snug min-w-0">
                          {s.dimension_or_area}
                        </p>
                        <span
                          aria-hidden
                          className="text-[var(--gem-gray-500)] transition-transform duration-150 group-open:rotate-180 text-[14px]"
                        >
                          ▾
                        </span>
                      </summary>
                      <div className="grid grid-cols-[28px_1fr] sm:grid-cols-[36px_1fr] gap-x-3 sm:gap-x-4 pt-2 pb-1">
                        <div />
                        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0 max-w-[62ch]">
                          {s.what_it_means}
                        </p>
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            )}
          </EditorialSection>
        )}

        {/* SCRIPT DOWNLOAD — gated on Interested. The PDF + writer's
            email are the producer-only artifacts. */}
        {isUnlocked && (
          <>
            <div
              className="rounded-xl px-5 py-5 mb-10 flex items-start gap-4 flex-wrap"
              style={{
                background: 'rgba(5,150,105,0.06)',
                border: '1px solid rgba(5,150,105,0.30)',
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] uppercase tracking-[0.18em] font-bold m-0 mb-1"
                  style={{ color: '#059669' }}
                >
                  Script unlocked
                </p>
                <p className="text-[14.5px] text-[var(--gem-gray-100)] m-0 leading-snug">
                  Download the PDF — link is signed and good for 10 minutes.
                </p>
              </div>
              <ScriptDownloadButton matchId={match.id} />
            </div>
          </>
        )}

        {/* Inline nudge for not-yet-Interested producers — much smaller
            than the old gate card. Shows ONLY when producer hasn't reacted
            yet, sits inline below the hit thesis so it doesn't dominate. */}
        {!isUnlocked && !isUnmatched && (
          <div
            className="rounded-xl px-5 py-4 mb-10 flex items-center gap-3 flex-wrap"
            style={{
              background: 'rgba(124,58,237,0.05)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            <Lock size={14} className="text-[var(--gem-accent)] shrink-0" />
            <p className="text-[13.5px] text-[var(--gem-gray-200)] m-0 leading-snug flex-1 min-w-[200px]">
              Mark Interested to download the script PDF and reach out to the writer directly.
            </p>
          </div>
        )}

        {/* CAST — gated on writer's deep_dive_characters privacy OR
            isUnlocked (interested producers retain visibility even if
            writer narrows after the fact). */}
        {(isUnlocked || resolveVisibility(privacy, 'deep_dive_characters') === 'public') &&
          leadCharacters.length > 0 && (() => {
              const leads = leadCharacters.filter(
                (c) => (c.role_type ?? '').toLowerCase() === 'lead'
              )
              const supporting = leadCharacters.filter(
                (c) => (c.role_type ?? '').toLowerCase() !== 'lead'
              )
              return (
                <Section
                  label="Cast"
                  subtitle="The parts inside this script and why an actor would chase them."
                  summary={`${leadCharacters.length} ${leadCharacters.length === 1 ? 'character' : 'characters'}`}
                >
                  <div className="space-y-3">
                    {leads.map((c, i) => (
                      <Collapsible
                        key={`lead-${i}`}
                        title={c.name}
                        meta={`${c.role_type} · ${c.demographics}`}
                        defaultOpen
                      >
                        <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0 mb-5">
                          {c.hook}
                        </p>
                        <div
                          className="rounded-lg p-5"
                          style={{
                            background: 'rgba(5,150,105,0.07)',
                            border: '1px solid rgba(5,150,105,0.20)',
                          }}
                        >
                          <p
                            className="text-[12px] uppercase tracking-[0.2em] font-bold mb-2 m-0"
                            style={{ color: '#059669' }}
                          >
                            Why an actor would want this part
                          </p>
                          <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                            {c.why_actor_wants_this}
                          </p>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                  {supporting.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3">
                        Supporting cast · {supporting.length}
                      </p>
                      <SupportingCharactersCarousel characters={supporting} />
                    </div>
                  )}
                </Section>
              )
            })()}

            {/* PACKAGE ANGLES — gated on deep_dive_package privacy */}
            {(isUnlocked || resolveVisibility(privacy, 'deep_dive_package') === 'public') &&
              packageAngles && (
              <Section
                label="Package angles"
                subtitle="Who would direct it, and who would buy it."
                summary={`Director appeal · ${packageAngles.buyer_appeal?.tier ?? 'buyer appeal'}`}
              >
                <div className="space-y-3">
                  <Collapsible
                    title="Why a director wants this"
                    accent="#059669"
                  >
                    <p className="text-[18px] font-semibold text-[var(--gem-gray-50)] leading-[1.4] mb-4 m-0">
                      {packageAngles.director_appeal.hook}
                    </p>
                    {packageAngles.director_appeal.fit_profile && (
                      <div
                        className="rounded-lg p-5 mb-4"
                        style={{
                          background: 'rgba(5,150,105,0.07)',
                          border: '1px solid rgba(5,150,105,0.20)',
                        }}
                      >
                        <p
                          className="text-[12px] uppercase tracking-[0.2em] font-bold mb-2 m-0"
                          style={{ color: '#059669' }}
                        >
                          Director fit profile
                        </p>
                        <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                          {packageAngles.director_appeal.fit_profile}
                        </p>
                      </div>
                    )}
                    <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0">
                      {packageAngles.director_appeal.detail}
                    </p>
                  </Collapsible>
                  <Collapsible
                    title="Why a buyer wants this"
                    meta={packageAngles.buyer_appeal.tier}
                    accent="#059669"
                  >
                    <p className="text-[13px] uppercase tracking-[0.15em] text-[var(--gem-gray-400)] mb-3 m-0">
                      {packageAngles.buyer_appeal.lane}
                    </p>
                    <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0">
                      {packageAngles.buyer_appeal.detail}
                    </p>
                  </Collapsible>
                </div>
              </Section>
            )}

            {/* PACKAGING (v5.4) — same key as Package angles */}
            {(isUnlocked || resolveVisibility(privacy, 'deep_dive_package') === 'public') &&
              packaging && <PackagingSection data={packaging} />}

            {/* ISSUES — same lede + see-more as the writer's view.
                Sources: prefer legacy `considerations`, fall back to v5.4
                `issues.items`. Same shape; merging means newer evals that
                only emit the v5.4 field still render here. */}
            {(() => {
              type IssueRow = {
                area: string
                detail: string
                is_primary_lever?: boolean
              }
              const fromIssues: IssueRow[] = (issues?.items ?? []).map((i) => ({
                area: i.area,
                detail: i.detail,
                is_primary_lever: i.is_primary_lever,
              }))
              const fromConsiderations: IssueRow[] = considerations.map((c) => ({
                area: c.area,
                detail: c.detail,
                is_primary_lever: c.is_primary_lever,
              }))
              const merged: IssueRow[] =
                fromConsiderations.length > 0 ? fromConsiderations : fromIssues
              const issuesHeadline =
                typeof issues?.headline === 'string' &&
                issues.headline.trim().length > 0
                  ? issues.headline.trim()
                  : null
              if (merged.length === 0 && !craftNote && !issuesHeadline) return null
              const primary = merged.find(
                (c) => c.is_primary_lever === true
              )
              const secondary = merged.filter(
                (c) => c.is_primary_lever !== true
              )
              return (
                <EditorialSection label="Development considerations" accent="violet">
                  {issuesHeadline && (
                    <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-100)] leading-[1.55] m-0 mb-5 sm:mb-7 max-w-[62ch] font-medium">
                      {issuesHeadline}
                    </p>
                  )}
                  {/* Numbered list — IDENTICAL shape to "Why this can be
                      a hit". Sharpest lever is just #1; no special tag,
                      no differentiated number, no auto-open. Anuj
                      2026-04-28. */}
                  {(() => {
                    const ordered: IssueRow[] = primary
                      ? [primary, ...secondary]
                      : secondary
                    if (ordered.length === 0) return null
                    return (
                      <ol className="list-none m-0 p-0 space-y-2.5 sm:space-y-3">
                        {ordered.map((c, i) => (
                          <li key={i}>
                            <details className="group [&_summary::-webkit-details-marker]:hidden">
                              <summary className="cursor-pointer list-none grid grid-cols-[28px_1fr_auto] sm:grid-cols-[36px_1fr_auto] gap-x-3 sm:gap-x-4 items-center py-2.5 px-3 sm:px-4 rounded-lg hover:bg-[var(--gem-gray-900)] transition-colors -mx-3 sm:-mx-4">
                                <span
                                  className="text-[16px] sm:text-[20px] font-bold tabular-nums leading-tight"
                                  style={{ color: 'var(--gem-gold)' }}
                                >
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <p className="text-[15.5px] sm:text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 leading-snug min-w-0">
                                  {c.area}
                                </p>
                                <span
                                  aria-hidden
                                  className="text-[var(--gem-gray-500)] transition-transform duration-150 group-open:rotate-180 text-[14px]"
                                >
                                  ▾
                                </span>
                              </summary>
                              <div className="grid grid-cols-[28px_1fr] sm:grid-cols-[36px_1fr] gap-x-3 sm:gap-x-4 pt-2 pb-1">
                                <div />
                                <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0 max-w-[62ch]">
                                  {c.detail}
                                </p>
                              </div>
                            </details>
                          </li>
                        ))}
                      </ol>
                    )
                  })()}

                  {craftNote && (
                    <div className="relative pl-5 sm:pl-6 mt-5 sm:mt-6">
                      <div
                        aria-hidden
                        className="absolute left-0 top-1 bottom-1 rounded-sm"
                        style={{ width: 3, background: '#059669' }}
                      />
                      <p
                        className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-1.5"
                        style={{ color: '#059669' }}
                      >
                        Craft note
                      </p>
                      <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0 max-w-[62ch]">
                        {craftNote}
                      </p>
                    </div>
                  )}

                </EditorialSection>
              )
            })()}

            {/* PROJECT COMPLEXITY — gated on writer's project_complexity
                privacy OR isUnlocked. */}
            {(isUnlocked || resolveVisibility(privacy, 'project_complexity') === 'public') &&
              (riskDetails ? (
                <RiskDetailsSection data={riskDetails} production={production} />
              ) : production?.risk_rubric ? (
              <Section
                label="Project risks"
                subtitle="Cost, cast, and content complexity at a glance."
                summary={[
                  production.risk_rubric.cost
                    ? `Cost ${production.risk_rubric.cost.level}`
                    : null,
                  production.risk_rubric.cast
                    ? `Cast ${production.risk_rubric.cast.level}`
                    : null,
                  production.risk_rubric.content
                    ? `Content ${production.risk_rubric.content.level}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {production.risk_rubric.cost && (
                    <RiskTile
                      label="Production cost"
                      axis={production.risk_rubric.cost}
                    />
                  )}
                  {production.risk_rubric.cast && (
                    <RiskTile
                      label="Cast complexity"
                      axis={production.risk_rubric.cast}
                    />
                  )}
                  {production.risk_rubric.content && (
                    <RiskTile
                      label="Content maturity"
                      axis={production.risk_rubric.content}
                    />
                  )}
                </div>
              </Section>
            ) : null)}

            {/* REFERENCE — collapsible disclosure folded by default.
                Anuj 2026-04-28. */}
            <details className="group mt-12 sm:mt-14 [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none rounded-lg -mx-2 px-2 py-2 hover:bg-[var(--gem-gray-900)] transition-colors">
                <div
                  aria-hidden
                  className="w-12 h-0.5 mb-3 rounded-sm"
                  style={{ background: 'var(--gem-accent)' }}
                />
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[20px] sm:text-[24px] font-bold text-[var(--gem-gray-50)] tracking-tight leading-tight m-0">
                    Reference
                  </h2>
                  <span
                    aria-hidden
                    className="text-[var(--gem-gray-400)] transition-transform duration-200 group-open:rotate-180 text-[18px]"
                  >
                    ▾
                  </span>
                </div>
                <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mt-1.5">
                  Tap to see the per-dimension scores and full production planning facts.
                </p>
              </summary>
              <div className="mt-5">

            {/* SCORE DETAIL (was "Narrative breakdown") */}
            {scores &&
              Object.values(scores).some((s) => typeof s?.score === 'number') && (
                <Section
                  label="Additional scored dimensions"
                  subtitle="Ten craft axes the model tracks while reading the script — bonus signal beyond the top-line read."
                  summary="10 craft dimensions"
                >
                  <div className="space-y-3">
                    {(Object.keys(DIMENSION_META) as DimensionId[]).map(
                      (dimId) => {
                        const s = scores?.[dimId]
                        if (typeof s?.score !== 'number') return null
                        const meta = DIMENSION_META[dimId]
                        return (
                          <DimensionRow
                            key={dimId}
                            label={meta.label}
                            score={s.score}
                            reasoning={s.reasoning}
                          />
                        )
                      }
                    )}
                  </div>
                </Section>
              )}

            {/* PRODUCTION PLANNING DETAILS — legacy fallback only.
                v5.4+ evals embed this data inside the Project Complexity
                cards' unfolds; the standalone section is suppressed for
                them. Anuj 2026-04-28. */}
            {!riskDetails && production && (
              <Section
                label="Production planning details"
                subtitle="Everything the script tells us about how it would actually get made."
                summary="Cast · Locations · Technical · Platform · Rights"
              >
                <div className="space-y-3">
                  <Collapsible
                    title="Cast"
                    meta={`${production.cast?.leads ?? 0} lead${production.cast?.leads === 1 ? '' : 's'} · ${production.cast?.speaking_roles ?? 0} speaking roles${production.cast?.child_actors ? ' · child actors' : ''}`}
                  >
                    <FactList>
                      <Fact
                        k="Speaking roles"
                        v={production.cast?.speaking_roles}
                      />
                      <Fact k="Leads" v={production.cast?.leads} />
                      {(production.cast?.series_regulars ?? 0) > 0 && (
                        <Fact
                          k="Series regulars"
                          v={production.cast?.series_regulars}
                        />
                      )}
                      {production.cast?.child_actors && (
                        <Fact k="Child actors" v="Yes" />
                      )}
                      {production.cast?.casting_challenges?.length ? (
                        <Fact
                          k="Casting"
                          v={production.cast.casting_challenges.join(', ')}
                        />
                      ) : null}
                    </FactList>
                  </Collapsible>
                  <Collapsible
                    title="Locations & Scale"
                    meta={`${production.locations?.distinct_count ?? 0} distinct${production.locations?.period_or_contemporary ? ` · ${production.locations.period_or_contemporary}` : ''}`}
                  >
                    <FactList>
                      <Fact
                        k="Distinct locations"
                        v={production.locations?.distinct_count}
                      />
                      <Fact
                        k="Int / Ext"
                        v={
                          production.locations?.interior_exterior_ratio ??
                          production.locations?.interior_exterior_mix
                        }
                      />
                      <Fact
                        k="Era"
                        v={production.locations?.period_or_contemporary}
                      />
                      {production.locations?.expensive_flags?.length ? (
                        <Fact
                          k="Notable"
                          v={production.locations.expensive_flags.join(', ')}
                        />
                      ) : null}
                    </FactList>
                  </Collapsible>
                  <Collapsible
                    title="Technical"
                    meta={`VFX ${production.technical?.vfx_level ?? '—'} · Stunts ${production.technical?.stunts_level ?? production.technical?.stunts ?? '—'}`}
                  >
                    <FactList>
                      <Fact
                        k="VFX"
                        v={
                          (production.technical?.vfx_level ?? '') +
                          (production.technical?.vfx_details
                            ? ` — ${production.technical.vfx_details}`
                            : '')
                        }
                      />
                      <Fact
                        k="Stunts"
                        v={
                          production.technical?.stunts_level ??
                          production.technical?.stunts
                        }
                      />
                      {production.technical?.sfx_needs && (
                        <Fact k="SFX" v={production.technical.sfx_needs} />
                      )}
                      {production.technical?.night_shoots && (
                        <Fact
                          k="Night shoots"
                          v={production.technical.night_shoots}
                        />
                      )}
                      {production.technical?.animals && (
                        <Fact k="Animals" v="Yes" />
                      )}
                    </FactList>
                  </Collapsible>
                  <Collapsible
                    title="Platform & Content"
                    meta={production.platform_fit?.recommended_lane}
                  >
                    <FactList>
                      <Fact
                        k="Lane"
                        v={production.platform_fit?.recommended_lane}
                      />
                      <Fact
                        k="Content"
                        v={production.platform_fit?.content_level}
                      />
                      {production.platform_fit?.series_engine_or_release_model && (
                        <Fact
                          k="Model"
                          v={
                            production.platform_fit
                              .series_engine_or_release_model
                          }
                        />
                      )}
                    </FactList>
                  </Collapsible>
                  {production.rights_flags?.length ? (
                    <Collapsible
                      title="Rights & Clearance"
                      meta={`${production.rights_flags.length} item${production.rights_flags.length === 1 ? '' : 's'} to flag`}
                    >
                      <ul className="space-y-3 list-none p-0 m-0">
                        {production.rights_flags.map((r, i) => {
                          const text =
                            typeof r === 'string'
                              ? r
                              : `${r.type}: ${r.detail}`
                          return (
                            <li
                              key={i}
                              className="flex gap-3 text-[16px] text-[var(--gem-gray-100)] leading-[1.55]"
                            >
                              <span className="text-[var(--gem-gold)] flex-shrink-0">
                                •
                              </span>
                              <span>{text}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </Collapsible>
                  ) : null}
                </div>
              </Section>
            )}
              </div>
            </details>

            {/* REACH OUT TO THE WRITER — producer-only. Hidden once
                unmatched. Selznick-4 v9 (2026-04-28): we no longer expose
                the writer's email. The producer adds an optional note and
                hits Send Intro; we fire a Postmark email FROM
                anuj@gem.studio TO the writer with ReplyTo set to the
                producer's email so the writer's Reply lands directly in
                the producer's inbox. */}
            {!isUnmatched && isUnlocked && (
              <Section
                label="Reach out to the writer"
                subtitle="Send your intro by email — we'll deliver it. The writer can hit Reply to land in your inbox directly."
                defaultOpen
                summary={writerName ?? 'Writer'}
              >
                <div
                  className="rounded-xl px-5 py-5 flex flex-wrap items-start gap-4"
                  style={{
                    background: '#fff',
                    border: '1.5px solid var(--gem-accent)',
                    boxShadow: '0 2px 10px rgba(124,58,237,0.08)',
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{
                      width: 40,
                      height: 40,
                      background: 'rgba(124,58,237,0.10)',
                      color: 'var(--gem-accent)',
                      flexShrink: 0,
                    }}
                  >
                    <Mail size={18} strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 leading-snug">
                      {writerName ?? 'Writer'}
                    </p>
                    <p className="text-[12.5px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
                      Reachable via GEM
                    </p>
                  </div>
                  <ProducerIntroButton
                    matchId={match.id}
                    producerEmailedAt={match.producer_emailed_at}
                  />
                </div>
              </Section>
            )}
      </div>

      {/* Sticky bottom action bar — repeats Interested/Pass so the producer
          can react from anywhere on the page. Hidden when the match has
          ended. */}
      {!isUnmatched && (
        <StickyMatchActions matchId={match.id} status={match.status} />
      )}
    </>
  )
}

function RiskTile({
  label,
  axis,
}: {
  label: string
  axis: { level: 'low' | 'medium' | 'high'; note: string }
}) {
  const palette =
    axis.level === 'low'
      ? {
          border: 'rgba(5,150,105,0.35)',
          bg: 'rgba(5,150,105,0.07)',
          text: '#059669',
        }
      : axis.level === 'medium'
        ? {
            border: 'rgba(217,119,6,0.35)',
            bg: 'rgba(217,119,6,0.07)',
            text: '#d97706',
          }
        : {
            border: 'rgba(220,38,38,0.35)',
            bg: 'rgba(220,38,38,0.07)',
            text: '#dc2626',
          }
  return (
    <div
      className="rounded-xl p-5"
      style={{ border: `1px solid ${palette.border}`, background: palette.bg }}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
        {label}
      </p>
      <p
        className="text-[20px] font-bold capitalize m-0 mb-2"
        style={{ color: palette.text }}
      >
        {axis.level}
      </p>
      <p className="text-[13px] text-[var(--gem-gray-300)] leading-[1.5] m-0">
        {axis.note}
      </p>
    </div>
  )
}

function DimensionRow({
  label,
  score,
  reasoning,
}: {
  label: string
  score: number
  reasoning: string
}) {
  const palette =
    score >= 8
      ? { text: '#059669', fill: '#059669' }
      : score >= 5
        ? { text: '#d97706', fill: '#d97706' }
        : { text: '#dc2626', fill: '#dc2626' }
  const pct = Math.max(0, Math.min(100, score * 10))
  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--gem-gray-700)', background: '#fff' }}
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
          {label}
        </p>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          <span
            className="text-[26px] font-bold tabular-nums"
            style={{ color: palette.text }}
          >
            {score}
          </span>
          <span className="text-[13px] text-[var(--gem-gray-400)]">/ 10</span>
        </div>
      </div>
      <div
        className="h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: 'var(--gem-gray-800)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: palette.fill }}
        />
      </div>
      {reasoning && (
        <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0">
          {reasoning}
        </p>
      )}
    </div>
  )
}
