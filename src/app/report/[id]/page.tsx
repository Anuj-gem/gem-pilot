// v5 report — positioning-first. No scores or tiers in the Pitch view.
// Pitch tab (public): hook, what makes this special (collapsibles), lead
// characters (collapsibles), package angles (director + buyer).
// Details tab (private to the writer): GEM Rank, At a Glance risk pills,
// development priorities, production planning details, narrative analysis
// details. All cards are collapsibles.
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
import { ContactWriter } from '@/components/report/contact-writer'
import { PostUpgradeEmail } from '@/components/report/post-upgrade-email'
import { LockedReportUpgrade } from '@/components/report/locked-report-upgrade'
import { DetailsView } from '@/components/report/details-view'
import { Section, Collapsible } from '@/components/report/v5-components'
import { normalizeEvaluation, calculateWeightedScore } from '@/types'
import type { ScriptEvaluation, ScriptSubmission, GEMEvaluation, DimensionId } from '@/types'

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
        id, user_id, title, filename, file_size, status, is_public, created_at, expires_at,
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
  const isAnonymousSubmission = !submission.user_id
  const hasExpiry = isAnonymousSubmission && !!submission.expires_at
  const isExpired = hasExpiry && new Date(submission.expires_at!) < new Date()
  const writerName = submission.profiles?.full_name ?? 'the writer'

  const { classification, whatsSpecial } = normalizeEvaluation(report)

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

  // Paywall gate: owner's 2nd+ report is locked until they subscribe.
  let reportLocked = false
  if (isOwner && !ownerIsSubscribed && submission.user_id) {
    const { data: firstSub } = await serviceClient
      .from('script_submissions')
      .select('id')
      .eq('user_id', submission.user_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (firstSub && firstSub.id !== submission.id) {
      reportLocked = true
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

  const positioningHook = report.positioning_hook ?? ''
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
  // Designation: GEM Select at 75+, Promising at 50–74 (private to the writer
   // — Promising is never a public surface, only shown on their own report).
  const isGemSelect = commercialScore !== null && commercialScore >= 75
  const isPromising =
    commercialScore !== null && commercialScore >= 50 && commercialScore < 75

  // Contact Writer gating:
  //   - hidden entirely when the script is NOT public on Discover
  //   - when public + writer Pro: live (non-owner) / owner_live (owner)
  //   - when public + writer free: writer_not_pro (non-owner) / owner_upsell (owner)
  //   - anonymous submission → no contact
  let contactState: 'live' | 'owner_upsell' | 'owner_live' | 'writer_not_pro' | null = null
  if (!isAnonymousSubmission && !!submission.user_id && submission.is_public) {
    if (isOwner) {
      contactState = ownerIsSubscribed ? 'owner_live' : 'owner_upsell'
    } else {
      contactState = ownerIsSubscribed ? 'live' : 'writer_not_pro'
    }
  }

  // Locked report — owner's 2nd+ eval, not subscribed. Show paywall page.
  if (reportLocked) {
    return (
      <>
        <Nav />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div
            className="relative border border-[var(--gem-gray-700)] rounded-2xl p-7 sm:p-8 mb-8"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent 60%)' }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-5 bottom-5 rounded-r"
              style={{ width: 3, background: 'var(--gem-gold)' }}
            />
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)] mb-3">
              Pitch
            </div>
            <p className="text-xl sm:text-[22px] text-[var(--gem-white)] leading-snug font-medium">
              {report.positioning_hook || submission.title}
            </p>
          </div>

          <h2 className="text-2xl font-bold text-[var(--gem-white)] mb-3">
            Your report on <em>{submission.title}</em> is ready
          </h2>
          <p className="text-sm text-[var(--gem-gray-400)] mb-8 max-w-md mx-auto leading-relaxed">
            Your first evaluation was on us. Go Pro to read this report and evaluate unlimited scripts going forward.
          </p>

          <LockedReportUpgrade evaluationId={id} />

          <p className="text-[11px] text-[var(--gem-gray-500)] mt-3">
            Cancel anytime · Secure checkout via Stripe
          </p>
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
          </div>
        )}

        {/* Title + classification */}
        <h1 className="text-[36px] sm:text-[44px] font-semibold text-[var(--gem-gray-50)] tracking-tight leading-[1.1] mb-4">
          {submission.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-[var(--gem-gray-300)] mb-10">
          {classification.format && <span>{classification.format}</span>}
          {classification.genre_primary && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span>{classification.genre_primary}</span>
            </>
          )}
          {classification.genre_tags?.map((t, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-[13px] text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)]"
            >
              {t}
            </span>
          ))}
          {classification.tone && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span className="italic text-[var(--gem-gray-400)]">{classification.tone}</span>
            </>
          )}
          {submission.created_at && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span className="text-[var(--gem-gray-500)]">
                Posted{' '}
                {new Date(submission.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </>
          )}
        </div>

        {/* Logline hero — always visible */}
        {positioningHook && (
          <div
            className="relative rounded-2xl p-8 sm:p-10 mb-12"
            style={{
              background: 'linear-gradient(135deg, rgba(200,164,92,0.10), transparent 70%)',
              border: '1px solid rgba(200,164,92,0.25)',
            }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-7 bottom-7 rounded-r"
              style={{ width: 5, background: 'var(--gem-gold)' }}
            />
            <div
              className="text-[14px] uppercase tracking-[0.22em] font-bold mb-4"
              style={{ color: 'var(--gem-gold)' }}
            >
              Logline
            </div>
            <p className="text-[26px] sm:text-[30px] text-[var(--gem-gray-50)] leading-[1.3] font-medium m-0">
              {positioningHook}
            </p>
          </div>
        )}

        {/* Contact writer — only when script is public on Discover */}
        {contactState && (
          <div className="mb-10">
            <ContactWriter
              evaluationId={id}
              writerName={writerName}
              state={contactState}
              isLoggedIn={!!user}
            />
          </div>
        )}

        <ReportTabs
          showDetails={isOwner}
          detailsLocked={false}
          pitch={
            <>
              {/* What's Working — numbered collapsibles with evidence sidebar */}
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

              {/* Package Angles — who would direct this, and who would buy it */}
              {packageAngles && (
                <Section
                  label="Package Angles"
                  subtitle="Who would direct this, and who would buy it."
                >
                  <div className="space-y-3">
                    <Collapsible title="Why a director wants this" accent="#059669">
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

              {/* Soft upgrade CTA for non-subscribers */}
              {showUpgradeCTA && (
                <InlineUpgradeCTA
                  evaluationId={id}
                  label="Ready to get in front of producers?"
                  subtext="Go Pro to publish on Discover, let reps contact you, and evaluate unlimited scripts."
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
              locked={false}
              portfolioRank={portfolioRank}
              portfolioTotal={portfolioTotal}
              commercialScore={commercialScore}
              isGemSelect={isGemSelect}
              isPromising={isPromising}
              craftNote={craftNote}
            />
          }
        />
      </div>

      {/* SubscribeGate still available if triggered by upgrade CTA click */}
      {!viewerIsSubscribed && user && (
        <SubscribeGate evaluationId={id} isLoggedIn={true} />
      )}
    </>
  )
}
