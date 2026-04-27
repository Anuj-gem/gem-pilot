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
// Two distinct render modes, gated on status:
//
//   PRE-INTERESTED  (status = pending | opened, not unmatched)
//     - Title + score + headline + tags + a single "what's special" headline
//     - Big violet "Mark Interested to unlock" card explaining what opens
//     - Interested + Pass buttons only (Comment is part of the post-unlock
//       message thread, not a one-off field)
//     - Lead characters / packaging / risk / issues / strengths list / script
//       download button are all hidden.
//
//   POST-INTERESTED (status = interested | commented, not unmatched)
//     - Full report: strengths, packaging, risks, leads, issues
//     - Script download button (signed URL, gated server-side too)
//     - Message thread at the bottom for ongoing back-and-forth
//
//   ENDED           (unmatched_at != null)
//     - Same as post-interested visually, but the message thread is
//       read-only and we surface a "Match ended" notice up top.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Sparkles, Download, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { Section, Collapsible } from '@/components/report/v5-components'
import { PackagingSection } from '@/components/report/packaging-block'
import { RiskDetailsSection } from '@/components/report/risk-details-card'
import { IssuesSection } from '@/components/report/issues-block'
import { MatchActions } from '@/components/partner/match-actions'
import { StickyMatchActions } from '@/components/partner/sticky-actions'
import { MessageThread, type ThreadMessage } from '@/components/partner/message-thread'
import { ScriptDownloadButton } from '@/components/partner/script-download-button'
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
  unmatched_at: string | null
  unmatched_by: string | null
  unmatch_reason: string | null
  messages: unknown
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

  // Fetch the match + joined submission + most-recent evaluation, plus all
  // the new fields (unmatched_*, messages) so the gate + thread render in
  // the same round trip.
  const { data: matchRaw } = await supabase
    .from('script_matches')
    .select(
      `
      id, producer_id, status, comment, submission_id,
      unmatched_at, unmatched_by, unmatch_reason, messages,
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
  // their action stays the source of truth.
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

  // Gate state. `interested` and `commented` both unlock the full report
  // and the message thread; `passed` falls through to the gated view but
  // shows the "passed" pill in the action bar.
  const isUnlocked = match.status === 'interested' || match.status === 'commented'
  const isUnmatched = !!match.unmatched_at

  const messages: ThreadMessage[] = Array.isArray(match.messages)
    ? (match.messages as ThreadMessage[])
    : []

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

        {/* Unmatched notice — surfaced above the hero so the producer sees
            why the action surface is locked down. */}
        {isUnmatched && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-[13px] text-[var(--gem-gray-200)]"
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
              {/* Pre-Interested + post-Interested both expose Interested/Pass.
                  Comment is gone — the message thread below replaces it. */}
              <MatchActions
                matchId={match.id}
                status={match.status}
                variant="detail"
                hideComment
              />
            </div>
          </div>
        </div>

        {/* WHY THIS COULD BE A HIT — pre-Interested shows ONLY the headline
            (no expandable strengths). Post-Interested gets the full
            collapsible strengths list. */}
        {whatsSpecial && (whatsSpecial.headline || (whatsSpecial.strengths?.length ?? 0) > 0) && (
          <Section
            label="Why this could be a hit"
            subtitle={whatsSpecial.headline}
          >
            {isUnlocked ? (
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
            ) : (
              // Pre-Interested: headline only. We render the
              // <Section subtitle> above as the entire body in this mode.
              <p className="text-[13px] italic text-[var(--gem-gray-400)] m-0">
                Mark Interested below to read the full breakdown.
              </p>
            )}
          </Section>
        )}

        {/* GATE CARD — shown pre-Interested. Tells the producer what the
            unlock buys them. Big violet panel, intentionally heavy so it
            reads as the next step on the page. */}
        {!isUnlocked && !isUnmatched && (
          <div
            className="rounded-2xl px-6 sm:px-8 py-7 mb-12"
            style={{
              background:
                'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.04) 65%), #fff',
              border: '1.5px solid var(--gem-accent)',
              boxShadow:
                '0 4px 20px rgba(124,58,237,0.10), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: 'rgba(124,58,237,0.14)',
                  color: 'var(--gem-accent)',
                  flexShrink: 0,
                }}
              >
                <Lock size={16} strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[18px] sm:text-[20px] font-extrabold tracking-tight text-[var(--gem-gray-50)] m-0 mb-1 leading-tight">
                  Mark Interested to unlock
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-snug max-w-[60ch]">
                  Interested signals to the writer that you want to read the
                  script. Once you mark it, you&apos;ll see:
                </p>
              </div>
            </div>
            <ul className="grid gap-2 mb-5 ml-12 list-none p-0">
              <UnlockBullet
                icon={<Download size={14} />}
                label="The full script PDF, downloadable"
              />
              <UnlockBullet
                icon={<Sparkles size={14} />}
                label="Lead characters, packaging notes, risk profile, and the full case-against"
              />
              <UnlockBullet
                icon={<MessageCircle size={14} />}
                label="A direct message thread with the writer"
              />
            </ul>
            <div className="ml-12">
              <MatchActions
                matchId={match.id}
                status={match.status}
                variant="detail"
                hideComment
              />
            </div>
          </div>
        )}

        {/* POST-INTERESTED full report — packaging, risks, leads, issues. */}
        {isUnlocked && (
          <>
            {/* Script download — the producer's single most important
                unlock. Surfaced first so they don't have to scroll. */}
            <div
              className="rounded-xl px-5 py-5 mb-10 flex items-start gap-4 flex-wrap"
              style={{
                background: 'rgba(5,150,105,0.06)',
                border: '1px solid rgba(5,150,105,0.30)',
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] font-bold m-0 mb-1" style={{ color: '#059669' }}>
                  Script unlocked
                </p>
                <p className="text-[14.5px] text-[var(--gem-gray-100)] m-0 leading-snug">
                  Download the PDF — link is signed and good for 10 minutes.
                </p>
              </div>
              <ScriptDownloadButton matchId={match.id} />
            </div>

            {packaging && <PackagingSection data={packaging} />}
            {riskDetails && <RiskDetailsSection data={riskDetails} />}

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

            {issues && (issues.items?.length > 0 || issues.headline) && (
              <IssuesSection data={issues} />
            )}

            {/* MESSAGE THREAD — producer-side. Reads + writes
                script_matches.messages via /api/partner/match/[id]/react
                action='message'. Disabled if the writer unmatched. */}
            <Section
              label="Conversation"
              subtitle="Message the writer directly. They see your name and reply here."
            >
              <MessageThread
                matchId={match.id}
                viewerRole="producer"
                messages={messages}
                disabled={isUnmatched}
                disabledHint="The writer ended this match — the thread is read-only."
              />
            </Section>
          </>
        )}
      </div>

      {/* Sticky bottom action bar — repeats the hero CTAs so a producer can
          react from anywhere on the page. Hidden once the match is ended. */}
      {!isUnmatched && (
        <StickyMatchActions matchId={match.id} status={match.status} />
      )}
    </>
  )
}

function UnlockBullet({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-[var(--gem-gray-100)] leading-snug">
      <span
        className="inline-flex items-center justify-center rounded-md mt-0.5"
        style={{
          width: 22,
          height: 22,
          background: 'rgba(124,58,237,0.10)',
          color: 'var(--gem-accent)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </li>
  )
}
