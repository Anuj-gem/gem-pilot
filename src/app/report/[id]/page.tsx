// Unified single-page report (2026-04-23). No tabs.
//
// Every viewer — writer (free or Pro), visitor, admin — sees the same
// layout in the same order:
//
//   1. Top card (title + headline)
//   2. Commercial Potential Score
//   3. What's Working
//   4. Sharpest Lever
//   5. Production Signal
//   6. Lead Characters
//   7. Package Angles
//   8. Production Planning Details
//   9. Development Priorities
//  10. Narrative Breakdown
//
// Two gating layers on top:
//
//   A. Paywall (existing). Free-tier writers see their OWN report with
//      deep-dive body content blurred. Admin and Pro writers see crisp.
//   B. Privacy (new). Non-owners see only the sections the writer has
//      marked public — private sections are hidden entirely (no blur).
//      The owner's privacy panel controls this.
//
// Writer experience:
//   - Free, unpublished: sees full new layout with paywall blur.
//     Privacy panel visible — acts as a preview of what they'd get to
//     control, with "Go Pro to publish" CTA.
//   - Pro, unpublished: full layout crisp. Privacy panel lets them
//     pre-tune their sharing posture + hit publish.
//   - Pro, published: full layout crisp. Privacy panel fully interactive.
//
// Visitor experience: only public sections render, single "Reach out to
// {writer}" card at the bottom. No blur anywhere — clean writer-curated snapshot.
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import { QualificationBanner } from '@/components/report/qualification-banner'
import { LikeButton } from '@/components/report/like-button'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { InlineSignup } from '@/components/report/inline-signup'
import { InlineUpgradeCTA } from '@/components/report/inline-upgrade-cta'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { PrivateDemoBanner } from '@/components/report/private-demo-banner'
import { ShareSection } from '@/components/report/share-section'
import { PostUpgradeEmail } from '@/components/report/post-upgrade-email'
import { SubmitRevisionButton } from '@/components/report/submit-revision-button'
import { LockedAfterEvalScreen } from '@/components/report/locked-after-eval-screen'
import { PublicContactCard } from '@/components/report/public-contact-card'
import { SectionGate } from '@/components/report/section-gate'
import { ContactWriter } from '@/components/report/contact-writer'
import { Section, Collapsible, FactList, Fact } from '@/components/report/v5-components'
import { EditableTopCard } from '@/components/report/editable-top-card'
import { normalizeEvaluation, calculateWeightedScore, DIMENSION_META } from '@/types'
import type { ScriptEvaluation, ScriptSubmission, GEMEvaluation, DimensionId } from '@/types'
import { getDisplayTopCard, hasEdits } from '@/lib/edited-fields'
import { scoreDesignation, DESIGNATION_STYLE, DESIGNATION_COPY } from '@/lib/designation'
import {
  normalizePrivacy,
  publicSectionCount,
  resolveVisibility,
  SECTION_KEYS,
  type ReportPrivacy,
} from '@/lib/report-privacy'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ for?: string; subscribed?: string; privacy?: string }>
}

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

type SubmissionWithPrivacy = ScriptSubmission & {
  profiles: { full_name: string; avatar_url: string | null } | null
  report_privacy?: ReportPrivacy | null
  contact_enabled?: boolean | null
  privacy_review_needed?: boolean | null
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
        id, user_id, title, filename, file_size, status, is_public, created_at,
        expires_at, declared_format, report_privacy, contact_enabled,
        privacy_review_needed,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !evaluation) notFound()

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
    script_submissions: SubmissionWithPrivacy
  }

  const report = eval_.evaluation as GEMEvaluation & V5Extras
  const submission = eval_.script_submissions
  const isOwner = user?.id === submission.user_id
  const isAdmin = user?.email === 'anuj@gem.studio'
  const isOwnerOrAdmin = isOwner || isAdmin
  const isAnonymousSubmission = !submission.user_id
  const hasExpiry = isAnonymousSubmission && !!submission.expires_at
  const isExpired = hasExpiry && new Date(submission.expires_at!) < new Date()
  const writerName = submission.profiles?.full_name ?? 'the writer'

  const privacy: ReportPrivacy = normalizePrivacy(submission.report_privacy)
  const contactEnabled = submission.contact_enabled !== false
  const needsPrivacyReview = submission.privacy_review_needed === true

  const { whatsSpecial } = normalizeEvaluation(report)

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
  const locked = !ownerIsSubscribed
  // Paywall blur: free-tier owner sees body content blurred on deep dives.
  // Admin never blurs. Non-owners don't use this axis — privacy gate handles
  // their visibility.
  const applyPaywallBlur = locked && isOwner && !isAdmin
  // Inline per-section privacy pills — shown for ANY owner (free or Pro).
  // Anuj's 2026-04-23 call: writers want to see "this is private" labels as
  // they scroll so they understand exactly what's exposed. Toggles save
  // directly; the Pro paywall only gates the actual Publish action (enforced
  // by the qualification banner's CTA). Free owners can plan their sharing
  // posture before they upgrade — feature-discovery, not a paywall wall.
  const privacyControlId: string | undefined = isOwner ? submission.id : undefined

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

  let commercialScore: number | null = null
  try {
    if (scores && Object.keys(scores).length >= 10) {
      commercialScore = calculateWeightedScore(scores as Record<DimensionId, { score: number }>)
    }
  } catch {
    commercialScore = null
  }

  const designation = scoreDesignation(commercialScore)

  // Early return for free-tier 2nd+ eval — dump them on the upgrade screen
  // instead of letting them scroll a report they won't be able to unlock.
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

  // Count hidden sections (for the visitor contact card copy).
  const hiddenSectionCount = isOwnerOrAdmin
    ? 0
    : SECTION_KEYS.filter((k) => resolveVisibility(privacy, k) === 'private').length
  const publicCount = publicSectionCount(privacy)
  const anyPublic = publicCount > 0

  const blurStyle: React.CSSProperties = {
    filter: 'blur(5px)',
    userSelect: 'none',
  }
  const bodyBlur = applyPaywallBlur ? blurStyle : undefined

  return (
    <>
      <Nav />
      {justSubscribed === 'true' && <PostUpgradeEmail />}
      {hasExpiry && !isExpired && (
        <ExpiryCountdown expiresAt={submission.expires_at!} evaluationId={id} />
      )}
      <ReportAnalytics evaluationId={id} isBlurred={applyPaywallBlur} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">
        {forWriter && <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />}

        {isAnonymousSubmission && (
          <div id="inline-signup" className="rounded-xl transition-shadow duration-500 mb-8">
            <InlineSignup submissionId={submission.id} evaluationId={id} />
          </div>
        )}

        {/* Owner action row — like + submit revision. The publish action
            is owned by the QualificationBanner below, so it doesn't appear
            as a separate pill here anymore. */}
        {!isAnonymousSubmission && isOwner && (
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <LikeButton
              evaluationId={id}
              initialLiked={userLiked}
              initialCount={likeCount ?? 0}
              loggedIn={!!user}
            />
            <SubmitRevisionButton
              isSubscribed={ownerIsSubscribed}
              declaredFormat={submission.declared_format ?? null}
            />
          </div>
        )}

        {/* Qualification banner — the writer's primary signal. Persistent
            for unpublished reports (qualifies ≥ 50 → publish CTA; below
            50 → "not ready yet" + submit revision). Disappears into a
            small success pill once published. */}
        {!isAnonymousSubmission && isOwner && (
          <QualificationBanner
            submissionId={submission.id}
            evaluationId={id}
            title={submission.title}
            initialPublic={submission.is_public ?? false}
            initialPrivacy={privacy}
            initialContactEnabled={contactEnabled}
            commercialScore={commercialScore}
            isSubscribed={ownerIsSubscribed}
            declaredFormat={submission.declared_format ?? null}
          />
        )}

        {/* Non-owner: just the like button on its own row. */}
        {!isAnonymousSubmission && !isOwner && !isAdmin && (
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <LikeButton
              evaluationId={id}
              initialLiked={userLiked}
              initialCount={likeCount ?? 0}
              loggedIn={!!user}
            />
          </div>
        )}

        {/* Visitor-only snapshot banner — frames the page as a writer-curated
            view so producers don't feel they're looking at a full dev report. */}
        {!isOwnerOrAdmin && !isAnonymousSubmission && anyPublic && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-6"
            style={{
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.22)',
            }}
          >
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full grid place-items-center text-white text-sm"
              style={{ background: 'var(--gem-accent)' }}
            >
              <span className="text-[12px] font-bold">i</span>
            </div>
            <p className="text-[13px] sm:text-[14px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
              <strong className="text-[var(--gem-gray-50)] font-semibold">
                {writerName}&apos;s public snapshot.
              </strong>{' '}
              They choose what&apos;s visible here. The full report stays with them — reach out below if you want to go deeper.
            </p>
          </div>
        )}

        {/* Owner privacy review banner — shown once for writers whose reports
            got migrated to the new default privacy settings. Pro-only since
            free writers can't do anything with privacy yet. */}
        {isOwner && ownerIsSubscribed && needsPrivacyReview && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(212,160,23,0.04))',
              border: '1px solid rgba(124,58,237,0.28)',
            }}
          >
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full grid place-items-center text-white text-[11px] font-bold mt-0.5"
              style={{ background: 'var(--gem-accent)' }}
            >
              !
            </div>
            <p className="text-[13px] sm:text-[14px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
              We just shipped granular privacy. Your report was set to{' '}
              <strong className="font-semibold">Balanced</strong>{' '}
              defaults — review what visitors see below.
            </p>
          </div>
        )}

        {/* Privacy is now fully handled by the publish/privacy modal
            triggered from the VisibilityToggle button above. The in-page
            panel was removed on 2026-04-23 — too many conflicting controls
            when the modal already owns preset selection, custom toggles,
            contact settings, publish, and unpublish. */}

        {/* HEADLINE — always public for visitors by default, owner sees it too. */}
        <SectionGate
          section="headline"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
          pillClassName="absolute right-5 bottom-5"
        >
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
        </SectionGate>

        {/* Mini score card removed 2026-04-23 — qualification banner above
            now handles the owner's primary signal. Free-tier owners still
            hit the upgrade modal through the banner's Publish CTA. */}

        {/* Share section — only when the report is actually public, or owner
            is Pro (Pro writers can pre-share via the private link before hitting
            publish). Free writers see the upgrade CTA above instead. */}
        {(submission.is_public || (isOwner && ownerIsSubscribed)) && (
          <div className="mb-8">
            <ShareSection evaluationId={id} title={topCard.title} />
          </div>
        )}

        {/* Commercial Viability Score card removed entirely 2026-04-23.
            Score is now an internal ranking signal only — not a section
            visitors or writers can toggle. Qualification banner above
            surfaces the only score-derived signal (≥50 qualifies). */}

        {/* WHAT'S WORKING */}
        <SectionGate
          section="whats_working"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
        >
          {allStrengths.length > 0 && (
            <Section label="Why this is a hit" subtitle={whatsSpecial.headline}>
              <div className="space-y-3">
                {allStrengths.map((s, i) => (
                  <Collapsible
                    key={i}
                    number={i + 1}
                    title={s.dimension_or_area}
                    titleBlurred={applyPaywallBlur && i > 0}
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
        </SectionGate>

        {/* LEAD CHARACTERS */}
        <SectionGate
          section="deep_dive_characters"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
        >
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
                  >
                    <p
                      className="text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0 mb-5"
                      style={bodyBlur}
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
                        style={bodyBlur}
                      >
                        {c.why_actor_wants_this}
                      </p>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </Section>
          )}
        </SectionGate>

        {/* PACKAGE ANGLES */}
        <SectionGate
          section="deep_dive_package"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
        >
          {packageAngles && (
            <Section label="Package angles" subtitle="Who would direct it, and who would buy it.">
              <div className="space-y-3">
                <Collapsible title="Why a director wants this" accent="#059669">
                  <p
                    className="text-[18px] font-semibold text-[var(--gem-gray-50)] leading-[1.4] mb-4 m-0"
                    style={bodyBlur}
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
                        style={bodyBlur}
                      >
                        {packageAngles.director_appeal.fit_profile}
                      </p>
                    </div>
                  )}
                  <p
                    className="text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                    style={bodyBlur}
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
                    style={bodyBlur}
                  >
                    {packageAngles.buyer_appeal.detail}
                  </p>
                </Collapsible>
              </div>
            </Section>
          )}
        </SectionGate>

        {/* PRODUCTION PLANNING OVERVIEW — at-a-glance risk pills */}
        <SectionGate
          section="production_signal"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
        >
          {production?.risk_rubric && (
            <Section label="Production Planning Overview" subtitle="Cost, cast, and content complexity at a glance.">
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                style={applyPaywallBlur ? { ...bodyBlur, pointerEvents: 'none' } : undefined}
                aria-hidden={applyPaywallBlur ? true : undefined}
              >
                {production.risk_rubric.cost && (
                  <RiskTile label="Production cost" axis={production.risk_rubric.cost} />
                )}
                {production.risk_rubric.cast && (
                  <RiskTile label="Cast complexity" axis={production.risk_rubric.cast} />
                )}
                {production.risk_rubric.content && (
                  <RiskTile label="Content maturity" axis={production.risk_rubric.content} />
                )}
              </div>
            </Section>
          )}
        </SectionGate>

        {/* DEVELOPMENT PRIORITIES — primary lever first (red-accent treatment),
            craft note as an inline callout, then all other considerations.
            Merges what was previously two sections ("Sharpest lever" + secondary
            Development Priorities) into a single coherent section that mirrors
            the structure of the actual report. */}
        <SectionGate
          section="deep_dive_development"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
        >
          {(considerations.length > 0 || craftNote) && (() => {
            const primary = considerations.find((c) => c.is_primary_lever === true)
            const secondary = considerations.filter((c) => c.is_primary_lever !== true)
            return (
              <Section
                label="Development Priorities"
                subtitle="The sharpest places to push on the next pass — positioning notes and directions a producer or collaborator might lean on in conversation."
              >
                <div className="space-y-3">
                  {primary && (
                    <Collapsible
                      title={primary.area}
                      primary
                      defaultOpen
                    >
                      <p
                        className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                        style={bodyBlur}
                      >
                        {primary.detail}
                      </p>
                    </Collapsible>
                  )}
                  {craftNote && (
                    <div
                      className="rounded-xl p-5"
                      style={{
                        background: 'rgba(5,150,105,0.07)',
                        border: '1px solid rgba(5,150,105,0.25)',
                      }}
                    >
                      <p
                        className="text-[12px] uppercase tracking-[0.2em] font-bold mb-2 m-0"
                        style={{ color: '#059669' }}
                      >
                        Craft note
                      </p>
                      <p
                        className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0"
                        style={bodyBlur}
                      >
                        {craftNote}
                      </p>
                    </div>
                  )}
                  {secondary.map((c, i) => (
                    <Collapsible
                      key={i}
                      title={c.area}
                      titleBlurred={applyPaywallBlur && i > 0}
                    >
                      <p
                        className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                        style={bodyBlur}
                      >
                        {c.detail}
                      </p>
                    </Collapsible>
                  ))}
                </div>
              </Section>
            )
          })()}
        </SectionGate>

        {/* NARRATIVE BREAKDOWN — 10 dim scores */}
        <SectionGate
          section="deep_dive_narrative"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
        >
          {scores && Object.values(scores).some((s) => typeof s?.score === 'number') && (
            <Section
              label="Narrative breakdown"
              subtitle="How the script reads on each of the ten craft dimensions. Scores are honest; commentary reflects the score, not a pitch of it."
            >
              <div className="space-y-3">
                {(Object.keys(DIMENSION_META) as DimensionId[]).map((dimId) => {
                  const s = scores?.[dimId]
                  if (typeof s?.score !== 'number') return null
                  const meta = DIMENSION_META[dimId]
                  return (
                    <DimensionRow
                      key={dimId}
                      label={meta.label}
                      score={s.score}
                      reasoning={s.reasoning}
                      locked={applyPaywallBlur}
                    />
                  )
                })}
              </div>
            </Section>
          )}
        </SectionGate>

        {/* PRODUCTION PLANNING DETAILS */}
        <SectionGate
          section="deep_dive_production"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
        >
          {production && (
            <Section
              label="Production Planning Details"
              subtitle="Everything the script tells us about how it would actually get made."
            >
              <div className="space-y-3">
                <Collapsible
                  title="Cast"
                  meta={`${production.cast?.leads ?? 0} lead${production.cast?.leads === 1 ? '' : 's'} · ${production.cast?.speaking_roles ?? 0} speaking roles${production.cast?.child_actors ? ' · child actors' : ''}`}
                >
                  <div style={bodyBlur} aria-hidden={applyPaywallBlur ? true : undefined}>
                    <FactList>
                      <Fact k="Speaking roles" v={production.cast?.speaking_roles} />
                      <Fact k="Leads" v={production.cast?.leads} />
                      {(production.cast?.series_regulars ?? 0) > 0 && (
                        <Fact k="Series regulars" v={production.cast?.series_regulars} />
                      )}
                      {production.cast?.child_actors && <Fact k="Child actors" v="Yes" />}
                      {production.cast?.casting_challenges?.length ? (
                        <Fact k="Casting" v={production.cast.casting_challenges.join(', ')} />
                      ) : null}
                    </FactList>
                  </div>
                </Collapsible>
                <Collapsible
                  title="Locations & Scale"
                  meta={`${production.locations?.distinct_count ?? 0} distinct${production.locations?.period_or_contemporary ? ` · ${production.locations.period_or_contemporary}` : ''}`}
                >
                  <div style={bodyBlur} aria-hidden={applyPaywallBlur ? true : undefined}>
                    <FactList>
                      <Fact k="Distinct locations" v={production.locations?.distinct_count} />
                      <Fact
                        k="Int / Ext"
                        v={
                          production.locations?.interior_exterior_ratio ??
                          production.locations?.interior_exterior_mix
                        }
                      />
                      <Fact k="Era" v={production.locations?.period_or_contemporary} />
                      {production.locations?.expensive_flags?.length ? (
                        <Fact k="Notable" v={production.locations.expensive_flags.join(', ')} />
                      ) : null}
                    </FactList>
                  </div>
                </Collapsible>
                <Collapsible
                  title="Technical"
                  meta={`VFX ${production.technical?.vfx_level ?? '—'} · Stunts ${production.technical?.stunts_level ?? production.technical?.stunts ?? '—'}`}
                >
                  <div style={bodyBlur} aria-hidden={applyPaywallBlur ? true : undefined}>
                    <FactList>
                      <Fact
                        k="VFX"
                        v={
                          (production.technical?.vfx_level ?? '') +
                          (production.technical?.vfx_details ? ` — ${production.technical.vfx_details}` : '')
                        }
                      />
                      <Fact
                        k="Stunts"
                        v={production.technical?.stunts_level ?? production.technical?.stunts}
                      />
                      {production.technical?.sfx_needs && (
                        <Fact k="SFX" v={production.technical.sfx_needs} />
                      )}
                      {production.technical?.night_shoots && (
                        <Fact k="Night shoots" v={production.technical.night_shoots} />
                      )}
                      {production.technical?.animals && <Fact k="Animals" v="Yes" />}
                    </FactList>
                  </div>
                </Collapsible>
                <Collapsible
                  title="Platform & Content"
                  meta={production.platform_fit?.recommended_lane}
                >
                  <div style={bodyBlur} aria-hidden={applyPaywallBlur ? true : undefined}>
                    <FactList>
                      <Fact k="Lane" v={production.platform_fit?.recommended_lane} />
                      <Fact k="Content" v={production.platform_fit?.content_level} />
                      {production.platform_fit?.series_engine_or_release_model && (
                        <Fact k="Model" v={production.platform_fit.series_engine_or_release_model} />
                      )}
                    </FactList>
                  </div>
                </Collapsible>
                {production.rights_flags?.length ? (
                  <Collapsible
                    title="Rights & Clearance"
                    meta={`${production.rights_flags.length} item${production.rights_flags.length === 1 ? '' : 's'} to flag`}
                  >
                    <ul
                      className="space-y-3 list-none p-0 m-0"
                      style={bodyBlur}
                      aria-hidden={applyPaywallBlur ? true : undefined}
                    >
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
                            <span className="text-[var(--gem-gold)] flex-shrink-0">•</span>
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
        </SectionGate>

        {/* Free-tier soft upgrade CTA */}
        {showUpgradeCTA && isOwner && (
          <InlineUpgradeCTA
            evaluationId={id}
            submissionCount={0}
            cta="Go Pro — $20/mo"
          />
        )}

        {/* Owner contact state card — Pro writers see "you're reachable".
            Free writers already have the upgrade CTA in the mini-score card
            above; adding another Go-Pro button here would just be clutter. */}
        {!isAnonymousSubmission && isOwner && ownerIsSubscribed && (
          <div className="mt-10">
            <ContactWriter
              evaluationId={id}
              writerName={writerName}
              state="owner_live"
              isLoggedIn={true}
            />
          </div>
        )}

        {/* Non-owner: single contact card at the bottom. */}
        {!isOwnerOrAdmin && !isAnonymousSubmission && (
          <PublicContactCard
            evaluationId={id}
            writerName={writerName}
            hiddenSectionCount={hiddenSectionCount}
            contactEnabled={contactEnabled}
            isLoggedIn={!!user}
          />
        )}

        {/* Fallback if writer has everything private and the page would
            render empty for visitors. */}
        {!isOwnerOrAdmin && !anyPublic && (
          <div
            className="rounded-xl p-6 mt-6"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-[1.6]">
              {writerName} has kept this report private. Request a connection
              below if you&apos;d like to be in touch about this script.
            </p>
          </div>
        )}
      </div>

      {!viewerIsSubscribed && user && (
        <SubscribeGate evaluationId={id} isLoggedIn={true} />
      )}
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────

function CommercialScoreCard({
  score,
  designationLabel,
  tierStyle,
  copyMessage,
}: {
  score: number
  designationLabel: string
  tierStyle: { border: string; bg: string; text: string; dot: string; pillBg: string; pillBorder: string; label: string }
  copyMessage: string
}) {
  const pct = Math.max(0, Math.min(100, score))
  return (
    <section
      className="relative rounded-2xl p-7 sm:p-8 mb-10 overflow-hidden"
      style={{ border: `1px solid ${tierStyle.border}`, background: tierStyle.bg }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <p
          className="text-[12px] uppercase tracking-[0.22em] font-bold m-0"
          style={{ color: tierStyle.text }}
        >
          Commercial Potential Score
        </p>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: tierStyle.pillBg, border: `1px solid ${tierStyle.pillBorder}` }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: tierStyle.dot }}
          />
          <span
            className="text-[12px] uppercase tracking-[0.18em] font-bold"
            style={{ color: tierStyle.text }}
          >
            {designationLabel}
          </span>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="text-[72px] sm:text-[88px] font-bold tabular-nums leading-none"
          style={{ color: tierStyle.text }}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-[20px] text-[var(--gem-gray-400)] font-medium">/ 100</span>
      </div>
      <div className="h-2 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--gem-gray-800)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tierStyle.dot }} />
      </div>
      <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-100)] leading-[1.55] m-0 max-w-[60ch]">
        {copyMessage}
      </p>
    </section>
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
      ? { border: 'rgba(5,150,105,0.35)', bg: 'rgba(5,150,105,0.07)', text: '#059669' }
      : axis.level === 'medium'
        ? { border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.07)', text: '#d97706' }
        : { border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.07)', text: '#dc2626' }
  return (
    <div
      className="rounded-xl p-5"
      style={{ border: `1px solid ${palette.border}`, background: palette.bg }}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
        {label}
      </p>
      <p className="text-[20px] font-bold capitalize m-0 mb-2" style={{ color: palette.text }}>
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
  locked = false,
}: {
  label: string
  score: number
  reasoning: string
  locked?: boolean
}) {
  const palette =
    score >= 8
      ? { text: '#059669', fill: '#059669' }
      : score >= 5
        ? { text: '#d97706', fill: '#d97706' }
        : { text: '#dc2626', fill: '#dc2626' }
  const pct = Math.max(0, Math.min(100, score * 10))
  const blurStyle: React.CSSProperties = { filter: 'blur(10px)', userSelect: 'none' }
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
          {locked ? (
            <span
              className="text-[26px] font-bold tabular-nums text-[var(--gem-gray-500)]"
              style={{ filter: 'blur(3px)', userSelect: 'none' }}
              aria-hidden
            >
              ?
            </span>
          ) : (
            <span className="text-[26px] font-bold tabular-nums" style={{ color: palette.text }}>
              {score}
            </span>
          )}
          <span className="text-[13px] text-[var(--gem-gray-400)]">/ 10</span>
        </div>
      </div>
      <div
        className="h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: 'var(--gem-gray-800)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: locked ? 'var(--gem-gray-500)' : palette.fill,
            filter: locked ? 'blur(4px)' : undefined,
          }}
        />
      </div>
      {reasoning && (
        <p
          className="text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0"
          style={locked ? blurStyle : undefined}
        >
          {reasoning}
        </p>
      )}
    </div>
  )
}
