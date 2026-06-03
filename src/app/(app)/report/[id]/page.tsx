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
import { CURRENT_PROMPT_VERSION } from '@/lib/evaluation-prompt'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound, redirect } from 'next/navigation'
import Nav from '@/components/nav'
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
// WriterCard moved inline into EditableTopCard (compact author card)
import { Section, Collapsible, FactList, Fact } from '@/components/report/v5-components'
import { InfoSection } from '@/components/report/info-button'
import { SupportingCharactersCarousel } from '@/components/report/supporting-characters-carousel'
import { DownloadPdfModalHost } from '@/components/report/download-pdf-modal'
import { EditableTopCard } from '@/components/report/editable-top-card'
import { EditWrapper } from '@/components/report/edit-wrapper'
import { InlineCastField } from '@/components/report/inline-cast-editor'
import { InlineElevatorPitch } from '@/components/report/inline-elevator-pitch'
import { OwnerActionsMenu } from '@/components/report/owner-actions-menu'
import { ShareButtons } from '@/components/report/share-buttons'
import { DangerZoneDelete } from '@/components/report/danger-zone-delete'
import HeroMediaCarousel from '@/components/report/hero-media-carousel'
import { CollaboratorsSection } from '@/components/report/collaborators-section'
import { CrewSection } from '@/components/report/crew-section'
import { FollowersSection } from '@/components/report/followers-section'
import { BackersList } from '@/components/report/backers-list'
import { FundingOpportunities } from '@/components/report/funding-opportunities'
import { FundingProgressBar } from '@/components/report/funding-progress-bar'
import { CollapsibleRow } from '@/components/report/collapsible-row'
import { scriptMatchesOpportunity, extractMatchData } from '@/lib/opportunity-matching'
// GemAnalysisTabs retired 2026-05-25 — replaced with flat card layout
// DashboardPrivacyButton retired from the report status line on
// 2026-04-30 (v0.10) — privacy now lives in the triple-dot menu via
// ScriptPrivacySheet. The dashboard surface still uses it.
// IndustryActivityButton retired from the report page on 2026-04-30
// v0.10.19 (still used on the dashboard via OwnerActionsMenu).
import { RerunBanner } from '@/components/report/rerun-banner'
import { ProductionFactsSection, RiskDetailsSection, ComplexityCardsInner } from '@/components/report/risk-details-card'
// Annotations removed — synthesized feedback + next-steps tag instead.
// BudgetTierCard retired 2026-05-25 — budget shown inline in stat cards + production section
// import { BudgetTierCard } from '@/components/report/packaging-block'
import { IssuesSection } from '@/components/report/issues-block'
// Producer-mode UI (Anuj 2026-04-29) — rendered inline when a matched
// industry partner views this report. The surface is the same as the
// retired /partner/script/[matchId] page; that route now redirects here.
// opportunities-v1: producer partner imports removed (Interested/Pass, download, reach-out, sticky bar)
// import { MatchActions } from '@/components/partner/match-actions'
// import { StickyMatchActions } from '@/components/partner/sticky-actions'
// import { ScriptDownloadButton } from '@/components/partner/script-download-button'
// import { ProducerIntroButton } from '@/components/partner/producer-intro-button'
// import { Mail } from 'lucide-react'
import { ProjectNeedsCards, GemAnalysisCard } from '@/components/report/project-needs-cards'
import { BudgetEditor, type BudgetPlan } from '@/components/report/budget-editor'
import { RevenuePlanEditor, type RevenuePlan } from '@/components/report/revenue-plan-editor'
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
        privacy_review_needed, tags, poster_url, media_urls, heat_score,
        total_backing, backer_count, total_following, follower_count,
        budget_plan, revenue_plan,
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
  const isAdmin = user?.email === 'anuj@gem.studio' || user?.email === 'anujkommareddy@gmail.com'
  // viewerIsProducer is set below after the profile fetch; forward-declare
  // isOwnerOrAdmin as a let so we can widen it once we know the viewer role.
  let isOwnerOrAdmin = isOwner || isAdmin
  const isAnonymousSubmission = !submission.user_id
  const isStaleEval = isOwner && (eval_ as any).prompt_version !== CURRENT_PROMPT_VERSION

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
  let ownerProfile: { subscription_status: string | null; account_type: string | null; full_name: string | null; avatar_url: string | null; headline: string | null } | null = null
  if (submission.user_id) {
    const { data: op } = await serviceClient
      .from('profiles')
      .select('subscription_status, account_type, full_name, avatar_url, headline')
      .eq('id', submission.user_id)
      .single()
    ownerProfile = op
    ownerIsSubscribed = ownerProfile?.subscription_status === 'active' || ownerProfile?.subscription_status === 'trialing'
    ownerIsProducer = ownerProfile?.account_type === 'producer'
  }

  let viewerIsSubscribed = false
  let viewerIsReviewer = false
  let viewerIsProducer = false
  if (user) {
    const { data: viewerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status, is_reviewer, account_type')
      .eq('id', user.id)
      .single()
    viewerIsSubscribed = viewerProfile?.subscription_status === 'active' || viewerProfile?.subscription_status === 'trialing'
    viewerIsReviewer = viewerProfile?.is_reviewer === true
    viewerIsProducer = viewerProfile?.account_type === 'producer'
  }
  // Producer accounts get full report visibility (same as owner/admin).
  if (viewerIsProducer) isOwnerOrAdmin = true

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
  // All evals are free — no locking. Membership only gates opportunity applications.
  const lockedAfterFreeEval = false

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
  const leadCharacters: { name: string; role_type: string; demographics: string; hook: string; why_actor_wants_this?: string }[] =
    (editedFields as any)?.characters ?? report.lead_characters ?? []
  const production = report.production_reality
  const scores = report.scores ?? {}
  const craftNote = report.craft_note ?? null
  const plotSummary = report.plot_summary ?? null
  const contentDescription = report.content_description ?? null
  // Selznick 3.8 fields — every eval has these directly. The legacy
  // bridge (and the legacy `considerations` / `package_angles` /
  // `risk_rubric` reads) was retired 2026-04-29 after the rescore moved
  // every row onto the modern shape.
  const riskDetails = report.risk_details ?? null
  const packaging = report.packaging ?? null
  const issues = report.issues
  // Query project_backers for self-added/invited backer amounts
  const { data: projectBackers } = await serviceClient
    .from('project_backers')
    .select('amount, status')
    .eq('submission_id', submission.id)
  const directBackingTotal = (projectBackers || [])
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + (Number(b.amount) || 0), 0)
  const directBackerCount = (projectBackers || []).filter(b => b.status === 'confirmed').length

  const oppBacking: number = (submission as any).total_backing ?? 0
  const oppBackerCount: number = (submission as any).backer_count ?? 0
  const totalBacking: number = oppBacking + directBackingTotal
  const backerCount: number = oppBackerCount + directBackerCount
  const totalFollowing: number = (submission as any).total_following ?? 0
  const followerCount: number = (submission as any).follower_count ?? 0
  const budgetPlan: BudgetPlan | null = (submission as any).budget_plan ?? null
  const revenuePlan: RevenuePlan | null = (submission as any).revenue_plan ?? null
  // Extract just the dollar range from the raw budget string (strip "total negative cost" etc.)
  const gemEstimateRaw: string | null = packaging?.budget_tier?.range ?? packaging?.budget_tier?.per_episode ?? null
  const gemEstimate: string | null = (() => {
    if (!gemEstimateRaw) return null
    const matches = gemEstimateRaw.match(/\$[0-9.]+[KMB]?/gi)
    if (!matches) return null
    return matches.length >= 2 ? `${matches[0]}-${matches[1]}` : matches[0]
  })()

  // ── Matching opportunities + consideration results for Investment section ──
  const matchData = extractMatchData(report as unknown as Record<string, unknown>)
  if (!matchData.format && submission.declared_format) matchData.format = submission.declared_format

  const { data: openOpps } = await serviceClient
    .from('opportunities')
    .select('id, title, slug, subtitle, funding_amount, deadline, formats, genres, budget_tiers, tags, min_score')
    .eq('status', 'active')

  const matchingOpps = (openOpps || []).filter(o =>
    scriptMatchesOpportunity(matchData, o)
  ).map(o => ({
    id: o.id,
    title: o.title,
    slug: o.slug,
    subtitle: o.subtitle,
    funding_amount: Number(o.funding_amount) || 0,
    deadline: o.deadline,
  }))

  // Get consideration results for this script's submission
  let considerationResults: { opportunity_id: string; backing_status: string | null; backing_amount: number | null; review_stage: string | null; outcome: string | null; feedback: string | null; feedback_tags: string[] | null }[] = []
  {
    const { data: csLinks } = await serviceClient
      .from('consideration_scripts')
      .select('consideration_id')
      .eq('script_submission_id', submission.id)
    if (csLinks && csLinks.length > 0) {
      const conIds = csLinks.map(l => l.consideration_id)
      const { data: cons } = await serviceClient
        .from('considerations')
        .select('id, opportunity_id, backing_status, backing_amount, review_stage, feedback, feedback_tags, triage_feedback_tags')
        .in('id', conIds)
      if (cons) {
        // Map review_stage to outcome for display
        considerationResults = cons.map(c => ({
          opportunity_id: c.opportunity_id,
          backing_status: c.backing_status,
          backing_amount: c.backing_amount,
          review_stage: c.review_stage,
          outcome: c.backing_status === 'attached' ? 'back'
            : c.backing_status === 'following' ? 'follow'
            : c.review_stage === 'complete' && !c.backing_status ? 'pass'
            : null,
          feedback: c.feedback,
          feedback_tags: (c.feedback_tags && c.feedback_tags.length > 0) ? c.feedback_tags : (c as any).triage_feedback_tags || [],
        }))
      }
    }
  }

  let commercialScore: number | null = null
  try {
    if (scores && Object.keys(scores).length >= 10) {
      commercialScore = calculateWeightedScore(scores as Record<DimensionId, { score: number }>)
    }
  } catch {
    commercialScore = null
  }

  const designation = scoreDesignation(commercialScore)

  // Investment metrics — computed once, used in both tab summary and progress bar
  const investmentConsideringAmount = considerationResults
    .filter(r => !r.backing_status || r.backing_status === 'following')
    .filter(r => r.outcome !== 'pass' && r.outcome !== 'back')
    .reduce((s, r) => {
      const opp = matchingOpps.find(o => o.id === r.opportunity_id)
      return s + (opp?.funding_amount || 0)
    }, 0) + totalFollowing

  const fmtShort = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
    return `$${n}`
  }

  const investmentProjectCost = budgetPlan?.budget_low && budgetPlan?.budget_high && budgetPlan.budget_low !== budgetPlan.budget_high
    ? `${fmtShort(budgetPlan.budget_low)}-${fmtShort(budgetPlan.budget_high)}`
    : budgetPlan?.total ? fmtShort(budgetPlan.total)
    : gemEstimate || null

  // All evals unlocked — redirect removed.

  // Count hidden sections (for the visitor contact card copy).
  const hiddenSectionCount = isOwnerOrAdmin
    ? 0
    : SECTION_KEYS.filter((k) => resolveVisibility(privacy, k) === 'private').length
  const publicCount = publicSectionCount(privacy)
  const anyPublic = publicCount > 0

  // Collaborator check: pending or accepted — both get access so pending
  // users can see the accept/decline bar on the report page.
  let isCollaborator = false
  let isPendingCollaborator = false
  if (user && !isOwner && !isAdmin) {
    const { data: collabRow } = await serviceClient
      .from('script_collaborators')
      .select('id, status')
      .eq('submission_id', submission.id)
      .in('status', ['accepted', 'pending'])
      .or(`collaborator_id.eq.${user.id},collaborator_email.eq.${user.email?.toLowerCase()}`)
      .maybeSingle()
    isCollaborator = collabRow?.status === 'accepted'
    isPendingCollaborator = collabRow?.status === 'pending'
  }

  // Access tiers (Anuj 2026-05-28):
  //   1. Not logged in → redirect to login with return URL
  //   2. Logged in but not collaborator/owner/admin/producer → partial
  //      access (Pitch visible, GEM Analysis blurred)
  //   3. Collaborator/owner/admin/producer → full access
  const viewerHasFullAccess = isOwner || isAdmin || viewerIsProducer || isCollaborator || isPendingCollaborator
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/report/${id}`)}`)
  }

  // Collaborator data for the stat card
  const { data: collaboratorRows } = await serviceClient
    .from('script_collaborators')
    .select('id, collaborator_email, collaborator_id, role, role_other, profiles:collaborator_id(full_name, avatar_url, headline)')
    .eq('submission_id', submission.id)
    .eq('status', 'accepted')
  const collaboratorCount = collaboratorRows?.length ?? 0

  // Fetch backing + script count for each collaborator who has an account
  const collabIds = (collaboratorRows ?? []).map((c: any) => c.collaborator_id).filter(Boolean)
  let collabStats: Record<string, { scripts: number; totalBacking: number }> = {}
  if (collabIds.length > 0) {
    const { data: statsRows } = await serviceClient
      .from('script_submissions')
      .select('user_id, total_backing')
      .in('user_id', collabIds)
      .eq('status', 'completed')
    if (statsRows) {
      for (const row of statsRows) {
        if (!collabStats[row.user_id]) collabStats[row.user_id] = { scripts: 0, totalBacking: 0 }
        collabStats[row.user_id].scripts += 1
        collabStats[row.user_id].totalBacking += (row.total_backing ?? 0)
      }
    }
  }

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

      <EditWrapper
        evaluationId={id}
        submissionId={submission.id}
        initial={topCard}
        initialCharacters={(() => {
          // Prefer edited_fields.characters if the writer has saved
          // character overrides, otherwise fall back to the LLM-generated
          // lead_characters from the evaluation JSON.
          const editedChars = (editedFields as any)?.characters as
            | { name: string; hook: string; demographics: string; role_type: string }[]
            | undefined
          const base = editedChars ?? report.lead_characters ?? []
          return base.map((c) => ({
            name: c.name,
            hook: c.hook,
            demographics: c.demographics,
            role_type: c.role_type,
          }))
        })()}
        initialElevatorPitch={
          (editedFields as any)?.elevator_pitch ??
          (whatsSpecial.headline ?? '')
        }
        initialPlotSummary={
          (editedFields as any)?.plot_summary ??
          (plotSummary ?? '')
        }
        isOwner={isOwner || isAdmin}
      >

      {/* ── DARK CANVAS HERO — cinematic top section ──
          Breaks out of the gray (app) layout background with negative
          margins so the dark gradient spans full width. Contains poster,
          title, logline, score, and genre pills on a dark canvas with
          a subtle purple ambient glow. */}
      <div
        className="gem-report-hero -mt-6 mb-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1035 0%, #2b1a55 40%, #322060 100%)',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          paddingLeft: 'calc(50vw - 50%)',
          paddingRight: 'calc(50vw - 50%)',
          // Override CSS variables so child components (EditableTopCard,
          // OwnerActionsMenu, DetailsExpander) render light-on-dark
          // without needing a variant prop on each one.
          '--gem-gray-50': '#FFFFFF',
          '--gem-gray-100': 'rgba(255,255,255,0.92)',
          '--gem-gray-200': 'rgba(255,255,255,0.80)',
          '--gem-gray-300': 'rgba(255,255,255,0.65)',
          '--gem-gray-400': 'rgba(255,255,255,0.50)',
          '--gem-gray-500': 'rgba(255,255,255,0.35)',
          '--gem-gray-600': 'rgba(255,255,255,0.15)',
          '--gem-gray-700': 'rgba(255,255,255,0.12)',
          '--gem-gray-800': 'rgba(255,255,255,0.06)',
          '--gem-gray-900': 'rgba(255,255,255,0.03)',
          '--gem-gold': '#E8B825',
        } as React.CSSProperties}
      >
        {/* Ambient purple glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '700px',
            height: '450px',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse at center, rgba(124,77,237,0.22) 0%, rgba(124,77,237,0.08) 45%, transparent 70%)',
          }}
        />

        {/* Banners inside hero */}
        <div className="max-w-3xl mx-auto pt-2 relative z-10">
          {showUpgradeCTA && isOwner && <UpgradeTopBanner evaluationId={id} />}
          {forWriter && <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />}

          {isAnonymousSubmission && !isAdmin && (
            <div id="inline-signup" className="rounded-xl transition-shadow duration-500 mb-6">
              <InlineSignup submissionId={submission.id} evaluationId={id} />
            </div>
          )}

          {isAdmin && !isOwner && (
            <div className="gem-no-print mb-4">
              <span
                className="text-[9.5px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded"
                style={{
                  color: '#ff6b6b',
                  background: 'rgba(255,107,107,0.12)',
                  border: '1px solid rgba(255,107,107,0.3)',
                }}
              >
                Admin
              </span>
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto pb-0 relative z-10" />

      </div>

      {/* Override the (app) layout background to dark gradient for report */}
      <style>{`
        .gem-floating-card {
          background: #ffffff;
          padding: 28px 32px;
          margin-bottom: 12px;
          margin-left: -1rem;
          margin-right: -1rem;
        }
        @media (min-width: 640px) {
          .gem-floating-card {
            margin-left: -1.5rem;
            margin-right: -1.5rem;
          }
        }
        /* Hide the nav bottom border on report pages — it creates a
           visible seam between the white nav and the dark gradient. */
        nav { border-bottom: none !important; }
      `}</style>

      <div
        className="max-w-3xl mx-auto pb-24 pt-0"
        style={{
          '--gem-gray-50': '#FFFFFF',
          '--gem-gray-100': 'rgba(255,255,255,0.92)',
          '--gem-gray-200': 'rgba(255,255,255,0.80)',
          '--gem-gray-300': 'rgba(255,255,255,0.65)',
          '--gem-gray-400': 'rgba(255,255,255,0.50)',
          '--gem-gray-500': 'rgba(255,255,255,0.35)',
          '--gem-gray-600': 'rgba(255,255,255,0.15)',
          '--gem-gray-700': 'rgba(255,255,255,0.12)',
          '--gem-gray-800': 'rgba(255,255,255,0.06)',
          '--gem-gray-900': 'rgba(255,255,255,0.03)',
          '--gem-gold': '#E8B825',
        } as React.CSSProperties}
      >
        <div className="space-y-4">

        {/* opportunities-v1: Interested/Pass buttons + script download removed.
            Producer review now happens in /producer/opportunities. */}

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

        {/* RERUN BANNER — shown to owner when eval is stale */}
        {isStaleEval && <RerunBanner submissionId={submission.id} />}

        {/* Stat cards removed — GEM Score + Heat now rendered in hero above */}

        {/* ═══ HERO — big cinematic poster, flush to edges ═══ */}
        <div
          className="relative w-full overflow-hidden -mx-4 sm:-mx-6"
          style={{ aspectRatio: '16/9', background: '#1a1a1a', width: 'calc(100% + 2rem)' }}
        >
          {/* Media carousel — poster is slide 1, additional media follows */}
          <div className="absolute inset-0">
            <HeroMediaCarousel
              submissionId={submission.id}
              posterUrl={submission.poster_url ?? null}
              initialMedia={(submission as any).media_urls || []}
              isOwner={isOwner || isAdmin}
            />
          </div>
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))' }}
          />
          {/* Metadata overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:px-7 sm:pb-6">
            <EditableTopCard
              evaluationId={id}
              submissionId={submission.id}
              initial={topCard}
              isOwner={isOwner || isAdmin}
              hasEdits={topCardHasEdits}
              postedAt={submission.created_at ?? null}
              heroOverlay
              authorName={
                isAnonymousSubmission ? null : submission.profiles?.full_name ?? null
              }
              authorHandle={
                isAnonymousSubmission ? null : submission.profiles?.handle ?? null
              }
              authorAvatar={
                isAnonymousSubmission ? null : submission.profiles?.avatar_url ?? null
              }
              authorHeadline={
                isAnonymousSubmission ? null : submission.profiles?.headline ?? null
              }
              commercialScore={null}
              scoreShownToIndustry={isScoreVisible(privacy)}
              isProSubscriber={true}
            />
            {/* Classification pills */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {report.classification?.format && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(124,58,237,0.9)', color: '#fff' }}>
                  {report.classification.format}
                </span>
              )}
              {report.classification?.genre_primary && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(43,26,85,0.85)', color: '#fff', border: '1px solid rgba(124,58,237,0.4)' }}>
                  {report.classification.genre_primary}
                </span>
              )}
              {(report.classification?.genre_secondary ?? []).map((g: string, i: number) => (
                <span key={`gs-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(43,26,85,0.85)', color: '#fff', border: '1px solid rgba(124,58,237,0.4)' }}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ CONTENT BELOW HERO — floating cards on dark gradient ═══ */}

        {/* ═══ PITCH + PLOT SUMMARY — share bar integrated ═══ */}
        <div className="gem-floating-card" style={{ padding: 0 }}>
          {/* Share bar — top of section */}
          <div className="gem-no-print flex items-center justify-between" style={{ padding: '12px 32px', borderBottom: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-1">
              <ShareButtons
                title={submission.title ?? 'Check out my project on GEM'}
                url={`https://gem-pilot.vercel.app/report/${id}`}
              />
            </div>
            {(isOwner || isAdmin) && (
              <OwnerActionsMenu
                submissionId={submission.id}
                evaluationId={id}
                title={submission.title}
                declaredFormat={submission.declared_format ?? null}
                isSubscribed={ownerIsSubscribed || isAdmin}
              />
            )}
          </div>
          {/* Content */}
          <div style={{ padding: '24px 32px' }} className="space-y-5">
          {/* Why This Can Be a Hit */}
          <SectionGate
            section="whats_working"
            privacy={privacy}
            isOwnerOrAdmin={isOwnerOrAdmin}
            submissionId={privacyControlId}
            isPublic={submission.is_public ?? false}
            isProSubscriber={true}
          >
            {whatsSpecial.headline && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] m-0 mb-2" style={{ color: '#78716C' }}>
                  Why This Can Be a Hit
                </p>
                <p className="text-[16px] sm:text-[17px] leading-[1.6] font-normal m-0" style={{ color: '#1C1917' }}>
                  {whatsSpecial.headline}
                </p>
              </div>
            )}
          </SectionGate>

          {/* PLOT SUMMARY — collapsed by default */}
          {plotSummary && (
            <details>
              <summary className="text-[11px] font-semibold uppercase tracking-[0.12em] cursor-pointer select-none list-none" style={{ color: '#78716C' }}>
                <span className="flex items-center gap-1.5">
                  Plot Summary
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline-block transition-transform [[open]>&]:rotate-180">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </summary>
              <p className="text-[15px] sm:text-[16px] leading-[1.6] m-0 mt-2" style={{ color: '#44403C' }}>
                {plotSummary}
              </p>
            </details>
          )}
          </div>{/* close content wrapper */}
        </div>{/* close gem-floating-card */}

        {/* ═══ WHAT THIS PROJECT NEEDS — expandable cards ═══ */}
        <div className="gem-floating-card">
        <ProjectNeedsCards
          investmentSummary={null}
          investmentMetrics={(() => {
            const pendingFromOpps = considerationResults
              .filter(r => !r.outcome || r.outcome === '' || r.outcome === 'follow')
              .reduce((s, r) => {
                const opp = matchingOpps.find(o => o.id === r.opportunity_id)
                return s + (opp?.funding_amount || 0)
              }, 0)
            return {
              projectCost: investmentProjectCost || fmtShort(budgetPlan?.total ?? 0),
              secured: fmtShort(totalBacking),
              considering: pendingFromOpps > 0 ? fmtShort(pendingFromOpps) : null,
            }
          })()}
          crewSummary={(() => {
            const crewCollabs = (collaboratorRows ?? []).filter((c: any) => c.role !== 'cast')
            const filled = crewCollabs.length
            const open = Math.max(0, 3 - filled)
            if (filled === 0 && open === 0) return null
            return `${open} open · ${filled} filled`
          })()}
          castSummary={(() => {
            const castCollabs = (collaboratorRows ?? []).filter((c: any) => c.role === 'cast')
            const roles = leadCharacters.length
            const cast = castCollabs.length
            if (roles === 0 && cast === 0) return null
            const open = Math.max(0, roles - cast)
            return `${open} open · ${cast} cast`
          })()}
          investmentChildren={
            <div>
              <CollapsibleRow
                emoji="📊"
                title="Budget"
                subtitle="Plan your project budget"
                value={gemEstimate || (budgetPlan?.total ? fmtShort(budgetPlan.total) : '')}
              >
                <BudgetEditor
                  initial={budgetPlan}
                  gemEstimate={packaging?.budget_tier?.range || packaging?.budget_tier?.per_episode || null}
                  gemNote={packaging?.budget_tier?.note ?? null}
                  gemTier={null}
                  gemPerEpisode={packaging?.budget_tier?.per_episode ?? null}
                  gemSeasonTotal={packaging?.budget_tier?.season_total ?? null}
                  submissionId={submission.id}
                />
              </CollapsibleRow>
              <CollapsibleRow
                emoji="💰"
                title="Funding"
                subtitle={(() => {
                  const parts: string[] = []
                  if (totalBacking > 0) parts.push(`${fmtShort(totalBacking)} secured`)
                  if (investmentConsideringAmount > 0) parts.push(`${fmtShort(investmentConsideringAmount)} pending`)
                  const availableOppAmount = matchingOpps.filter(o => !considerationResults.some(r => r.opportunity_id === o.id)).reduce((s, o) => s + o.funding_amount, 0)
                  if (availableOppAmount > 0) parts.push(`${fmtShort(availableOppAmount)} available`)
                  return parts.length > 0 ? parts.join(' · ') : 'No funding yet'
                })()}
                value={totalBacking > 0 ? fmtShort(totalBacking) : '$0'}
                valueColor={totalBacking > 0 ? '#0F6E56' : '#78716C'}
              >
                <BackersList
                  submissionId={submission.id}
                  budgetTotal={budgetPlan?.total ?? 0}
                  isOwner={isOwner || isAdmin}
                  currentUserId={user?.id ?? null}
                  ownerName={ownerProfile?.full_name ?? null}
                />
                {(isOwner || isAdmin) && matchingOpps.length > 0 && (
                  <div style={{ background: '#F5F3FF', margin: '16px -20px 0', padding: '16px 20px 20px', borderTop: '1px solid #EEEDFE' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      <span className="text-[11px]" style={{ color: '#A8A29E' }}>Private to you</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[13px] font-semibold" style={{ color: '#1C1917' }}>Funding pipeline</span>
                    </div>
                    <FundingOpportunities
                      matchingOpps={matchingOpps}
                      considerationResults={considerationResults}
                      submissionId={submission.id}
                      isOwner={true}
                      budgetTotal={0}
                      securedAmount={0}
                    />
                  </div>
                )}
              </CollapsibleRow>
              <CollapsibleRow
                emoji="📈"
                title="Revenue projection"
                subtitle={(() => {
                  const parts: string[] = []
                  if (revenuePlan?.sources?.length) parts.push(`${revenuePlan.sources.length} source${revenuePlan.sources.length !== 1 ? 's' : ''}`)
                  const rev = revenuePlan?.total ?? 0
                  const bLow = budgetPlan?.budget_low ?? 0
                  const bHigh = budgetPlan?.budget_high ?? budgetPlan?.total ?? 0
                  if (bLow > 0 && bHigh > 0 && rev > 0 && bLow !== bHigh) {
                    parts.push(`${(rev / bHigh).toFixed(1)}x-${(rev / bLow).toFixed(1)}x return`)
                  } else if ((budgetPlan?.total ?? 0) > 0 && rev > 0) {
                    parts.push(`${(rev / (budgetPlan?.total ?? 1)).toFixed(1)}x return`)
                  }
                  return parts.length > 0 ? parts.join(' · ') : 'No sources added yet'
                })()}
                value={revenuePlan?.total ? fmtShort(revenuePlan.total) : '$0'}
                valueColor={revenuePlan?.total ? '#0F6E56' : '#78716C'}
              >
                <RevenuePlanEditor
                  initial={revenuePlan}
                  submissionId={submission.id}
                />
                {/* Returns summary */}
                <div className="flex items-center justify-center gap-4 py-4 mt-3 text-[14px]" style={{ borderTop: '1px solid #f5f5f4' }}>
                  <span style={{ color: '#78716C' }}>{investmentProjectCost || fmtShort(budgetPlan?.total ?? 0)} cost</span>
                  <span style={{ color: '#A8A29E' }}>→</span>
                  <span style={{ color: '#0F6E56', fontWeight: 500 }}>{fmtShort(revenuePlan?.total ?? 0)} revenue</span>
                  {(budgetPlan?.total ?? 0) > 0 && (revenuePlan?.total ?? 0) > 0 && (
                    <>
                      <span style={{ color: '#A8A29E' }}>→</span>
                      <span style={{ color: '#534AB7', fontWeight: 500 }}>
                        {(() => {
                          const rev = revenuePlan?.total ?? 0
                          const bLow = budgetPlan?.budget_low ?? 0
                          const bHigh = budgetPlan?.budget_high ?? budgetPlan?.total ?? 0
                          if (bLow > 0 && bHigh > 0 && bLow !== bHigh) {
                            return `${(rev / bHigh).toFixed(1)}x-${(rev / bLow).toFixed(1)}x`
                          }
                          return `${(rev / (budgetPlan?.total ?? 1)).toFixed(1)}x`
                        })()}
                      </span>
                    </>
                  )}
                </div>
              </CollapsibleRow>
            </div>
          }
          crewChildren={
            <div className="space-y-6">
              <CrewSection
                submissionId={submission.id}
                isOwner={isOwner || isAdmin}
                currentUserId={user?.id ?? null}
                currentUserEmail={user?.email ?? null}
                ownerProfile={ownerProfile ? {
                  full_name: ownerProfile.full_name ?? null,
                  avatar_url: ownerProfile.avatar_url ?? null,
                  headline: ownerProfile.headline ?? null,
                } : null}
              />
            </div>
          }
          castChildren={
            <div className="space-y-6">
              <CrewSection
                submissionId={submission.id}
                isOwner={isOwner || isAdmin}
                currentUserId={user?.id ?? null}
                currentUserEmail={user?.email ?? null}
                ownerProfile={ownerProfile ? {
                  full_name: ownerProfile.full_name ?? null,
                  avatar_url: ownerProfile.avatar_url ?? null,
                  headline: ownerProfile.headline ?? null,
                } : null}
                category="cast"
                characterNames={leadCharacters.map(c => c.name)}
                characters={leadCharacters.map(c => ({
                  name: c.name,
                  role_type: c.role_type || '',
                  demographics: c.demographics || '',
                  hook: c.hook || '',
                }))}
              />
            </div>
          }
        />
        </div>{/* close project needs floating card */}

        {/* ═══ GEM ANALYSIS — collapsible card with inline score ═══ */}
        <div className="gem-floating-card">
        <GemAnalysisCard
          score={typeof commercialScore === 'number' ? Math.round(commercialScore) : null}
          tier={designation ? DESIGNATION_STYLE[designation].label : null}
        >

        {/* ═══ GEM ANALYSIS CONTENT ═══ */}
        <div className="relative space-y-8">
        {!viewerHasFullAccess && (
          <div className="absolute inset-0 z-20 rounded-2xl flex items-center justify-center" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(26,16,53,0.7)' }}>
            <p className="text-[20px] sm:text-[24px] font-bold text-center m-0 px-6" style={{ color: '#A78BFA' }}>
              Visible to collaborators only
            </p>
          </div>
        )}

        {/* Score display */}
        {typeof commercialScore === 'number' && (
          <div className="text-center pb-4 mb-2" style={{ borderBottom: '1px solid #E7E5E4' }}>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-[13px] uppercase tracking-[0.12em] font-bold" style={{ color: '#78716C' }}>
                Overall Score
              </span>
              <span className="text-[40px] sm:text-[48px] font-bold leading-none" style={{ color: '#7C3AED' }}>
                {Math.round(commercialScore)}
              </span>
              <span className="text-[15px] font-bold" style={{ color: '#A78BFA' }}>
                / 100
              </span>
            </div>
          </div>
        )}

        {/* ═══ STRENGTHS + WEAKNESSES — two columns ═══ */}
        {(allStrengths.length > 0 || (issues?.items ?? []).length > 0 || craftNote) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT — Why This Can Be a Hit */}
            <SectionGate
              section="whats_working"
              privacy={privacy}
              isOwnerOrAdmin={isOwnerOrAdmin}
              submissionId={privacyControlId}
              isPublic={submission.is_public ?? false}
              isProSubscriber={true}
            >
              {allStrengths.length > 0 && (
                <div>
                  <h2
                    className="text-[14px] uppercase tracking-[0.2em] font-bold m-0 mb-4"
                    style={{ color: '#1C1917' }}
                  >
                    Why This Can Be a Hit
                  </h2>
                  <ol className="list-none m-0 p-0 space-y-2">
                    {allStrengths.map((s, i) => (
                      <li key={i}>
                        <details className="group [&_summary::-webkit-details-marker]:hidden">
                          <summary className="cursor-pointer list-none grid grid-cols-[24px_1fr_auto] gap-x-2 items-center py-2 px-2 rounded-lg hover:bg-[rgba(0,0,0,0.03)] transition-colors -mx-2">
                            <span
                              className="text-[14px] sm:text-[16px] font-bold tabular-nums leading-tight"
                              style={{ color: '#7C3AED' }}
                            >
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <p className="text-[14px] sm:text-[15px] font-semibold m-0 leading-snug min-w-0" style={{ color: '#1C1917' }}>
                              {s.dimension_or_area}
                            </p>
                            <span
                              aria-hidden
                              className="transition-transform duration-150 group-open:rotate-180 text-[12px]"
                              style={{ color: '#78716C' }}
                            >
                              ▾
                            </span>
                          </summary>
                          <div className="grid grid-cols-[24px_1fr] gap-x-2 pt-1 pb-1">
                            <div />
                            <p className="text-[13px] sm:text-[14px] leading-[1.6] m-0" style={{ color: '#44403C' }}>
                              {s.what_it_means}
                            </p>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </SectionGate>

            {/* RIGHT — What to Consider */}
              <SectionGate
                section="development_considerations"
                privacy={privacy}
                isOwnerOrAdmin={isOwnerOrAdmin}
                submissionId={privacyControlId}
                isPublic={submission.is_public ?? false}
                isProSubscriber={true}
              >
              {(() => {
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
                const empty = merged.length === 0 && !craftNote
                if (empty) return null
                const primary = merged.find((c) => c.is_primary_lever === true)
                const secondary = merged.filter((c) => c.is_primary_lever !== true)
                const ordered: IssueRow[] = primary
                  ? [primary, ...secondary]
                  : secondary
                return (
                  <div>
                    <h2
                      className="text-[14px] uppercase tracking-[0.2em] font-bold m-0 mb-4"
                      style={{ color: '#1C1917' }}
                    >
                      What to Consider
                    </h2>
                    {ordered.length > 0 && (
                      <ol className="list-none m-0 p-0 space-y-2">
                        {ordered.map((c, i) => (
                          <li key={i}>
                            <details className="group [&_summary::-webkit-details-marker]:hidden">
                              <summary className="cursor-pointer list-none grid grid-cols-[24px_1fr_auto] gap-x-2 items-center py-2 px-2 rounded-lg hover:bg-[rgba(0,0,0,0.03)] transition-colors -mx-2">
                                <span
                                  className="text-[14px] sm:text-[16px] font-bold tabular-nums leading-tight"
                                  style={{ color: '#7C3AED' }}
                                >
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <p className="text-[14px] sm:text-[15px] font-semibold m-0 leading-snug min-w-0" style={{ color: '#1C1917' }}>
                                  {c.area}
                                </p>
                                <span
                                  aria-hidden
                                  className="transition-transform duration-150 group-open:rotate-180 text-[12px]"
                                  style={{ color: '#78716C' }}
                                >
                                  ▾
                                </span>
                              </summary>
                              <div className="grid grid-cols-[24px_1fr] gap-x-2 pt-1 pb-1">
                                <div />
                                <p className="text-[13px] sm:text-[14px] leading-[1.6] m-0" style={{ color: '#44403C' }}>
                                  {c.detail}
                                </p>
                              </div>
                            </details>
                          </li>
                        ))}
                      </ol>
                    )}

                    {/* Craft note */}
                    {craftNote && (
                      <div className="relative pl-4 mt-4">
                        <div
                          aria-hidden
                          className="absolute left-0 top-1 bottom-1 rounded-sm"
                          style={{ width: 3, background: '#059669' }}
                        />
                        <p
                          className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-1"
                          style={{ color: '#059669' }}
                        >
                          Craft note
                        </p>
                        <p className="text-[13px] sm:text-[14px] leading-[1.6] m-0" style={{ color: '#44403C' }}>
                          {craftNote}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}
              </SectionGate>
          </div>
        )}

        {/* ═══ NARRATIVE BREAKDOWN — dimension scores ═══ */}
        {scores && Object.values(scores).some((s) => typeof s?.score === 'number') && (
          <div>
            <h2
              className="text-[15px] uppercase tracking-[0.2em] font-bold m-0 mb-4"
              style={{ color: '#1C1917' }}
            >
              Narrative Breakdown
            </h2>
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
          </div>
        )}

        {/* ═══ PRODUCTION — budget tier + complexity cards ═══ */}
        {(riskDetails || production || packaging?.budget_tier) && (
          <SectionGate
            section="project_complexity"
            privacy={privacy}
            isOwnerOrAdmin={isOwnerOrAdmin}
            submissionId={privacyControlId}
            isPublic={submission.is_public ?? false}
            isProSubscriber={true}
          >
            <div data-pdf-section="project_complexity">
              <h2
                className="text-[15px] uppercase tracking-[0.2em] font-bold m-0 mb-5"
                style={{ color: '#1C1917' }}
              >
                Production
              </h2>

              <div
                className="overflow-hidden"
              >
                {/* Budget tier — prominent header */}
                {packaging?.budget_tier && (
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-500)] m-0">
                        Budget Assessment
                      </p>
                      <span
                        className="text-[12px] uppercase tracking-[0.12em] font-bold px-2.5 py-0.5 rounded-full capitalize"
                        style={{
                          color: 'var(--gem-gold)',
                          background: 'rgba(146,64,14,0.08)',
                          border: '1px solid rgba(146,64,14,0.2)',
                        }}
                      >
                        {packaging.budget_tier.tier}
                      </span>
                    </div>
                    {packaging.budget_tier.range && (
                      <p className="text-[18px] sm:text-[20px] font-bold m-0 mb-1" style={{ color: '#1C1917' }}>
                        {packaging.budget_tier.range}
                      </p>
                    )}
                    {packaging.budget_tier.per_episode && (
                      <p className="text-[14px] m-0 mb-1" style={{ color: '#78716C' }}>
                        {packaging.budget_tier.per_episode} per episode
                        {packaging.budget_tier.season_total ? ` · ${packaging.budget_tier.season_total} season total` : ''}
                      </p>
                    )}
                    {packaging.budget_tier.note && (
                      <p className="text-[14px] sm:text-[15px] leading-[1.55] m-0 mt-2" style={{ color: '#44403C' }}>
                        {packaging.budget_tier.note}
                      </p>
                    )}
                  </div>
                )}

                {/* Complexity cards — Production + Cast */}
                {riskDetails && (
                  <div
                    className="p-5 sm:p-6"
                    style={{ borderTop: packaging?.budget_tier ? '1px solid #E7E5E4' : undefined }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-500)] m-0 mb-3">
                      Complexity
                    </p>
                    <ComplexityCardsInner data={riskDetails} production={production} />
                  </div>
                )}

                {/* Legacy fallback: if no riskDetails but production exists */}
                {!riskDetails && production && (
                  <div className="p-5 sm:p-6">
                    <ProductionFactsSection data={{ budget: { level: 'medium', note: '' }, casting: { level: 'medium', note: '' }, development: { level: 'medium', note: '' } }} production={production} />
                  </div>
                )}
              </div>
            </div>
          </SectionGate>
        )}

        </div>{/* ═══ END GEM ANALYSIS CONTENT ═══ */}

        </GemAnalysisCard>

        </div>{/* ═══ END GEM ANALYSIS PADDING WRAPPER ═══ */}

        {/* ═══ END CONTENT BELOW HERO ═══ */}
        </div>{/* /space-y-12 */}
      </div>

      {/* Invite a Reviewer + Peer Reviews hidden — opportunities-v1.
          Code preserved, just not rendered. */}

      {/* SubscribeGate removed — UpgradeModalListener in app layout handles all upgrade modals */}

      {/* opportunities-v1: reach-out panel + sticky Interested/Pass bar removed.
          Producer interaction now flows through /producer/opportunities. */}

      {/* Danger Zone removed — delete now lives in the three-dot menu */}

      </EditWrapper>
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
      style={{ border: 'none', background: 'transparent' }}
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-[17px] font-semibold m-0 leading-tight" style={{ color: '#1C1917' }}>
          {label}
        </p>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          {locked ? (
            <span
              className="text-[26px] font-bold tabular-nums"
              style={{ color: '#A8A29E', filter: 'blur(3px)', userSelect: 'none' }}
              aria-hidden
            >
              ?
            </span>
          ) : (
            <span className="text-[26px] font-bold tabular-nums" style={{ color: palette.text }}>
              {score}
            </span>
          )}
          <span className="text-[13px]" style={{ color: '#78716C' }}>/ 10</span>
        </div>
      </div>
      <div
        className="h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: '#F5F5F4' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: locked ? '#A8A29E' : palette.fill,
            filter: locked ? 'blur(4px)' : undefined,
          }}
        />
      </div>
      {reasoning && (
        <p
          className="text-[15px] leading-[1.6] m-0"
          style={{ color: '#44403C', ...(locked ? blurStyle : {}) }}
        >
          {reasoning}
        </p>
      )}
    </div>
  )
}
