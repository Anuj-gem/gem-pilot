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
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { InlineSignup } from '@/components/report/inline-signup'
import { UpgradeTopBanner } from '@/components/report/upgrade-top-banner'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { PrivateDemoBanner } from '@/components/report/private-demo-banner'
import { PostUpgradeEmail } from '@/components/report/post-upgrade-email'
// CommunityReviewCta retired (2026-04-30 v0.10.14). PeerReviews owns
// the empty-state write-a-review CTA now.
import { SectionGate } from '@/components/report/section-gate'
import { PeerReviews } from '@/components/report/peer-reviews'
import { InviteReviewerButton } from '@/components/report/invite-reviewer-button'
import { WriterCard } from '@/components/writer-card'
import { Section, EditorialSection, Collapsible, FactList, Fact } from '@/components/report/v5-components'
import { SupportingCharactersCarousel } from '@/components/report/supporting-characters-carousel'
import { DownloadPdfModalHost } from '@/components/report/download-pdf-modal'
import { EditableTopCard } from '@/components/report/editable-top-card'
import { OwnerActionsMenu } from '@/components/report/owner-actions-menu'
// DashboardPrivacyButton retired from the report status line on
// 2026-04-30 (v0.10) — privacy now lives in the triple-dot menu via
// ScriptPrivacySheet. The dashboard surface still uses it.
// IndustryActivityButton retired from the report page on 2026-04-30
// v0.10.19 (still used on the dashboard via OwnerActionsMenu).
import { RiskDetailsSection } from '@/components/report/risk-details-card'
import { PackagingSection } from '@/components/report/packaging-block'
import { IssuesSection } from '@/components/report/issues-block'
// Producer-mode UI (Anuj 2026-04-29) — rendered inline when a matched
// industry partner views this report. The surface is the same as the
// retired /partner/script/[matchId] page; that route now redirects here.
import { MatchActions } from '@/components/partner/match-actions'
import { StickyMatchActions } from '@/components/partner/sticky-actions'
import { ScriptDownloadButton } from '@/components/partner/script-download-button'
import { ProducerIntroButton } from '@/components/partner/producer-intro-button'
import { Mail } from 'lucide-react'
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
  searchParams: Promise<{ for?: string; subscribed?: string; privacy?: string; pending?: string; download?: string; embedded?: string }>
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
  craft_note?: string
}

type SubmissionWithPrivacy = ScriptSubmission & {
  profiles: { full_name: string; avatar_url: string | null; handle: string | null; headline: string | null } | null
  report_privacy?: ReportPrivacy | null
  contact_enabled?: boolean | null
  allow_reviews?: boolean | null
  allow_industry?: boolean | null
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
  const { for: forWriter, subscribed: justSubscribed, pending: pendingParam, download: downloadParam, embedded: embeddedParam } = await searchParams
  // Embedded mode: the report is loaded inside the dashboard's modal
  // iframe. Skip the global Nav and footer so the modal chrome doesn't
  // double up. Anuj 2026-04-30.
  const embedded = embeddedParam === '1'
  const autoOpenDownload = downloadParam === '1'
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
        allow_reviews, allow_industry,
        privacy_review_needed, tags,
        profiles ( full_name, avatar_url, handle, headline )
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

  // Producer-mode detection (Anuj 2026-04-29). If a logged-in non-owner
  // has a script_match for this submission AND it isn't unmatched, render
  // producer affordances inline (Interested/Pass, Reach-out, sticky bar)
  // and treat them as a non-owner viewer for privacy purposes. This is
  // what consolidates the old /partner/script/[matchId] view onto the
  // single /report/[id] URL — same surface for everyone, role-aware
  // affordances injected.
  type ViewerMatch = {
    id: string
    status: 'pending' | 'opened' | 'interested' | 'passed' | 'commented'
    producer_emailed_at: string | null
    unmatched_at: string | null
  }
  let viewerMatch: ViewerMatch | null = null
  if (user && !isOwner && !isAdmin) {
    const { data: matchRow } = await serviceClient
      .from('script_matches')
      .select('id, status, producer_emailed_at, unmatched_at')
      .eq('producer_id', user.id)
      .eq('submission_id', submission.id)
      .maybeSingle()
    const m = matchRow as ViewerMatch | null
    if (m && !m.unmatched_at) {
      // Side effect: flip pending → opened on first view so the producer
      // dashboard's "new since visit" math stays accurate. Mirrors the
      // behavior the old /partner/script/[matchId] page had.
      if (m.status === 'pending') {
        await serviceClient
          .from('script_matches')
          .update({ status: 'opened', opened_at: new Date().toISOString() })
          .eq('id', m.id)
          .eq('status', 'pending')
        m.status = 'opened'
      }
      viewerMatch = m
    }
  }
  const isViewerProducer = viewerMatch !== null
  // Match status considered "unlocked" → script PDF + writer email panel.
  const isViewerProducerUnlocked =
    viewerMatch !== null &&
    (viewerMatch.status === 'interested' ||
      viewerMatch.status === 'commented')
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
  let ownerIsProducer = false
  if (submission.user_id) {
    const { data: ownerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status, account_type')
      .eq('id', submission.user_id)
      .single()
    ownerIsSubscribed = ownerProfile?.subscription_status === 'active'
    ownerIsProducer = ownerProfile?.account_type === 'producer'
  }

  let viewerIsSubscribed = false
  let viewerIsReviewer = false
  if (user) {
    const { data: viewerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status, is_reviewer')
      .eq('id', user.id)
      .single()
    viewerIsSubscribed = viewerProfile?.subscription_status === 'active'
    viewerIsReviewer = viewerProfile?.is_reviewer === true
  }

  // Peer reviews — fetched for any viewer. Owner-hidden reviews are
  // filtered out for non-owners (and don't count toward review totals).
  // The owner sees them dimmed with an "Unhide" affordance so they can
  // reverse the choice. Anuj 2026-04-30 v0.7.
  const { data: peerReviewsRaw } = await serviceClient
    .from('peer_reviews')
    .select('id, score, body, suggestion, created_at, updated_at, reviewer_id, owner_hidden_at, profiles!peer_reviews_reviewer_id_fkey ( full_name, handle, headline, avatar_url )')
    .eq('submission_id', submission.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  const isOwnerForReviews = !!user && user.id === submission.user_id
  const peerReviews = (peerReviewsRaw || [])
    .filter((r: any) => isOwnerForReviews || !r.owner_hidden_at)
    .map((r: any) => ({
      id: r.id, score: r.score, body: r.body, suggestion: r.suggestion,
      created_at: r.created_at, updated_at: r.updated_at,
      reviewer_id: r.reviewer_id,
      owner_hidden_at: r.owner_hidden_at,
      reviewer_name: r.profiles?.full_name ?? null,
      reviewer_handle: r.profiles?.handle ?? null,
      reviewer_headline: r.profiles?.headline ?? null,
      reviewer_avatar_url: r.profiles?.avatar_url ?? null,
    }))

  // Pending invites count (visible to owner only). Anuj 2026-04-29 v0.2.
  // Open reviews (Anuj 2026-04-30 v0.7): any signed-in non-owner can
  // review a public completed script. The legacy invite/reviewer gate
  // still allows reviews on private scripts via explicit invite.
  let pendingInviteCount = 0
  let viewerHasInvite = false
  if (user) {
    if (isOwner) {
      const { count } = await serviceClient
        .from('review_invites')
        .select('id', { count: 'exact', head: true })
        .eq('submission_id', submission.id)
        .in('status', ['pending', 'accepted'])
      pendingInviteCount = count ?? 0
    }
    // Has the viewer been invited to this specific script?
    const { data: viewerInvite } = await serviceClient
      .from('review_invites')
      .select('id')
      .eq('submission_id', submission.id)
      .eq('invited_user_id', user.id)
      .in('status', ['accepted', 'completed'])
      .maybeSingle<{ id: string }>()
    viewerHasInvite = !!viewerInvite
  }
  const isPublicCompleted = !!submission.is_public && submission.status === 'completed'
  const viewerCanReview =
    !!user &&
    !isOwner &&
    (viewerIsReviewer || viewerHasInvite || isPublicCompleted)

  const showUpgradeCTA = !viewerIsSubscribed && !!user
  const locked = !ownerIsSubscribed
  // Paywall blur retired 2026-04-28 (Anuj). The writer's first free eval
  // now renders fully unblurred — the conversion driver is the SECOND
  // eval (locked behind Pro via `lockedAfterFreeEval` → LockedAfterEval-
  // Screen). Side benefit: producers see exactly the same surface free
  // writers see, so industry-side experience is uniform regardless of
  // whether the writer is paid. Variable kept (always false) so the
  // existing `bodyBlur` plumbing across the file is a no-op without a
  // big refactor; safe to clean up later.
  // Original: const applyPaywallBlur = locked && isOwner && !isAdmin
  void locked
  const applyPaywallBlur = false
  // Inline per-section privacy pills — shown for ANY owner (free or Pro).
  // Anuj's 2026-04-23 call: writers want to see "this is private" labels as
  // they scroll so they understand exactly what's exposed. Toggles save
  // directly; the Pro paywall only gates the actual Publish action (enforced
  // by the qualification banner's CTA). Free owners can plan their sharing
  // posture before they upgrade — feature-discovery, not a paywall wall.
  const privacyControlId: string | undefined = isOwner ? submission.id : undefined

  // The free-eval paywall lock is a writer-only mechanic. Producer
  // accounts submit unlimited private scripts via /partner/submit and
  // must always see the full report on their own work — they're not
  // running through the writer trial → Pro conversion funnel. Anuj
  // 2026-04-30: bypass the lock entirely for producer-owned scripts.
  let lockedAfterFreeEval = false
  if (
    isOwner &&
    !ownerIsSubscribed &&
    !ownerIsProducer &&
    submission.user_id &&
    !isAdmin
  ) {
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

  // Industry activity for this submission — drives the "Industry activity"
  // item in the owner "···" menu. Owner-only fetch (skip for non-owners).
  let ownerActivity: import('@/components/dashboard/industry-activity-button').IndustryActivityRow[] = []
  if ((isOwner || isAdmin) && !isAnonymousSubmission) {
    type RawMatchRow = {
      id: string
      producer_id: string
      status: 'pending' | 'opened' | 'interested' | 'commented' | 'passed'
      comment: string | null
      created_at: string
      opened_at: string | null
      reacted_at: string | null
      producer_emailed_at: string | null
      unmatched_at: string | null
    }
    const { data: rawMatchRows } = await serviceClient
      .from('script_matches')
      .select(
        'id, producer_id, status, comment, created_at, opened_at, reacted_at, producer_emailed_at, unmatched_at'
      )
      .eq('submission_id', submission.id)
      .in('status', ['opened', 'interested', 'commented', 'passed'])
    const rawRows: RawMatchRow[] = (rawMatchRows ?? []) as RawMatchRow[]
    const producerIds = Array.from(new Set(rawRows.map((r) => r.producer_id)))
    const producerInfo = new Map<
      string,
      {
        full_name: string | null
        email: string | null
        company_name: string | null
        industry_role: 'producer' | 'representative' | null
      }
    >()
    if (producerIds.length > 0) {
      const { data: producers } = await serviceClient
        .from('profiles')
        .select('id, full_name, email, company_name, industry_role')
        .in('id', producerIds)
      for (const p of (producers ?? []) as any[]) {
        producerInfo.set(p.id, {
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          company_name: p.company_name ?? null,
          industry_role:
            p.industry_role === 'producer' || p.industry_role === 'representative'
              ? p.industry_role
              : null,
        })
      }
    }
    ownerActivity = rawRows
      .map((row) => {
        const info = producerInfo.get(row.producer_id) ?? null
        const computedName = (() => {
          const fn = info?.full_name?.trim()
          if (fn) return fn
          if (info?.email) return info.email.split('@')[0]
          return null
        })()
        return {
          matchId: row.id,
          status: row.status,
          producerName: computedName,
          producerCompany: info?.company_name ?? null,
          producerRole: info?.industry_role ?? null,
          happenedAt: row.reacted_at ?? row.opened_at ?? row.created_at ?? null,
          comment: row.comment,
          producerEmailedAt: row.producer_emailed_at,
          unmatchedAt: row.unmatched_at,
        }
      })
      .sort((a, b) => {
        const av = a.happenedAt ? new Date(a.happenedAt).getTime() : 0
        const bv = b.happenedAt ? new Date(b.happenedAt).getTime() : 0
        return bv - av
      })
  }

  const allStrengths = whatsSpecial.strengths ?? []
  const leadCharacters = report.lead_characters ?? []
  const production = report.production_reality
  const scores = report.scores ?? {}
  const craftNote = report.craft_note ?? null
  // Selznick 3.8 fields — every eval has these directly. The legacy
  // bridge (and the legacy `considerations` / `package_angles` /
  // `risk_rubric` reads) was retired 2026-04-29 after the rescore moved
  // every row onto the modern shape.
  const riskDetails = report.risk_details ?? null
  const packaging = report.packaging ?? null
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

  // Anuj 2026-04-28: free-tier 2nd+ eval used to land on
  // <LockedAfterEvalScreen> as a dedicated upgrade bridge. Dropped — the
  // dashboard now handles this surface (locked card + value-prop upsell
  // + the writer's industry stats so they see the carrot inline). Bounce
  // them back to the dashboard so they pick up that context instead of
  // the bridge screen.
  if (lockedAfterFreeEval) {
    redirect('/dashboard')
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
      {/* Nav is rendered by the (app) layout. Report sits in the
          full-width canvas (rail is hidden on /report by AppRail) so
          the deep-read column gets the page to itself. */}
      {justSubscribed === 'true' && <PostUpgradeEmail />}
      {hasExpiry && !isExpired && (
        <ExpiryCountdown expiresAt={submission.expires_at!} evaluationId={id} />
      )}
      <ReportAnalytics evaluationId={id} isBlurred={applyPaywallBlur} />
      {isOwner && <DownloadPdfModalHost autoOpen={autoOpenDownload} />}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Back-to-Community affordance for logged-in viewers — gives
            users a way out of a report that isn't the browser back button.
            Anuj 2026-04-30 cleanup. */}
        {user && (
          <div className="gem-no-print mb-4">
            <Link
              href="/community"
              prefetch={false}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] transition-colors"
            >
              ← Community
            </Link>
          </div>
        )}
        {/* Free-tier owner upgrade banner — slim, top-mounted, single
            message ("Upgrade to GEM Pro to submit new drafts"). Replaces
            the heavier mid-page InlineUpgradeCTA. Anuj 2026-04-30 v0.10.12. */}
        {showUpgradeCTA && isOwner && <UpgradeTopBanner evaluationId={id} />}
        {forWriter && <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />}

        {/* Anonymous submission = script_submissions.user_id IS NULL.
            Show the "Claim your report" card to anyone EXCEPT admin —
            admin gets the owner action chrome below so they can remove
            problematic anonymous posts. Anuj 2026-05-01 v0.12.2. */}
        {isAnonymousSubmission && !isAdmin && (
          <div id="inline-signup" className="rounded-xl transition-shadow duration-500 mb-8">
            <InlineSignup submissionId={submission.id} evaluationId={id} />
          </div>
        )}

        {/* Owner status line. Privacy moved into the triple-dot menu on
            the right (Anuj 2026-04-30 v0.10) — the inline "Privacy
            settings" link + dashboard privacy panel were too heavy for
            something the writer rarely changes. The two account-level
            toggles (Allow reviews / Allow industry access) now live in
            ScriptPrivacySheet, mounted off the menu.
            Anuj 2026-05-01 v0.12.2: also show this for admin on
            anonymous submissions so admin can remove unowned posts. */}
        {(!isAnonymousSubmission || isAdmin) && (
          <div className="gem-no-print flex items-center justify-between gap-3 flex-wrap mb-6">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {(isOwner || isAdmin) && (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--gem-gray-300)]">
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{
                      background: submission.is_public
                        ? '#059669'
                        : 'var(--gem-gray-500)',
                    }}
                  />
                  {submission.is_public
                    ? 'Public to GEM members'
                    : 'Unpublished'}
                  {isAdmin && !isOwner && (
                    <span
                      className="ml-1 text-[9.5px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: '#dc2626',
                        background: 'rgba(220,38,38,0.07)',
                        border: '1px solid rgba(220,38,38,0.25)',
                      }}
                    >
                      Admin
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(isOwner || isAdmin) && (
                <OwnerActionsMenu
                  submissionId={submission.id}
                  evaluationId={id}
                  title={submission.title}
                  declaredFormat={submission.declared_format ?? null}
                  isSubscribed={ownerIsSubscribed || isAdmin}
                  activity={ownerActivity}
                  isPublic={submission.is_public ?? false}
                  allowReviews={submission.allow_reviews ?? true}
                  allowIndustry={submission.allow_industry ?? true}
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

        {/* Anuj 2026-04-30 v0.10.13 — wrap the body of the report in a
            single white card so it sits cleanly on the gray (app)
            background instead of having text float against #F7F8FA.
            Chrome (back link + upgrade banner + status line + privacy
            modal triggers) stays outside the card. */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 sm:px-8 py-7 sm:py-9 shadow-sm">

        {/* Writer card — clickable link to /w/{handle}. Same component used
            on review bylines so the visual language is consistent across the
            social surface. (Anuj 2026-04-29 v0.3.) */}
        {!isAnonymousSubmission && submission.profiles && (
          <div className="mb-4">
            <WriterCard
              writer={{
                id: submission.user_id ?? '',
                full_name: submission.profiles.full_name,
                handle: submission.profiles.handle,
                headline: submission.profiles.headline,
                avatar_url: submission.profiles.avatar_url,
              }}
              size="lg"
            />
          </div>
        )}

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
          authorHandle={
            isAnonymousSubmission ? null : submission.profiles?.handle ?? null
          }
          commercialScore={
            // Anuj 2026-04-29: top-of-page score badge retired. The GEM
            // Score now lives in its own dedicated section near the
            // bottom of the report — readers have to actually scroll to
            // it, which means the producer's first impression is the
            // headline + Why this is a hit, not a number.
            null
          }
          scoreShownToIndustry={isScoreVisible(privacy)}
          isProSubscriber={ownerIsSubscribed || isAdmin}
        />

        {/* Producer-mode action row (Interested / Pass). Sits right under
            the top card so the primary decision is unmissable. Mirrors the
            retired /partner/script/[matchId] surface. Anuj 2026-04-29. */}
        {isViewerProducer && viewerMatch && (
          <div className="gem-no-print mb-8">
            <MatchActions
              matchId={viewerMatch.id}
              status={viewerMatch.status}
              variant="detail"
              hideComment
            />
          </div>
        )}

        {/* Producer-mode script download. Gated on Interested. */}
        {isViewerProducer && isViewerProducerUnlocked && viewerMatch && (
          <div
            className="gem-no-print rounded-xl px-5 py-5 mb-8 flex items-start gap-4 flex-wrap"
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
            <ScriptDownloadButton matchId={viewerMatch.id} />
          </div>
        )}

        {/* Inline industry stats — owner/admin, always visible while
            published. Doubles as the always-on conversion carrot for
            free writers and as live engagement signal for Pro. Admin
            sees the same stats so they can review activity on any post.
            Anuj 2026-04-28. */}
        {/* Industry activity panel retired from the report page on
            2026-04-30 v0.10.19 — the dashboard cards already surface
            this same widget in the owner triple-dot menu, and the
            report page has the same triple-dot menu at the top, so
            mounting it twice on the same page is just noise. */}

        {/* Mini score card removed 2026-04-23 — qualification banner above
            now handles the owner's primary signal. Free-tier owners still
            hit the upgrade modal through the banner's Publish CTA. */}

        {/* Share section removed 2026-04-28 — clogged the UI for what
            was effectively a copy-link helper. Anyone who wants to share
            can grab the URL from their browser. */}

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
          isProSubscriber={ownerIsSubscribed || isAdmin}
        >
          {(whatsSpecial.headline || allStrengths.length > 0) && (
            <div data-pdf-section="whats_working">
            <EditorialSection label="Why this can be a hit" accent="gold">
              {/* Lede paragraph — always visible. */}
              {whatsSpecial.headline && (
                <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-100)] leading-[1.55] m-0 mb-5 sm:mb-7 max-w-[62ch] font-medium">
                  {whatsSpecial.headline}
                </p>
              )}
              {/* Each reason is its own small drop-down — title + tap to
                  expand the body. Section is always open at the parent
                  level; the per-row toggles keep the page calm without
                  hiding the structure. */}
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
                          <p
                            className="text-[15.5px] sm:text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 leading-snug min-w-0"
                            style={
                              applyPaywallBlur && i > 0
                                ? { filter: 'blur(8px)', userSelect: 'none' }
                                : undefined
                            }
                          >
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
                          <p
                            className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0 max-w-[62ch]"
                            style={applyPaywallBlur && i > 0 ? bodyBlur : undefined}
                          >
                            {s.what_it_means}
                          </p>
                        </div>
                      </details>
                    </li>
                  ))}
                </ol>
              )}
            </EditorialSection>
            </div>
          )}
        </SectionGate>

        {/* LEAD CHARACTERS */}
        <SectionGate
          section="deep_dive_characters"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
          isProSubscriber={ownerIsSubscribed || isAdmin}
        >
          {leadCharacters.length > 0 && (
            <div data-pdf-section="cast">
            {(() => {
            // Split Lead vs Supporting (2026-04-28). Leads keep the full
            // <Collapsible> card treatment. Supporting drops into a
            // horizontal carousel underneath so a 12-character ensemble
            // doesn't read as a 12-row brick.
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
                      titleBlurred={applyPaywallBlur}
                      defaultOpen
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
                {supporting.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3">
                      Supporting cast · {supporting.length}
                    </p>
                    <SupportingCharactersCarousel
                      characters={supporting}
                      blurred={applyPaywallBlur}
                    />
                  </div>
                )}
              </Section>
            )
          })()}
            </div>
          )}
        </SectionGate>

        {/* PACKAGE ANGLES + PACKAGING — both fall under the
            "packaging" PDF section toggle. */}
        <SectionGate
          section="deep_dive_package"
          privacy={privacy}
          isOwnerOrAdmin={isOwnerOrAdmin}
          submissionId={privacyControlId}
          isPublic={submission.is_public ?? false}
          isProSubscriber={ownerIsSubscribed || isAdmin}
        >
          <div data-pdf-section="packaging">
            {/* PACKAGING — modern card UI. Renders for every eval; the
                bridge derives this shape from legacy `package_angles` +
                `platform_fit` when the eval is from the older prompt. */}
            {packaging && (
              <div
                style={applyPaywallBlur ? { ...bodyBlur, pointerEvents: 'none' } : undefined}
                aria-hidden={applyPaywallBlur ? true : undefined}
              >
                <PackagingSection data={packaging} />
              </div>
            )}
          </div>
        </SectionGate>

        {/* DEVELOPMENT PRIORITIES — primary lever first (red-accent treatment),
            craft note as an inline callout, then all other considerations.
            Merges what was previously two sections ("Sharpest lever" + secondary
            Development Priorities) into a single coherent section that mirrors
            the structure of the actual report. */}
        {/* Development considerations — Anuj 2026-04-29: now has its
            own per-section privacy toggle (`development_considerations`).
            Owner/admin always see it. Non-owners only see it on a
            published post when the writer hasn't marked the section
            private. */}
        {(isOwnerOrAdmin || (submission.is_public ?? false)) && (
          <SectionGate
            section="development_considerations"
            privacy={privacy}
            isOwnerOrAdmin={isOwnerOrAdmin}
            submissionId={privacyControlId}
            isPublic={submission.is_public ?? false}
            isProSubscriber={ownerIsSubscribed || isAdmin}
          >
          {(() => {
            // Selznick 3.8: every eval emits `issues.items` directly.
            // Legacy `considerations` reads removed 2026-04-29.
            type IssueRow = {
              area: string
              detail: string
              is_primary_lever?: boolean
            }
            const merged: IssueRow[] = (issues?.items ?? []).map((i) => ({
              area: i.area,
              detail: i.detail,
              is_primary_lever: i.is_primary_lever,
            }))
            const issuesHeadline =
              typeof issues?.headline === 'string' &&
              issues.headline.trim().length > 0
                ? issues.headline.trim()
                : null
            const empty = merged.length === 0 && !craftNote && !issuesHeadline
            if (empty) return null
            const primary = merged.find((c) => c.is_primary_lever === true)
            const secondary = merged.filter((c) => c.is_primary_lever !== true)
            return (
              <EditorialSection label="Development considerations" accent="violet">
                {issuesHeadline && (
                  <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-100)] leading-[1.55] m-0 mb-5 sm:mb-7 max-w-[62ch] font-medium">
                    {issuesHeadline}
                  </p>
                )}
                {/* Numbered list — IDENTICAL shape to "Why this can be a
                    hit". Sharpest lever is just #1; no special tag, no
                    differentiated number color, no auto-open. Sort just
                    puts the primary lever first so it's positionally
                    weighted. Anuj 2026-04-28. */}
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
                              <p
                                className="text-[15.5px] sm:text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 leading-snug min-w-0"
                                style={
                                  applyPaywallBlur
                                    ? { filter: 'blur(8px)', userSelect: 'none' }
                                    : undefined
                                }
                              >
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
                              <p
                                className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0 max-w-[62ch]"
                                style={bodyBlur}
                              >
                                {c.detail}
                              </p>
                            </div>
                          </details>
                        </li>
                      ))}
                    </ol>
                  )
                })()}

                {/* Craft note (always visible, emerald aside). */}
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
                    <p
                      className="text-[15px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0 max-w-[62ch]"
                      style={bodyBlur}
                    >
                      {craftNote}
                    </p>
                  </div>
                )}
              </EditorialSection>
            )
          })()}
          </SectionGate>
        )}

        {/* PROJECT COMPLEXITY — modern card UI. Renders for every eval;
            the bridge derives this shape from legacy
            `production.risk_rubric` when the eval is from the older
            prompt. */}
        {riskDetails && (
          <SectionGate
            section="project_complexity"
            privacy={privacy}
            isOwnerOrAdmin={isOwnerOrAdmin}
            submissionId={privacyControlId}
            isPublic={submission.is_public ?? false}
            isProSubscriber={ownerIsSubscribed || isAdmin}
          >
            <div
              data-pdf-section="project_complexity"
              style={applyPaywallBlur ? { ...bodyBlur, pointerEvents: 'none' } : undefined}
              aria-hidden={applyPaywallBlur ? true : undefined}
            >
              <RiskDetailsSection data={riskDetails} production={production} />
            </div>
          </SectionGate>
        )}

        {/* OVERALL GEM SCORE — moved here from the top-of-page badge
            (Anuj 2026-04-29). The score now lives at the bottom of the
            editorial flow, after Why this is a hit / Cast / Packaging /
            Project Complexity. Reader has to actually scroll to it,
            which means the first impression is the WORK, not a number.
            Owner / admin always see it. Non-owners see it only when the
            writer hasn't toggled the score-eye off. */}
        {typeof commercialScore === 'number' &&
          (isOwnerOrAdmin || isScoreVisible(privacy)) && (
            <section
              data-pdf-section="gem_score"
              className="mt-12 sm:mt-14 mb-2"
            >
              <p
                className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
                style={{ color: 'var(--gem-accent)' }}
              >
                Overall GEM Score
              </p>
              <div
                className="rounded-2xl p-6 sm:p-7 flex items-center gap-5 sm:gap-7 flex-wrap"
                style={{
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.25)',
                }}
              >
                <div
                  className="flex flex-col items-center justify-center rounded-xl tabular-nums shrink-0"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(124,58,237,0.30)',
                    minWidth: 96,
                    padding: '12px 18px',
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-[0.18em] font-bold leading-none mb-1.5"
                    style={{ color: 'var(--gem-gray-500)' }}
                  >
                    Score
                  </span>
                  <span
                    className="font-bold leading-none text-[var(--gem-gray-50)]"
                    style={{ fontSize: 44 }}
                  >
                    {Math.round(commercialScore)}
                  </span>
                  <span
                    className="text-[11px] font-medium leading-none mt-2"
                    style={{ color: 'var(--gem-gray-500)' }}
                  >
                    /100
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                    Your GEM Score is calculated from every factor in the
                    narrative analysis above — story, character, audience,
                    packaging, production reality. Industry partners use it as
                    one input alongside genre fit, lane, and what they&apos;re
                    actively scouting. Not a gate, not a verdict — a quick
                    read.
                  </p>
                  {isOwner && !isScoreVisible(privacy) && (
                    <p className="text-[12.5px] text-[var(--gem-gray-500)] m-0 mt-3 italic">
                      You&apos;ve hidden this score from other GEM members. Only
                      you (and admins) see it here.
                    </p>
                  )}
                </div>
              </div>

              {/* Additional scoring dimensions — folded under the score so
                  the read defaults to the headline number, with the math
                  one click away. Anuj 2026-04-30 v0.10.19: renamed from
                  "per-dimension breakdown" to plain language a normal
                  reader can parse. */}
              {scores && Object.values(scores).some((s) => typeof s?.score === 'number') && (
                <details className="group mt-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer list-none">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--gem-accent)] hover:text-[var(--gem-accent-hover)] transition-colors">
                      See additional scoring dimensions
                      <span
                        aria-hidden
                        className="transition-transform duration-150 group-open:rotate-180 text-[12px]"
                      >
                        ▾
                      </span>
                    </span>
                    <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1 leading-snug max-w-[56ch]">
                      In addition to everything above, these are other factors we score your script on that contribute to your overall score.
                    </p>
                  </summary>
                  <div className="mt-4 space-y-3">
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
                </details>
              )}
            </section>
          )}

        {/* v5.4 IssuesSection rendering removed (2026-04-27): redundant with
            the Development Priorities EditorialSection above, which now
            carries the writer-facing "Issues" label and a lede + see-more
            disclosure. The `issues` data on the eval is still emitted by
            the prompt; we can re-mount this surface later if we want a
            producer-direct framing somewhere. */}

        {/* REFERENCE — Production specs disclosure for legacy v4 evals
            only. v5.2+ evals carry their detail in `riskDetails` and
            render that section instead, so we suppress the empty-shell
            "Reference" disclosure when there's nothing to put in it.
            Anuj 2026-04-30 cleanup. */}
        {!riskDetails && production && (isOwnerOrAdmin || (submission.is_public ?? false)) && (
        <details className="gem-no-print group mt-12 sm:mt-14 [&_summary::-webkit-details-marker]:hidden">
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
              Tap to see the full production planning facts pulled from the script.
            </p>
          </summary>
          <div className="mt-5">

        {/* "Additional scored dimensions" Section moved into the GEM
            Score block above (Anuj 2026-04-29). The per-dim breakdown
            now lives next to the score itself, folded under a "See the
            per-dimension breakdown" disclosure. */}

        {/* PRODUCTION PLANNING DETAILS — legacy fallback only. */}
        {!riskDetails &&
          (isOwnerOrAdmin || (submission.is_public ?? false)) && (
            <>
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
            </>
          )}
          </div>
        </details>
        )}

        {/* Mid-page upgrade CTA retired 2026-04-30 v0.10.12 — replaced
            with a slim hovering banner mounted at the top of the report
            (see UpgradeTopBanner below the back-to-Community link).
            Single message: "submit another draft." */}

        {/* Owner "You're reachable / Contact open" card removed
            2026-04-28 — redundant for the owner who already sees their
            publish status + privacy controls at the top of the page. */}

        {/* CommunityReviewCta retired 2026-04-30 v0.10.14. The Peer
            reviews section below now owns the "be the first to review"
            empty-state CTA, so we don't double-stack two cards that
            both ask the same person to write the same review. */}

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
        {/* /v0.10.13 white card wrapper closes here. */}
      </div>

      {/* Invite a Reviewer — visible to script owner only (Anuj 2026-04-29 v0.2). */}
      {isOwner && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">Want a real read?</span>{' '}
            Invite a friend, peer, or mentor to leave a review.
          </div>
          <InviteReviewerButton
            submissionId={submission.id}
            pendingCount={pendingInviteCount}
          />
        </div>
      )}

      {/* Peer reviews — community Reads on this script. Visible to any
          authenticated viewer when reviews exist; reviewers (global or
          per-script invitees) also see a "Review this script" CTA.
          (Anuj 2026-04-29 peer-reviews v0.2.) */}
      {user && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <PeerReviews
            submissionId={submission.id}
            reviews={peerReviews}
            viewerCanReview={viewerCanReview}
            viewerId={user.id}
            isOwner={isOwner}
          />
        </div>
      )}

      {!viewerIsSubscribed && user && (
        <SubscribeGate evaluationId={id} isLoggedIn={true} />
      )}

      {/* Producer-mode: "Reach out to the writer" panel — gated on
          Interested. Anuj 2026-04-29: ported from /partner/script/[matchId]
          so producers have the same email-the-writer affordance on the
          unified URL. */}
      {isViewerProducer && isViewerProducerUnlocked && viewerMatch && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10 mb-12 gem-no-print">
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
                Reach out to the writer
              </p>
              <p className="text-[12.5px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
                Send an intro by email — we'll deliver it. The writer can hit
                Reply to land in your inbox directly.
              </p>
            </div>
            <ProducerIntroButton
              matchId={viewerMatch.id}
              producerEmailedAt={viewerMatch.producer_emailed_at}
            />
          </div>
        </div>
      )}

      {/* Producer-mode: sticky bottom Interested/Pass bar. */}
      {isViewerProducer && viewerMatch && (
        <StickyMatchActions
          matchId={viewerMatch.id}
          status={viewerMatch.status}
        />
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
