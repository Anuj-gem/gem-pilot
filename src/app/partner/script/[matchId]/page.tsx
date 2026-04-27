// /partner/script/[matchId] — producer-facing script detail page.
//
// Server component. Auth gates mirror /partner:
//   1. Not signed in            → /login
//   2. Signed in, not producer  → /dashboard
//   3. Producer, lane null      → /onboarding/producer
//   4. Match not owned by user  → notFound (RLS would hide it anyway)
//
// Side effect on load: any 'pending' match flips to 'opened' with
// opened_at = now(). That's the "viewed" signal the writer + matching
// engine care about. Already-reacted statuses (interested/passed/commented)
// stay put — we only promote the very first view.
//
// Render: a stripped-down producer view of the writer report. We re-use the
// existing report components where possible (PackagingSection,
// RiskDetailsSection, IssuesSection, Section/Collapsible) so the visual
// vocabulary stays consistent with what writers see when they preview their
// own report.
//
// Sections (in order):
//   1. Top hero (title + score + tier + headline + actions)
//   2. Why this could be a hit (whats_special.headline + strengths)
//   3. Packaging (PackagingSection)
//   4. Project Risks (RiskDetailsSection)
//   5. Lead Characters (re-uses Collapsible pattern from the writer report)
//   6. Issues (IssuesSection)
//   7. Sticky bottom action bar repeats the actions

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { Section, Collapsible } from '@/components/report/v5-components'
import { PackagingSection } from '@/components/report/packaging-block'
import { RiskDetailsSection } from '@/components/report/risk-details-card'
import { IssuesSection } from '@/components/report/issues-block'
import { MatchActions } from '@/components/partner/match-actions'
import { StickyMatchActions } from '@/components/partner/sticky-actions'
import type { GEMEvaluation, LeadCharacter } from '@/types'

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
  script_submissions: {
    id: string
    title: string
    declared_format: string | null
    user_id: string | null
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

function titleCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

const FORMAT_LABEL: Record<string, string> = {
  feature: 'Feature',
  series: 'Series',
  'feature film': 'Feature',
}

const BUDGET_TAG_LABEL: Record<string, string> = {
  micro: 'Sub-$1M',
  indie: '$1–15M',
  mid: '$15–50M',
  studio: '$50M+',
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

  // Fetch the match + joined submission + most-recent evaluation.
  const { data: matchRaw } = await supabase
    .from('script_matches')
    .select(
      `
      id, producer_id, status, comment, submission_id,
      script_submissions (
        id, title, declared_format, user_id,
        script_evaluations ( id, weighted_score, tier, evaluation, edited_fields )
      )
      `
    )
    .eq('id', matchId)
    .maybeSingle()

  const match = matchRaw as unknown as MatchRow | null

  // Defense in depth — RLS already filters by producer_id, but guarantee the
  // 404 if anyone slips through (e.g. preview env without RLS).
  if (!match || match.producer_id !== user.id) {
    notFound()
  }
  const sub = match.script_submissions
  if (!sub) notFound()

  const evalRaw = Array.isArray(sub.script_evaluations)
    ? sub.script_evaluations[0]
    : sub.script_evaluations
  if (!evalRaw) notFound()

  const evaluation = evalRaw.evaluation
  if (!evaluation) notFound()

  // Promote pending → opened on first view. We only update if status is
  // pending; once a producer has reacted (interested/passed/commented),
  // their action stays the source of truth. We don't await this —
  // technically we should, since RLS / no-cache means the row will be
  // re-read on next refresh anyway, but doing it inline keeps the side
  // effect transparent and keeps the page render in sync within a request.
  if (match.status === 'pending') {
    await supabase
      .from('script_matches')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', matchId)
      .eq('status', 'pending')
    // mutate the local copy so the actions render reflects the new status.
    match.status = 'opened'
  }

  // Compute display-ready bits.
  const editedTitle =
    typeof evalRaw.edited_fields?.title === 'string' &&
    evalRaw.edited_fields.title.trim().length > 0
      ? evalRaw.edited_fields.title.trim()
      : null
  const title = editedTitle ?? sub.title ?? 'Untitled'

  const editedHeadline =
    typeof evalRaw.edited_fields?.logline === 'string' &&
    evalRaw.edited_fields.logline.trim().length > 0
      ? evalRaw.edited_fields.logline.trim()
      : null
  const headline = editedHeadline ?? evaluation.positioning_hook ?? null

  const score =
    typeof evalRaw.weighted_score === 'number'
      ? evalRaw.weighted_score
      : evalRaw.weighted_score != null
        ? Number(evalRaw.weighted_score)
        : null
  const tier = evalRaw.tier ?? null

  const formatRaw = sub.declared_format ?? evaluation.classification?.format ?? ''
  const formatTag = formatRaw
    ? FORMAT_LABEL[formatRaw.toLowerCase()] || titleCase(formatRaw)
    : null

  const genreTags: string[] = []
  if (evaluation.classification?.genre_primary) {
    genreTags.push(titleCase(evaluation.classification.genre_primary))
  }
  for (const t of evaluation.classification?.genre_tags ?? []) {
    if (typeof t === 'string' && t.trim() && !genreTags.includes(titleCase(t))) {
      genreTags.push(titleCase(t))
    }
  }

  const budgetTier = evaluation.packaging?.budget_tier?.tier
  const budgetTag = budgetTier
    ? BUDGET_TAG_LABEL[budgetTier.toLowerCase()] || titleCase(budgetTier)
    : null

  const tags: string[] = []
  if (formatTag) tags.push(formatTag)
  for (const g of genreTags.slice(0, 3)) tags.push(g)
  if (budgetTag) tags.push(budgetTag)

  const whatsSpecial = evaluation.whats_special
  const leadCharacters: LeadCharacter[] = evaluation.lead_characters ?? []
  const packaging = evaluation.packaging
  const riskDetails = evaluation.risk_details
  const issues = evaluation.issues

  return (
    <>
      <Nav />
      {/* pb-24 leaves room for the sticky bottom action bar */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
        {/* Back link */}
        <Link
          href="/partner"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] mb-4"
        >
          <ArrowLeft size={14} />
          Back to your inbox
        </Link>

        {/* Top hero */}
        <div
          className="relative rounded-2xl overflow-hidden mb-10"
          style={{
            background:
              'radial-gradient(ellipse at 0% 0%, rgba(212,160,23,0.07) 0%, transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.06) 0%, transparent 55%), #fff',
            border: '1.5px solid var(--gem-accent)',
            boxShadow:
              '0 4px 20px rgba(124,58,237,0.10), 0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div className="px-6 sm:px-8 pt-6 pb-5">
            <div className="grid sm:grid-cols-[1fr_auto] gap-x-8 gap-y-3 items-start">
              <div className="min-w-0">
                <div
                  aria-hidden
                  style={{
                    width: 48,
                    height: 2,
                    background: 'var(--gem-gold)',
                    borderRadius: 1,
                    marginBottom: 12,
                  }}
                />
                <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.1] m-0">
                  {title}
                </h1>
                {headline && (
                  <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.5] mt-3 m-0 max-w-[64ch]">
                    {headline}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-4">
                    {tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-[12px] font-medium px-2.5 py-1 rounded-full"
                        style={{
                          background: '#fff',
                          border: '1px solid var(--gem-gray-700)',
                          color: 'var(--gem-gray-300)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {typeof score === 'number' && (
                <div className="flex flex-col items-end shrink-0 min-w-[130px]">
                  <div
                    className="leading-none tabular-nums font-extrabold tracking-tight"
                    style={{
                      fontSize: 56,
                      color: 'var(--gem-accent)',
                    }}
                  >
                    {score.toFixed(1)}
                    <span
                      className="font-bold ml-0.5"
                      style={{ fontSize: 24, color: 'var(--gem-gray-500)' }}
                    >
                      /100
                    </span>
                  </div>
                  <p
                    className="text-[10px] uppercase tracking-[0.18em] font-semibold m-0 mt-1.5"
                    style={{ color: 'var(--gem-gray-500)' }}
                  >
                    GEM score
                  </p>
                  {tier && (
                    <p
                      className="text-[11px] uppercase tracking-[0.16em] font-bold m-0 mt-2"
                      style={{ color: 'var(--gem-gold)' }}
                    >
                      {tier}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div
              className="mt-5 pt-4"
              style={{ borderTop: '1px solid rgba(124,58,237,0.18)' }}
            >
              <MatchActions
                matchId={match.id}
                status={match.status}
                variant="detail"
              />
              {match.comment && match.status === 'commented' && (
                <div
                  className="mt-3 rounded-lg p-3 text-[13px] text-[var(--gem-gray-200)] leading-snug"
                  style={{
                    background: 'rgba(124,58,237,0.06)',
                    border: '1px solid rgba(124,58,237,0.20)',
                  }}
                >
                  <span className="block text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-accent)] mb-1">
                    Your note to the writer
                  </span>
                  {match.comment}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WHY THIS COULD BE A HIT — re-frames "What's Working" for a
            buyer-side audience. Same data, producer-voiced subtitle. */}
        {whatsSpecial && (whatsSpecial.headline || (whatsSpecial.strengths?.length ?? 0) > 0) && (
          <Section
            label="Why this could be a hit"
            subtitle={whatsSpecial.headline}
          >
            <div className="space-y-3">
              {(whatsSpecial.strengths ?? []).map((s, i) => (
                <Collapsible
                  key={i}
                  number={i + 1}
                  title={s.dimension_or_area}
                  defaultOpen={i === 0}
                >
                  <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                    {s.what_it_means}
                  </p>
                </Collapsible>
              ))}
            </div>
          </Section>
        )}

        {/* PACKAGING — comps, audience, budget tier, lane fit, IP. */}
        {packaging && <PackagingSection data={packaging} />}

        {/* PROJECT RISKS — budget / casting / development cards. */}
        {riskDetails && <RiskDetailsSection data={riskDetails} />}

        {/* LEAD CHARACTERS — names + actor-bait. Mirrors the writer report
            pattern at /report/[id] but without the paywall blur. */}
        {leadCharacters.length > 0 && (
          <Section
            label="Lead characters"
            subtitle="The parts inside this script and why an actor would chase them."
          >
            <div className="space-y-3">
              {leadCharacters.map((c, i) => (
                <Collapsible
                  key={i}
                  title={c.name}
                  meta={`${c.role_type} · ${c.demographics}`}
                  defaultOpen={i === 0}
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
          </Section>
        )}

        {/* ISSUES — producer-voiced case-against. Re-uses the v5.4 component
            which already does the primary-lever red-accent treatment. */}
        {issues && (issues.items?.length > 0 || issues.headline) && (
          <IssuesSection data={issues} />
        )}
      </div>

      {/* Sticky bottom action bar — repeats the hero CTAs so a producer can
          react from anywhere on the page. */}
      <StickyMatchActions matchId={match.id} status={match.status} />
    </>
  )
}
