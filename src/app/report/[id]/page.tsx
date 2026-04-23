// v5.2 + granular privacy (2026-04-23).
//
// Viewer paths:
//   - Owner / admin: full report (tabs, PrivacyPanel, inline privacy pills).
//     The writer is in the driver seat — they pick presets or per-section
//     overrides and see what visitors will see via the publish-preview modal.
//   - Non-owner (signed in or not): privacy-filtered single-page view. Only
//     sections the writer marked public render. Private sections are HIDDEN
//     (not blurred). A single "Contact writer" card at the bottom routes
//     inbound requests through Anuj.
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
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
import { ShareSection } from '@/components/report/share-section'
import { PostUpgradeEmail } from '@/components/report/post-upgrade-email'
import { LockedReportUpgrade } from '@/components/report/locked-report-upgrade'
import { SubmitRevisionButton } from '@/components/report/submit-revision-button'
import { LockedAfterEvalScreen } from '@/components/report/locked-after-eval-screen'
import { DetailsView } from '@/components/report/details-view'
import { PrivacyPanel } from '@/components/report/privacy-panel'
import { PublicContactCard } from '@/components/report/public-contact-card'
import { SectionGate } from '@/components/report/section-gate'
import { ContactWriter } from '@/components/report/contact-writer'
import { Section, Collapsible, FactList, Fact } from '@/components/report/v5-components'
import { DIMENSION_META } from '@/types'
import { EditableTopCard } from '@/components/report/editable-top-card'
import { normalizeEvaluation, calculateWeightedScore } from '@/types'
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

  // Privacy resolution — normalize whatever's on the row (legacy rows may be
  // empty; the resolver falls through to DEFAULT_VISIBILITY).
  const privacy: ReportPrivacy = normalizePrivacy(submission.report_privacy)
  const contactEnabled = submission.contact_enabled !== false // default true
  const needsPrivacyReview = submission.privacy_review_needed === true
  const reviewCount = needsPrivacyReview ? 1 : 0

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

  // First-eval gate (unchanged).
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

  // Portfolio rank (owner only) — unchanged.
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

  let commercialScore: number | null = null
  try {
    if (scores && Object.keys(scores).length >= 10) {
      commercialScore = calculateWeightedScore(scores as Record<DimensionId, { score: number }>)
    }
  } catch {
    commercialScore = null
  }

  const blurStyle: React.CSSProperties = {
    filter: 'blur(5px)',
    userSelect: 'none',
  }

  // Locked-after-free-eval screen (unchanged — fast early return).
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

  // ───────────── NON-OWNER PATH ──────────────
  // Privacy-filtered single-page render. Only public sections render.
  // Private sections are hidden entirely; visitor is routed to the
  // contact card at the bottom. This replaces the old tab split + blur
  // approach, which Anuj deprecated because blur "pisses people off"
  // and the writer can't project a clean public-facing snapshot.
  if (!isOwnerOrAdmin) {
    const hiddenCount = SECTION_KEYS.filter(
      (k) => resolveVisibility(privacy, k) === 'private'
    ).length
    const publicCount = publicSectionCount(privacy)
    const anyPublic = publicCount > 0

    return (
      <>
        <Nav />
        <ReportAnalytics evaluationId={id} isBlurred={false} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">
          {forWriter && <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />}
          {isAnonymousSubmission && (
            <div id="inline-signup" className="rounded-xl transition-shadow duration-500 mb-8">
              <InlineSignup submissionId={submission.id} evaluationId={id} />
            </div>
          )}

          {/* Lightweight "shared snapshot" banner so visitors understand
              they're looking at a writer-curated view — not the full report. */}
          {anyPublic && (
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

          {/* HEADLINE */}
          <SectionGate section="headline" privacy={privacy} isOwnerOrAdmin={false}>
            <EditableTopCard
              evaluationId={id}
              initial={topCard}
              isOwner={false}
              hasEdits={topCardHasEdits}
              postedAt={submission.created_at ?? null}
              authorName={
                isAnonymousSubmission ? null : submission.profiles?.full_name ?? null
              }
              isGemSelect={typeof commercialScore === 'number' && commercialScore >= 75}
            />
          </SectionGate>

          {/* SCORE */}
          <SectionGate section="score" privacy={privacy} isOwnerOrAdmin={false}>
            {typeof commercialScore === 'number' && (
              <PublicScoreCard score={commercialScore} />
            )}
          </SectionGate>

          {/* WHATS WORKING */}
          <SectionGate section="whats_working" privacy={privacy} isOwnerOrAdmin={false}>
            {allStrengths.length > 0 && (
              <Section label="Why this can be a hit" subtitle={whatsSpecial.headline}>
                <div className="space-y-3">
                  {allStrengths.map((s, i) => (
                    <Collapsible key={i} number={i + 1} title={s.dimension_or_area}>
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

          {/* SHARPEST LEVER — primary_lever considerations + craft note */}
          <SectionGate section="sharpest_lever" privacy={privacy} isOwnerOrAdmin={false}>
            <PublicSharpestLever
              considerations={considerations}
              craftNote={craftNote}
            />
          </SectionGate>

          {/* PRODUCTION SIGNAL — at-a-glance risk pills teaser */}
          <SectionGate section="production_signal" privacy={privacy} isOwnerOrAdmin={false}>
            {production?.risk_rubric && (
              <Section label="Production signal" subtitle="A two-second read on how this would actually get made.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {production.risk_rubric.cost && (
                    <PublicRiskTile label="Production cost" axis={production.risk_rubric.cost} />
                  )}
                  {production.risk_rubric.cast && (
                    <PublicRiskTile label="Cast complexity" axis={production.risk_rubric.cast} />
                  )}
                  {production.risk_rubric.content && (
                    <PublicRiskTile label="Content maturity" axis={production.risk_rubric.content} />
                  )}
                </div>
              </Section>
            )}
          </SectionGate>

          {/* DEEP DIVE: CHARACTERS */}
          <SectionGate section="deep_dive_characters" privacy={privacy} isOwnerOrAdmin={false}>
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
          </SectionGate>

          {/* DEEP DIVE: PACKAGE ANGLES */}
          <SectionGate section="deep_dive_package" privacy={privacy} isOwnerOrAdmin={false}>
            {packageAngles && (
              <Section label="Package angles" subtitle="Who would direct it, and who would buy it.">
                <div className="space-y-3">
                  <Collapsible title="Why a director wants this" accent="#059669">
                    <p className="text-[18px] font-semibold text-[var(--gem-gray-50)] leading-[1.4] mb-4 m-0">
                      {packageAngles.director_appeal.hook}
                    </p>
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
          </SectionGate>

          {/* DEEP DIVE: PRODUCTION PLANNING DETAILS
              Cast / Locations / Technical / Platform / Rights — same data
              layout as owner's Details tab, just crisp (no blur, no upgrade
              CTA, no privacy note). */}
          <SectionGate section="deep_dive_production" privacy={privacy} isOwnerOrAdmin={false}>
            {production && (
              <Section
                label="Production planning details"
                subtitle="Everything the script tells us about how it would actually get made."
              >
                <div className="space-y-3">
                  <Collapsible
                    title="Cast"
                    meta={`${production.cast?.leads ?? 0} lead${production.cast?.leads === 1 ? '' : 's'} · ${production.cast?.speaking_roles ?? 0} speaking roles${production.cast?.child_actors ? ' · child actors' : ''}`}
                  >
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
                  </Collapsible>
                  <Collapsible
                    title="Locations & Scale"
                    meta={`${production.locations?.distinct_count ?? 0} distinct${production.locations?.period_or_contemporary ? ` · ${production.locations.period_or_contemporary}` : ''}`}
                  >
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
                  </Collapsible>
                  <Collapsible
                    title="Platform & Content"
                    meta={production.platform_fit?.recommended_lane}
                  >
                    <FactList>
                      <Fact k="Lane" v={production.platform_fit?.recommended_lane} />
                      <Fact k="Content" v={production.platform_fit?.content_level} />
                      {production.platform_fit?.series_engine_or_release_model && (
                        <Fact k="Model" v={production.platform_fit.series_engine_or_release_model} />
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

          {/* DEEP DIVE: DEVELOPMENT PRIORITIES (secondary) — non-primary-lever
              considerations. Primary lever is already surfaced in sharpest_lever
              above, so we filter it out to avoid duplication. */}
          <SectionGate section="deep_dive_development" privacy={privacy} isOwnerOrAdmin={false}>
            {considerations.filter((c) => c.is_primary_lever !== true).length > 0 && (
              <Section
                label="Development priorities"
                subtitle="Additional development notes — positioning, directions a collaborator might lean on in conversation."
              >
                <div className="space-y-3">
                  {considerations
                    .filter((c) => c.is_primary_lever !== true)
                    .map((c, i) => (
                      <Collapsible key={i} title={c.area}>
                        <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0">
                          {c.detail}
                        </p>
                      </Collapsible>
                    ))}
                </div>
              </Section>
            )}
          </SectionGate>

          {/* DEEP DIVE: NARRATIVE BREAKDOWN — 10 dim scores + reasoning. */}
          <SectionGate section="deep_dive_narrative" privacy={privacy} isOwnerOrAdmin={false}>
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
                      <PublicDimensionRow
                        key={dimId}
                        label={meta.label}
                        score={s.score}
                        reasoning={s.reasoning}
                      />
                    )
                  })}
                </div>
              </Section>
            )}
          </SectionGate>

          {/* Single CTA at the bottom. */}
          {!isAnonymousSubmission && (
            <PublicContactCard
              evaluationId={id}
              writerName={writerName}
              hiddenSectionCount={hiddenCount}
              contactEnabled={contactEnabled}
              isLoggedIn={!!user}
            />
          )}

          {/* If every section is private, the page would render empty —
              show a minimal "private report" card so the visitor knows it's
              intentional, not broken. */}
          {!anyPublic && (
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
      </>
    )
  }

  // ─────────── OWNER / ADMIN PATH ────────────
  // Existing tab structure (familiar to writers) with:
  //   - PrivacyPanel above the content (collapsible drawer when is_public)
  //   - DetailsView unchanged for admin/owner (sees everything crisp)
  //   - Privacy review banner at top if migration flagged this report
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

        {!isAnonymousSubmission && (
          <div className="flex items-center gap-3 flex-wrap mb-6">
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

        {/* Writer's privacy controls — appear whenever the report is public
            (or was flagged for review) so the owner always has access to
            their driver-seat controls. */}
        {isOwner && (submission.is_public || needsPrivacyReview) && (
          <div className="mb-6">
            {needsPrivacyReview && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl mb-3"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(212,160,23,0.04))',
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
            <PrivacyPanel
              submissionId={submission.id}
              initialPrivacy={privacy}
              initialContactEnabled={contactEnabled}
              isPublic={submission.is_public ?? false}
            />
          </div>
        )}

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

        {locked && isOwner && (() => {
          const designation = scoreDesignation(commercialScore)
          const tierStyle = designation ? DESIGNATION_STYLE[designation] : null
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
              publicViewer={false}
              writerName={writerName}
              evaluationId={id}
              portfolioRank={portfolioRank}
              portfolioTotal={portfolioTotal}
              commercialScore={commercialScore}
              craftNote={craftNote}
            />
          }
        />

        {/* Owner-side contact card — informational "you're reachable" for Pro
            writers, upgrade nudge for free writers. Retained from pre-privacy
            UI so the writer still sees a clear signal about inbound contact. */}
        {!isAnonymousSubmission && isOwner && (
          <div className="mt-10">
            <ContactWriter
              evaluationId={id}
              writerName={writerName}
              state={ownerIsSubscribed ? 'owner_live' : 'owner_upsell'}
              isLoggedIn={true}
            />
          </div>
        )}
      </div>

      {!viewerIsSubscribed && user && (
        <SubscribeGate evaluationId={id} isLoggedIn={true} />
      )}
    </>
  )
}

// ─── Helper components for the non-owner view ────────────────────────

function PublicScoreCard({ score }: { score: number }) {
  const designation = scoreDesignation(score)
  const style = designation ? DESIGNATION_STYLE[designation] : null
  const pct = Math.max(0, Math.min(100, score))
  return (
    <section
      className="relative rounded-2xl p-7 sm:p-8 mb-10 overflow-hidden"
      style={{
        border: `1px solid ${style?.border ?? 'rgba(212,160,23,0.35)'}`,
        background: style?.bg ?? 'rgba(212,160,23,0.05)',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <p
          className="text-[12px] uppercase tracking-[0.22em] font-bold m-0"
          style={{ color: style?.text ?? 'var(--gem-gold)' }}
        >
          Commercial Potential Score
        </p>
        {style && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: style.pillBg, border: `1px solid ${style.pillBorder}` }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: style.dot }}
            />
            <span
              className="text-[12px] uppercase tracking-[0.18em] font-bold"
              style={{ color: style.text }}
            >
              {style.label}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="text-[72px] sm:text-[88px] font-bold tabular-nums leading-none"
          style={{ color: style?.text ?? 'var(--gem-gold)' }}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-[20px] text-[var(--gem-gray-400)] font-medium">/ 100</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--gem-gray-800)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: style?.dot ?? 'var(--gem-gold)' }}
        />
      </div>
    </section>
  )
}

function PublicSharpestLever({
  considerations,
  craftNote,
}: {
  considerations: { area: string; detail: string; is_primary_lever?: boolean }[]
  craftNote: string | null
}) {
  const primary = considerations.find((c) => c.is_primary_lever === true)
  if (!primary && !craftNote) return null
  return (
    <Section label="Sharpest lever" subtitle="The single biggest place to push on the next pass.">
      {primary && (
        <div
          className="rounded-xl p-5 mb-3"
          style={{
            border: '1px solid rgba(220,38,38,0.35)',
            background: 'linear-gradient(135deg, rgba(220,38,38,0.04), #fff 60%)',
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.18em] font-bold m-0 mb-2"
            style={{ color: '#dc2626' }}
          >
            Primary lever
          </p>
          <p className="text-[18px] sm:text-[19px] font-semibold text-[var(--gem-gray-50)] leading-[1.4] m-0 mb-2">
            {primary.area}
          </p>
          <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0">
            {primary.detail}
          </p>
        </div>
      )}
      {craftNote && (
        <div
          className="rounded-xl p-5"
          style={{
            border: '1px solid rgba(5,150,105,0.25)',
            background: 'rgba(5,150,105,0.07)',
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.18em] font-bold m-0 mb-2"
            style={{ color: '#059669' }}
          >
            Craft note
          </p>
          <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0">
            {craftNote}
          </p>
        </div>
      )}
    </Section>
  )
}

function PublicRiskTile({
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

function PublicDimensionRow({
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
          <span className="text-[26px] font-bold tabular-nums" style={{ color: palette.text }}>
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
