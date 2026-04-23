// v5 report — positioning-first. No scores or tiers in the Pitch view.
// Pitch tab (public): hook, what makes this special (collapsibles), lead
// characters (collapsibles), package angles (director + buyer).
// Details tab (private to the writer): GEM Rank, At a Glance risk pills,
// development priorities, production planning details, narrative analysis
// details. All cards are collapsibles.
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound, redirect } from 'next/navigation'
import Nav from '@/components/nav'
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { InlineSignup } from '@/components/report/inline-signup'
import { InlineUpgradeCTA } from '@/components/report/inline-upgrade-cta'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { PrivateDemoBanner } from '@/components/report/private-demo-banner'
import { ReportTabs } from '@/components/report/report-tabs'
import { ContactWriter } from '@/components/report/contact-writer'
import { ShareSection } from '@/components/report/share-section'
import { PostUpgradeEmail } from '@/components/report/post-upgrade-email'
import { LockedReportUpgrade } from '@/components/report/locked-report-upgrade'
import { SubmitRevisionButton } from '@/components/report/submit-revision-button'
import { LockedAfterEvalScreen } from '@/components/report/locked-after-eval-screen'
import { DetailsView } from '@/components/report/details-view'
import { Section, Collapsible } from '@/components/report/v5-components'
import { EditableTopCard } from '@/components/report/editable-top-card'
import { normalizeEvaluation, calculateWeightedScore } from '@/types'
import type { ScriptEvaluation, ScriptSubmission, GEMEvaluation, DimensionId } from '@/types'
import { getDisplayTopCard, hasEdits } from '@/lib/edited-fields'
import { scoreDesignation, DESIGNATION_STYLE, DESIGNATION_COPY } from '@/lib/designation'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ for?: string; subscribed?: string }>
}

// v4/v5/v5.2-specific fields not yet in the shared GEMEvaluation type.
// v5.2 additions: director fit_profile, considerations is_primary_lever, top-level craft_note.
interface V5Extras {
  positioning_hook?: string
  lead_characters?: {
    name: string
    role_type: string
    demographics: string
    hook: string
    why_actor_wants_this: string
  }[]
  considerations?: { area: string; detail: string; source?: string; is_primary_lever?: boolean }[]
  package_angles?: {
    director_appeal: { hook: string; fit_profile?: string; detail: string }
    buyer_appeal: { tier: string; lane: string; detail: string }
  }
  craft_note?: string
}

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { for: forWriter, subscribed: justSubscribed } = await searchParams
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: evaluation, error } = await serviceClient
    .from('script_evaluations')
    .select(`
      *,
      script_submissions (
        id, user_id, title, filename, file_size, status, is_public, created_at, expires_at, declared_format,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !evaluation) notFound()

  // Preview-only override: if USE_PENDING_EVALS=1 is set, swap payload with the
  // rescored row from script_evaluations_pending matched by submission_id.
  if (process.env.USE_PENDING_EVALS === '1') {
    const subId = (evaluation as any).submission_id
    if (subId) {
      const { data: pending } = await serviceClient
        .from('script_evaluations_pending')
        .select('weighted_score, tier, evaluation')
        .eq('submission_id', subId)
        .maybeSingle()
      if (pending) {
        ;(evaluation as any).weighted_score = pending.weighted_score
        ;(evaluation as any).tier = pending.tier
        ;(evaluation as any).evaluation = pending.evaluation
      }
    }
  }

  const eval_ = evaluation as ScriptEvaluation & {
    script_submissions: ScriptSubmission & {
      profiles: { full_name: string; avatar_url: string | null } | null
    }
  }

  const report = eval_.evaluation as GEMEvaluation & V5Extras
  const submission = eval_.script_submissions
  const isOwner = user?.id === submission.user_id
  // Admin override — anuj@gem.studio can see the Development tab on any
  // report, same as if they owned it. Kept as a hardcoded email for now
  // (single admin) so we don't need a new role column / RLS policy.
  const isAdmin = user?.email === 'anuj@gem.studio'
  const isAnonymousSubmission = !submission.user_id
  const hasExpiry = isAnonymousSubmission && !!submission.expires_at
  const isExpired = hasExpiry && new Date(submission.expires_at!) < new Date()
  const writerName = submission.profiles?.full_name ?? 'the writer'

  const { whatsSpecial } = normalizeEvaluation(report)

  // Writer-edited overrides for the top card (title / genre / tone / logline).
  // `edited_fields` may be missing on legacy rows or before the migration has
  // been applied; getDisplayTopCard() treats null/undefined as "no edits".
  const editedFields = (eval_ as any).edited_fields ?? null
  const topCard = getDisplayTopCard(report, editedFields, submission.title)
  const topCardHasEdits = hasEdits(editedFields)

  let ownerIsSubscribed = false
  if (submission.user_id) {
    const { data: ownerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', submission.user_id)
      .single()
    ownerIsSubscribed = ownerProfile?.subscription_status === 'active'
  }

  let viewerIsSubscribed = false
  if (user) {
    const { data: viewerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    viewerIsSubscribed = viewerProfile?.subscription_status === 'active'
  }

  const showUpgradeCTA = !viewerIsSubscribed && !!user

  // Owner-based blur gate (pre-Apr 15 behavior, restored April 2026).
  //   • Writer hasn't subscribed → report content is blurred for anyone viewing
  //     (writer, visitor on Discover, etc.). Top card stays visible so the
  //     writer gets their headline signal.
  //   • Writer is Pro → report is fully unlocked for everyone (including
  //     non-subscribed visitors on Discover).
  const locked = !ownerIsSubscribed

  // First-eval gate (April 2026): an unsubscribed writer can view their FIRST
  // completed report (in a partially-blurred state); any subsequent report is
  // not accessible by URL — they're redirected to /dashboard. This plugs the
  // "hammer submissions to iterate on score" leak where writers were re-running
  // evals to read the score climb without ever paying.
  //   • Owner + !subscribed + not-first-eval + not-admin → redirect /dashboard
  //   • Non-owners on Discover keep the blurred-preview behavior (unchanged).
  // For an unsubscribed owner whose 2nd+ eval just finished, render the
  // upgrade interstitial instead of redirecting to /dashboard. Same gate as
  // before — the writer can still go to dashboard from the interstitial,
  // but they get a clear upgrade path first instead of feeling dumped.
  let lockedAfterFreeEval = false
  if (isOwner && !ownerIsSubscribed && submission.user_id && !isAdmin) {
    const { data: firstSub } = await serviceClient
      .from('script_submissions')
      .select('id')
      .eq('user_id', submission.user_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (firstSub?.id !== submission.id) {
      lockedAfterFreeEval = true
    }
  }

  // Portfolio rank — position of this eval among the owner's completed submissions,
  // sorted by weighted_score desc (older first as tiebreaker). Owner-only signal.
  let portfolioRank: number | null = null
  let portfolioTotal = 0
  if (isOwner && submission.user_id) {
    const { data: userSubs } = await serviceClient
      .from('script_submissions')
      .select('id')
      .eq('user_id', submission.user_id)
      .eq('status', 'completed')

    if (userSubs && userSubs.length > 0) {
      const subIds = userSubs.map((s: { id: string }) => s.id)
      const { data: userEvals } = await serviceClient
        .from('script_evaluations')
        .select('id, weighted_score, created_at')
        .in('submission_id', subIds)

      if (userEvals && userEvals.length > 0) {
        const sorted = [...userEvals].sort((a, b) => {
          const ds = (b.weighted_score ?? 0) - (a.weighted_score ?? 0)
          if (ds !== 0) return ds
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
        const idx = sorted.findIndex((e) => e.id === id)
        if (idx >= 0) {
          portfolioRank = idx + 1
          portfolioTotal = sorted.length
        }
      }
    }
  }

  const { count: likeCount } = await supabase
    .from('script_likes')
    .select('*', { count: 'exact', head: true })
    .eq('evaluation_id', id)

  let userLiked = false
  if (user) {
    const { data: existingLike } = await supabase
      .from('script_likes')
      .select('id')
      .eq('evaluation_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    userLiked = !!existingLike
  }

  const allStrengths = whatsSpecial.strengths ?? []

  const leadCharacters = report.lead_characters ?? []
  const considerations = report.considerations ?? []
  const packageAngles = report.package_angles
  const production = report.production_reality
  const scores = report.scores ?? {}
  const craftNote = report.craft_note ?? null

  // Commercial Potential Score — weighted composite (0-100) from the 10 dim scores.
  // Dimension weights themselves are NEVER surfaced publicly; only the composite.
  // Tolerate malformed score objects gracefully so legacy evals still render.
  let commercialScore: number | null = null
  try {
    if (scores && Object.keys(scores).length >= 10) {
      commercialScore = calculateWeightedScore(scores as Record<DimensionId, { score: number }>)
    }
  } catch {
    commercialScore = null
  }
  // Three-tier designation (GEM Select ≥75, Very Promising 50–74, Shows
  // Potential <50) is derived inside DetailsView from the score; the report
  // page itself no longer reads it directly.

  // Contact Writer gating:
  //   - owner ALWAYS sees their own state (owner_live if Pro, owner_upsell
  //     if free) — the card is a status nudge about their own reachability,
  //     not just a public contact affordance. Shows even on private reports.
  //   - non-owners only see it on public reports (live if writer is Pro,
  //     writer_not_pro if writer is free).
  //   - anonymous submission → no contact (no writer to reach).
  let contactState: 'live' | 'owner_upsell' | 'owner_live' | 'writer_not_pro' | null = null
  if (!isAnonymousSubmission && !!submission.user_id) {
    if (isOwner) {
      contactState = ownerIsSubscribed ? 'owner_live' : 'owner_upsell'
    } else if (submission.is_public) {
      contactState = ownerIsSubscribed ? 'live' : 'writer_not_pro'
    }
  }

  // Selective blur for locked-report content — same CSS pattern as DetailsView.
  // Headers, titles, and metadata stay crisp so the writer sees the structure
  // of what they're paying for; the prose underneath is visually obscured.
  const blurStyle: React.CSSProperties = {
    filter: 'blur(5px)',
    userSelect: 'none',
  }

  // Free writer just finished their 2nd+ eval — show the upgrade interstitial
  // instead of dumping them on /dashboard. Their score + dev notes are live
  // in the DB; Pro unlocks viewing them.
  if (lockedAfterFreeEval) {
    return (
      <>
        <Nav />
        <ReportAnalytics evaluationId={id} isBlurred={true} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
          <LockedAfterEvalScreen evaluationId={id} title={submission.title} />
        </div>
      </>
    )
  }

  return (
    <>
      <Nav />
      {justSubscribed === 'true' && <PostUpgradeEmail />}
      {hasExpiry && !isExpired && (
        <ExpiryCountdown expiresAt={submission.expires_at!} evaluationId={id} />
      )}
      <ReportAnalytics evaluationId={id} isBlurred={false} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">
        {forWriter && <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />}

        {isAnonymousSubmission && (
          <div id="inline-signup" className="rounded-xl transition-shadow duration-500 mb-8">
            <InlineSignup submissionId={submission.id} evaluationId={id} />
          </div>
        )}

        {!isAnonymousSubmission && (
          <div className="flex items-center gap-3 flex-wrap mb-8">
            {isOwner && (
              <VisibilityToggle
                submissionId={submission.id}
                initialPublic={submission.is_public ?? false}
                title={submission.title}
                score={eval_?.weighted_score ?? undefined}
                isSubscribed={ownerIsSubscribed}
              />
            )}
            <LikeButton
              evaluationId={id}
              initialLiked={userLiked}
              initialCount={likeCount ?? 0}
              loggedIn={!!user}
            />
            {isOwner && (
              <SubmitRevisionButton
                isSubscribed={ownerIsSubscribed}
                declaredFormat={submission.declared_format ?? null}
              />
            )}
          </div>
        )}

        {/* Title + classification + logline — owner-editable in a single card */}
        <EditableTopCard
          evaluationId={id}
          initial={topCard}
          isOwner={isOwner}
          hasEdits={topCardHasEdits}
          postedAt={submission.created_at ?? null}
          authorName={
            isAnonymousSubmission ? null : submission.profiles?.full_name ?? null
          }
          isGemSelect={typeof commercialScore === 'number' && commercialScore >= 75}
        />

        {/* Compact owner-only mini-score card. Surfaces the score + tier
            privately to the writer (score is never public — non-owners won't
            see this block at all), points to the Development tab for the
            full breakdown, and stacks the upgrade CTA alongside. Replaces
            the old large unlock box so blurred tab content enters the
            viewport sooner on mobile. */}
        {locked && isOwner && (() => {
          const designation = scoreDesignation(commercialScore)
          const tierStyle = designation ? DESIGNATION_STYLE[designation] : null
          // Tier-driven background + border so the mini-card matches the
          // big Commercial Score card on the Details tab (gold for GEM Select,
          // green for Very Promising, amber for Shows Potential). Falls back
          // to gold-tinted neutral when the score isn't computed yet.
          const cardStyle = tierStyle
            ? { border: `1px solid ${tierStyle.border}`, background: tierStyle.bg }
            : undefined
          return (
            <div
              className="rounded-xl px-4 py-4 sm:px-5 sm:py-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              style={
                cardStyle ?? {
                  border: '1px solid rgba(200,164,92,0.4)',
                  background: 'rgba(200,164,92,0.06)',
                }
              }
            >
              <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-left">
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] m-0 mb-1.5">
                  Your score · only visible to you
                </p>
                {typeof commercialScore === 'number' ? (
                  <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                    <span className="text-[30px] sm:text-[34px] font-bold tabular-nums leading-none text-[var(--gem-white)]">
                      {commercialScore}
                    </span>
                    {tierStyle && (
                      <span
                        className="text-[14px] sm:text-[15px] font-semibold"
                        style={{ color: tierStyle.text }}
                      >
                        · {tierStyle.label}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[18px] font-semibold text-[var(--gem-white)] m-0">
                    Score unavailable
                  </p>
                )}
                {designation && (
                  <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-100)] m-0 mt-2.5 leading-[1.5] max-w-[56ch]">
                    {DESIGNATION_COPY[designation].message}
                  </p>
                )}
                <p className="text-[12px] sm:text-[13px] text-[var(--gem-gray-400)] m-0 mt-2 leading-snug">
                  See the full breakdown in the Development tab.
                </p>
              </div>
              <div className="shrink-0 w-full sm:w-auto flex flex-col items-stretch sm:items-start gap-2.5">
                <LockedReportUpgrade evaluationId={id} />
                {/* Tight reasons-to-click anchored to the CTA so the writer
                    knows what the $20 actually unlocks: the full report
                    they're staring at, Discover publishing, and unlimited
                    re-evals on future drafts. */}
                <ul className="text-[12px] text-[var(--gem-gray-300)] m-0 p-0 list-none space-y-1 text-center sm:text-left">
                  <li>
                    <span style={{ color: 'var(--gem-gold)' }}>✓</span>{' '}
                    Unlock your full report
                  </li>
                  <li>
                    <span style={{ color: 'var(--gem-gold)' }}>✓</span>{' '}
                    Publish to Discover
                  </li>
                  <li>
                    <span style={{ color: 'var(--gem-gold)' }}>✓</span>{' '}
                    Unlimited revisions
                  </li>
                </ul>
              </div>
            </div>
          )
        })()}

        {/* Share section — placed above the tabs so writers can grab the
            link right after the top card without scrolling past the full
            report. Owner always sees it on their own report (handy after
            publishing); non-owners only on public reports. */}
        {(submission.is_public || isOwner) && (
          <div className="mb-8">
            <ShareSection evaluationId={id} title={topCard.title} />
          </div>
        )}

        <ReportTabs
          showDetails={isOwner || isAdmin || submission.is_public}
          detailsLocked={locked || (!isOwner && !isAdmin)}
          pitch={
            <>
              {/* What's Working — numbered collapsibles with evidence sidebar.
                  Locked free writers see the section summary + first item
                  crisp as a tease; titles of items 2+ are blurred (same
                  pattern as Development Priorities). Bodies stay crisp when
                  expanded — the blur is a gate on *discoverability*, not a
                  data wipe. */}
              {allStrengths.length > 0 && (
                <Section label="Why this can be a hit" subtitle={whatsSpecial.headline}>
                  <div className="space-y-3">
                    {allStrengths.map((s, i) => (
                      <Collapsible
                        key={i}
                        number={i + 1}
                        title={s.dimension_or_area}
                        titleBlurred={locked && i > 0}
                      >
                        <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0 mb-4">
                          {s.what_it_means}
                        </p>
                        {s.evidence && (
                          <div
                            className="rounded-lg p-5"
                            style={{
                              background: 'rgba(200,164,92,0.07)',
                              borderLeft: '3px solid var(--gem-gold)',
                            }}
                          >
                            <p
                              className="text-[12px] uppercase tracking-[0.2em] font-bold mb-2 m-0"
                              style={{ color: 'var(--gem-gold)' }}
                            >
                              Evidence from the script
                            </p>
                            <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                              {s.evidence}
                            </p>
                          </div>
                        )}
                      </Collapsible>
                    ))}
                  </div>
                </Section>
              )}

              {/* Lead Characters */}
              {leadCharacters.length > 0 && (
                <Section
                  label="Lead Characters"
                  subtitle="The parts inside this script and why an actor would chase them."
                >
                  <div className="space-y-3">
                    {leadCharacters.map((c, i) => (
                      <Collapsible
                        key={i}
                        title={c.name}
                        meta={`${c.role_type} · ${c.demographics}`}
                      >
                        <p
                          className="text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0 mb-5"
                          style={locked ? blurStyle : undefined}
                        >
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
                          <p
                            className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0"
                            style={locked ? blurStyle : undefined}
                          >
                            {c.why_actor_wants_this}
                          </p>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </Section>
              )}

              {/* Package Angles — who would direct this, and who would buy it */}
              {packageAngles && (
                <Section
                  label="Package Angles"
                  subtitle="Who would direct this, and who would buy it."
                >
                  <div className="space-y-3">
                    <Collapsible title="Why a director wants this" accent="#059669">
                      <p
                        className="text-[18px] font-semibold text-[var(--gem-gray-50)] leading-[1.4] mb-4 m-0"
                        style={locked ? blurStyle : undefined}
                      >
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
                          <p
                            className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0"
                            style={locked ? blurStyle : undefined}
                          >
                            {packageAngles.director_appeal.fit_profile}
                          </p>
                        </div>
                      )}
                      <p
                        className="text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                        style={locked ? blurStyle : undefined}
                      >
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
                      <p
                        className="text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                        style={locked ? blurStyle : undefined}
                      >
                        {packageAngles.buyer_appeal.detail}
                      </p>
                    </Collapsible>
                  </div>
                </Section>
              )}

              {/* Soft upgrade CTA for non-subscribers — portfolio-aware copy */}
              {showUpgradeCTA && (
                <InlineUpgradeCTA
                  evaluationId={id}
                  submissionCount={portfolioTotal}
                  cta="Go Pro — $20/mo"
                />
              )}
            </>
          }
          details={
            <DetailsView
              scores={scores}
              production={production}
              considerations={considerations}
              locked={locked}
              publicViewer={!isOwner && !isAdmin}
              writerName={writerName}
              evaluationId={id}
              portfolioRank={portfolioRank}
              portfolioTotal={portfolioTotal}
              commercialScore={commercialScore}
              craftNote={craftNote}
            />
          }
        />

        {/* Contact writer lives below the tabs — it's a secondary action
            (rep-style inbound request) and not as time-sensitive as the
            share link, which the writer typically reaches for immediately
            after publishing. */}
        {contactState && (
          <div className="mt-10">
            <ContactWriter
              evaluationId={id}
              writerName={writerName}
              state={contactState}
              isLoggedIn={!!user}
            />
          </div>
        )}
      </div>

      {/* SubscribeGate still available if triggered by upgrade CTA click */}
      {!viewerIsSubscribed && user && (
        <SubscribeGate evaluationId={id} isLoggedIn={true} />
      )}
    </>
  )
}
