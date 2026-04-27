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
import { LikeButton } from '@/components/report/like-button'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { InlineSignup } from '@/components/report/inline-signup'
import { InlineUpgradeCTA } from '@/components/report/inline-upgrade-cta'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { PrivateDemoBanner } from '@/components/report/private-demo-banner'
import { ShareSection } from '@/components/report/share-section'
import { PostUpgradeEmail } from '@/components/report/post-upgrade-email'
import { LockedAfterEvalScreen } from '@/components/report/locked-after-eval-screen'
import { PublicContactCard } from '@/components/report/public-contact-card'
import { SectionGate } from '@/components/report/section-gate'
import { ContactWriter } from '@/components/report/contact-writer'
import { Section, EditorialSection, Collapsible, FactList, Fact } from '@/components/report/v5-components'
import { EditableTopCard } from '@/components/report/editable-top-card'
import { OwnerActionsMenu } from '@/components/report/owner-actions-menu'
import { RiskDetailsSection } from '@/components/report/risk-details-card'
import { PackagingSection } from '@/components/report/packaging-block'
import { IssuesSection } from '@/components/report/issues-block'
import { normalizeEvaluation, calculateWeightedScore, DIMENSION_META } from '@/types'
import type { ScriptEvaluation, ScriptSubmission, GEMEvaluation, DimensionId } from '@/types'
import { getDisplayTopCard, hasEdits } from '@/lib/edited-fields'
import { scoreDesignation, DESIGNATION_STYLE, DESIGNATION_COPY } from '@/lib/designation'
import {
  isScoreVisible,
  normalizePrivacy,
  publicSectionCount,
  resolveVisibility,
  SECTION_KEYS,
  type ReportPrivacy,
} from '@/lib/report-privacy'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ for?: string; subscribed?: string; privacy?: string; pending?: string }>
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
  tags?: string[] | null
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
  const { for: forWriter, subscribed: justSubscribed, privacy: openPrivacyParam, pending: pendingParam } = await searchParams
  const autoOpenPrivacy = openPrivacyParam === '1'
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
        privacy_review_needed, tags,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !evaluation) notFound()

  // Pending-eval swap. Two ways to trigger:
  //   - Global env flag (legacy USE_PENDING_EVALS=1) — affects all viewers.
  //   - Admin-only ?pending=1 query param — for previewing rescored output
  //     (e.g. v5.3) inside the real report UI without affecting visitors.
  // The admin path is what /admin/preview-* used to do; doing it inline here
  // means the preview renders identically to the production report.
  const adminPreviewPending =
    pendingParam === '1' && user?.email === 'anuj@gem.studio'
  if (process.env.USE_PENDING_EVALS === '1' || adminPreviewPending) {
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
  const topCard = getDisplayTopCard(report, editedFields, submission.title, submission.tags ?? [])
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
  // v5.4 (Selznick interim) fields — undefined on legacy evals.
  const riskDetails = report.risk_details
  const packaging = report.packaging
  const issues = report.issues

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
          <LockedAfterEvalScreen
            evaluationId={id}
            title={submission.title}
            commercialScore={commercialScore}
          />
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

        {/* Selznick-4 v4 (2026-04-27): the giant publish CTA + qualification
            banner are gone. Every new post is public by default; writers
            adjust visibility per-section via the small pills, hide their
            score with the eye next to it, and remove a post entirely from
            the "···" menu. Status line below tells them where they stand. */}
        {!isAnonymousSubmission && (isOwner || (!isOwner && !isAdmin)) && (
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div className="flex items-center gap-2 min-w-0">
              {isOwner && (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--gem-gray-300)]">
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: '#059669' }}
                  />
                  Visible to industry
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <LikeButton
                evaluationId={id}
                initialLiked={userLiked}
                initialCount={likeCount ?? 0}
                loggedIn={!!user}
              />
              {isOwner && (
                <OwnerActionsMenu
                  submissionId={submission.id}
                  evaluationId={id}
                  title={submission.title}
                  declaredFormat={submission.declared_format ?? null}
                  isSubscribed={ownerIsSubscribed}
                />
              )}
            </div>
          </div>
        )}

        {/* Visitor snapshot banner + owner privacy-review banner removed
            (Selznick-4 v4): they were chrome the writer / visitor didn't
            need every time the page loads. The qualification banner above
            already carries the publish CTA, and the privacy modal opens
            on demand from there. */}

        {/* Privacy is now fully handled by the publish/privacy modal
            triggered from the VisibilityToggle button above. The in-page
            panel was removed on 2026-04-23 — too many conflicting controls
            when the modal already owns preset selection, custom toggles,
            contact settings, publish, and unpublish. */}

        {/* HEADLINE / TOP CARD — always rendered. The top card (title +
            author + format + tags + posted date + headline) is the bare
            minimum context any visitor needs; we no longer let writers
            toggle it off. The privacy modal also no longer offers it as
            an option. */}
        <EditableTopCard
          evaluationId={id}
          submissionId={submission.id}
          initial={topCard}
          isOwner={isOwner}
          hasEdits={topCardHasEdits}
          postedAt={submission.created_at ?? null}
          authorName={
            isAnonymousSubmission ? null : submission.profiles?.full_name ?? null
          }
          commercialScore={
            // Owner / admin always sees their own score. Non-owners only see
            // it if the writer hasn't toggled it off via the score eye.
            isOwnerOrAdmin || isScoreVisible(privacy) ? commercialScore : null
          }
          scoreShownToIndustry={isScoreVisible(privacy)}
        />

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
          {(whatsSpecial.headline || allStrengths.length > 0) && (
            <EditorialSection label="Why this is a hit" accent="gold">
              {/* Lede paragraph — always visible. `whatsSpecial.headline` is
                  GEM's one-line read on what's working. The full numbered
                  list lives behind a "See all N reasons" disclosure so a
                  reader gets the read at a glance and chooses whether to
                  drill in. */}
              {whatsSpecial.headline && (
                <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-100)] leading-[1.55] m-0 mb-5 sm:mb-6 max-w-[62ch] font-medium">
                  {whatsSpecial.headline}
                </p>
              )}
              {allStrengths.length > 0 && (
                <details className="group [&_summary::-webkit-details-marker]:hidden">
                  <summary
                    className="cursor-pointer list-none inline-flex items-center gap-1 text-[13px] sm:text-[14px] font-semibold text-[var(--gem-gray-300)] hover:text-[var(--gem-gold)] transition-colors mb-2"
                  >
                    <span>
                      See all {allStrengths.length}{' '}
                      {allStrengths.length === 1 ? 'reason' : 'reasons'}
                    </span>
                    <span
                      aria-hidden
                      className="transition-transform duration-150 group-open:rotate-180"
                    >
                      ▾
                    </span>
                  </summary>
                  <ol className="list-none m-0 p-0 mt-5 sm:mt-6 space-y-5 sm:space-y-7">
                    {allStrengths.map((s, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-[28px_1fr] sm:grid-cols-[36px_1fr] gap-x-3 sm:gap-x-4"
                      >
                        <span
                          className="text-[18px] sm:text-[22px] font-bold tabular-nums leading-tight"
                          style={{ color: 'var(--gem-gold)' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="text-[16px] sm:text-[18px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1.5 leading-tight"
                            style={
                              applyPaywallBlur && i > 0
                                ? { filter: 'blur(8px)', userSelect: 'none' }
                                : undefined
                            }
                          >
                            {s.dimension_or_area}
                          </p>
                          <p
                            className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0"
                            style={applyPaywallBlur && i > 0 ? bodyBlur : undefined}
                          >
                            {s.what_it_means}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </EditorialSection>
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
              summary={`${leadCharacters.length} ${leadCharacters.length === 1 ? 'character' : 'characters'}`}
            >
              <div className="space-y-3">
                {leadCharacters.map((c, i) => (
                  <Collapsible
                    key={i}
                    title={c.name}
                    meta={`${c.role_type} · ${c.demographics}`}
                    titleBlurred={applyPaywallBlur}
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
            <Section
              label="Package angles"
              subtitle="Who would direct it, and who would buy it."
              summary={`Director appeal · ${packageAngles.buyer_appeal?.tier ?? 'buyer appeal'}`}
            >
              <div className="space-y-3">
                <Collapsible
                  title="Why a director wants this"
                  accent="#059669"
                  titleBlurred={applyPaywallBlur}
                >
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
                  titleBlurred={applyPaywallBlur}
                >
                  <p
                    className="text-[13px] uppercase tracking-[0.15em] text-[var(--gem-gray-400)] mb-3 m-0"
                    style={bodyBlur}
                  >
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

        {/* PACKAGING (v5.4) — comps, audience, budget tier, lane fit, IP.
            Sits right after Package Angles so the two pitch-side blocks are
            adjacent. Both render when the data is present; older evals
            without v5.4 fields just see Package Angles. */}
        {packaging && (
          <div
            style={applyPaywallBlur ? { ...bodyBlur, pointerEvents: 'none' } : undefined}
            aria-hidden={applyPaywallBlur ? true : undefined}
          >
            <PackagingSection data={packaging} />
          </div>
        )}

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
            const moreCount =
              secondary.length + (craftNote ? 1 : 0)
            return (
              <EditorialSection label="Issues" accent="violet">
                {/* Sharpest lever as the always-visible lede — primary lever
                    becomes a pull-quote with red rule + "Sharpest lever"
                    eyebrow. Stays crisp for free owners (paired with bullet 01
                    of "Why this is a hit" as the two pieces a free writer
                    walks away with).
                    If there's no primary, fall back to the first secondary
                    consideration so the section is never empty when expanded. */}
                {primary ? (
                  <div className="relative pl-5 sm:pl-6 mb-5 sm:mb-6">
                    <div
                      aria-hidden
                      className="absolute left-0 top-1 bottom-1 rounded-sm"
                      style={{ width: 3, background: '#dc2626' }}
                    />
                    <p
                      className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-1.5"
                      style={{ color: '#dc2626' }}
                    >
                      Sharpest lever
                    </p>
                    <p className="text-[18px] sm:text-[22px] font-semibold text-[var(--gem-gray-50)] leading-[1.35] m-0 mb-2.5">
                      {primary.area}
                    </p>
                    <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0">
                      {primary.detail}
                    </p>
                  </div>
                ) : secondary[0] ? (
                  <div className="mb-5 sm:mb-6">
                    <p className="text-[16px] sm:text-[18px] font-semibold text-[var(--gem-gray-50)] m-0 mb-2 leading-tight">
                      {secondary[0].area}
                    </p>
                    <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0 max-w-[62ch]">
                      {secondary[0].detail}
                    </p>
                  </div>
                ) : null}

                {/* See-more disclosure: collapses craft note + the rest of
                    the secondary considerations behind a single tap. The
                    page stays calm by default; readers who want to drill in
                    expand to read the full development write-up. */}
                {moreCount > 0 && (
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary
                      className="cursor-pointer list-none inline-flex items-center gap-1 text-[13px] sm:text-[14px] font-semibold text-[var(--gem-gray-300)] hover:text-[var(--gem-accent)] transition-colors"
                    >
                      <span>
                        See {moreCount} more{' '}
                        {moreCount === 1 ? 'note' : 'notes'}
                      </span>
                      <span
                        aria-hidden
                        className="transition-transform duration-150 group-open:rotate-180"
                      >
                        ▾
                      </span>
                    </summary>
                    <div className="mt-5 sm:mt-6 space-y-5 sm:space-y-6">
                      {craftNote && (
                        <div className="relative pl-5 sm:pl-6">
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
                          <p
                            className="text-[15px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                            style={bodyBlur}
                          >
                            {craftNote}
                          </p>
                        </div>
                      )}
                      {/* If we used secondary[0] as the lede above, skip it
                          here so it's not duplicated. Otherwise render every
                          secondary note. */}
                      {secondary
                        .slice(primary ? 0 : 1)
                        .map((c, i) => (
                          <div key={i}>
                            <p
                              className="text-[15.5px] sm:text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1 leading-tight"
                              style={
                                applyPaywallBlur
                                  ? { filter: 'blur(8px)', userSelect: 'none' }
                                  : undefined
                              }
                            >
                              {c.area}
                            </p>
                            <p
                              className="text-[14.5px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.6] m-0"
                              style={bodyBlur}
                            >
                              {c.detail}
                            </p>
                          </div>
                        ))}
                    </div>
                  </details>
                )}
              </EditorialSection>
            )
          })()}
        </SectionGate>

        {/* PROJECT RISKS — moved here (after Issues, before Narrative
            breakdown) per Anuj's 2026-04-27 reorder. Prefer the v5.4
            `risk_details` payload when present; fall back to the legacy
            `production.risk_rubric` (production_signal section) when only
            the older eval shape is available, so we never double-render
            the same axes. */}
        {riskDetails ? (
          <div
            style={applyPaywallBlur ? { ...bodyBlur, pointerEvents: 'none' } : undefined}
            aria-hidden={applyPaywallBlur ? true : undefined}
          >
            <RiskDetailsSection data={riskDetails} />
          </div>
        ) : (
          <SectionGate
            section="production_signal"
            privacy={privacy}
            isOwnerOrAdmin={isOwnerOrAdmin}
            submissionId={privacyControlId}
            isPublic={submission.is_public ?? false}
          >
            {production?.risk_rubric && (
              <Section
                label="Project risks"
                subtitle="Cost, cast, and content complexity at a glance."
                summary={[
                  production.risk_rubric.cost ? `Cost ${production.risk_rubric.cost.level}` : null,
                  production.risk_rubric.cast ? `Cast ${production.risk_rubric.cast.level}` : null,
                  production.risk_rubric.content ? `Content ${production.risk_rubric.content.level}` : null,
                ].filter(Boolean).join(' · ')}
              >
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
        )}

        {/* v5.4 IssuesSection rendering removed (2026-04-27): redundant with
            the Development Priorities EditorialSection above, which now
            carries the writer-facing "Issues" label and a lede + see-more
            disclosure. The `issues` data on the eval is still emitted by
            the prompt; we can re-mount this surface later if we want a
            producer-direct framing somewhere. */}

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
              summary="10 craft dimensions"
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
              label="Production planning details"
              subtitle="Everything the script tells us about how it would actually get made."
              summary="Cast · Locations · Technical · Platform · Rights"
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
