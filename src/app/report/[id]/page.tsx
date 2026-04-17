// v5 report — positioning-first. No scores or tiers in the Pitch view.
// Pitch tab (public): hook, what makes this special, lead characters.
// Details tab (private to the writer): production reality, considerations, dimension analysis.
//
// Gate model (v6): NO BLUR. Every report is fully visible to everyone.
// Paywall on: 2nd+ submission, Discover publishing, and contact/reachability.
// Free users see the full report to get wowed, then hit upgrade when they try to publish or get contacted.
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { InlineSignup } from '@/components/report/inline-signup'
// InlineUpgradeCTA repurposed for "submit more scripts" messaging
import { InlineUpgradeCTA } from '@/components/report/inline-upgrade-cta'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { PrivateDemoBanner } from '@/components/report/private-demo-banner'
import { ReportTabs } from '@/components/report/report-tabs'
import { ContactWriter } from '@/components/report/contact-writer'
import { PostUpgradeEmail } from '@/components/report/post-upgrade-email'
import { LockedReportUpgrade } from '@/components/report/locked-report-upgrade'
import {
  DetailsView,
  SectionHeader,
  LeadCharacterCard,
} from '@/components/report/details-view'
import { normalizeEvaluation } from '@/types'
import type { ScriptEvaluation, ScriptSubmission, GEMEvaluation } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ for?: string; subscribed?: string }>
}

// v4-specific fields that aren't in the shared GEMEvaluation type yet.
interface V4Extras {
  positioning_hook?: string
  lead_characters?: {
    name: string
    role_type: string
    demographics: string
    hook: string
    why_actor_wants_this: string
  }[]
  considerations?: { area: string; detail: string; source?: string }[]
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

  // Preview-only override: if USE_PENDING_EVALS=1 is set on this deployment
  // (positioning-rebuild preview), swap the evaluation payload (score, tier,
  // report JSON) with the rescored v4 row from script_evaluations_pending
  // matched by submission_id. Falls through silently if no pending row exists.
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

  const report = eval_.evaluation as GEMEvaluation & V4Extras
  const submission = eval_.script_submissions
  const isOwner = user?.id === submission.user_id
  const isAnonymousSubmission = !submission.user_id
  const hasExpiry = isAnonymousSubmission && !!submission.expires_at
  const isExpired = hasExpiry && new Date(submission.expires_at!) < new Date()
  const writerName = submission.profiles?.full_name ?? 'the writer'

  const { classification, whatsSpecial } = normalizeEvaluation(report)

  // Gate logic (v5): NO BLUR. Every report is fully visible.
  // Paywall lives on /submit (blocks 2nd+ submission for free users).
  // We still check subscription status for upgrade CTA display and contact gating.
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

  // v5: all reports fully unlocked — no blur
  const unlocked = true
  const showUpgradeCTA = !viewerIsSubscribed && !!user

  // Paywall gate: owner's 2nd+ report is locked until they subscribe.
  // We check if this submission is NOT the owner's first completed eval.
  let reportLocked = false
  if (isOwner && !ownerIsSubscribed && submission.user_id) {
    // Find the user's earliest completed submission
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

  // v5: all strengths visible — no locked tease
  const allStrengths = whatsSpecial.strengths ?? []
  const visibleStrengths = allStrengths

  const positioningHook = report.positioning_hook ?? ''
  const leadCharacters = report.lead_characters ?? []
  const considerations = report.considerations ?? []
  const production = report.production_reality
  const scores = report.scores ?? {}

  // Contact Writer — gated by writer's Pro subscription.
  //   - owner + subscribed → owner_live (shows "you're reachable")
  //   - owner + free → owner_upsell (shows "upgrade to become reachable")
  //   - non-owner + writer subscribed → live (can message)
  //   - non-owner + writer NOT subscribed → writer_not_pro
  //   - anonymous submission → no contact
  let contactState: 'live' | 'owner_upsell' | 'owner_live' | 'writer_not_pro' | null = null
  if (!isAnonymousSubmission && !!submission.user_id) {
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
          {/* Portfolio Rank — the conversion hook for 2nd+ locked report */}
          {portfolioRank !== null && portfolioTotal > 0 && (
            <div
              className="relative border border-[var(--gem-gray-700)] rounded-2xl p-6 sm:p-7 mb-6 text-left"
              style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), transparent 60%)' }}
            >
              <div
                aria-hidden
                className="absolute left-0 top-5 bottom-5 rounded-r"
                style={{ width: 3, background: 'var(--gem-gold)' }}
              />
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)] mb-3">
                Portfolio Rank
              </div>
              {portfolioTotal === 1 ? (
                <p className="text-xl sm:text-[22px] text-[var(--gem-white)] leading-snug font-medium">
                  GEM ranks this the <span className="text-[var(--gem-gold)]">#1</span> script in your portfolio.
                </p>
              ) : (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-5xl sm:text-6xl font-bold text-[var(--gem-white)] leading-none">
                    #{portfolioRank}
                  </span>
                  <span className="text-sm text-[var(--gem-gray-400)]">
                    of {portfolioTotal} in your portfolio
                  </span>
                </div>
              )}
            </div>
          )}

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
              The Pitch
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24 space-y-8">
        {forWriter && <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />}

        {isAnonymousSubmission && (
          <div id="inline-signup" className="rounded-xl transition-shadow duration-500">
            <InlineSignup submissionId={submission.id} evaluationId={id} />
          </div>
        )}

        {!isAnonymousSubmission && (
          <div className="flex items-center gap-3 flex-wrap">
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

        {/* Portfolio Rank — owner-only, personal positioning signal */}
        {portfolioRank !== null && portfolioTotal > 0 && (
          <div
            className="relative border border-[var(--gem-gray-700)] rounded-2xl p-6 sm:p-7"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent 60%)' }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-5 bottom-5 rounded-r"
              style={{ width: 3, background: 'var(--gem-gold)' }}
            />
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)] mb-3">
              Portfolio Rank
            </div>
            {portfolioTotal === 1 ? (
              <p className="text-xl sm:text-[22px] text-[var(--gem-white)] leading-snug font-medium">
                GEM ranks this the <span className="text-[var(--gem-gold)]">#1</span> script in your portfolio.
              </p>
            ) : (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-5xl sm:text-6xl font-bold text-[var(--gem-white)] leading-none">
                  #{portfolioRank}
                </span>
                <span className="text-sm text-[var(--gem-gray-400)]">
                  of {portfolioTotal} in your portfolio
                </span>
              </div>
            )}
            <p className="text-xs text-[var(--gem-gray-500)] mt-3 leading-relaxed">
              <Link
                href="/submit"
                className="text-[var(--gem-gray-300)] underline underline-offset-2 decoration-[var(--gem-gray-600)] hover:decoration-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
              >
                Submit another script
              </Link>{' '}
              to see how it compares.
            </p>
          </div>
        )}

        {/* Title + meta */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--gem-white)] tracking-tight leading-tight mb-3">
            {submission.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--gem-gray-400)]">
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
                className="px-2.5 py-0.5 rounded-full text-xs text-[var(--gem-gray-400)] border border-[var(--gem-gray-700)]"
              >
                {t}
              </span>
            ))}
            {classification.tone && (
              <>
                <span className="text-[var(--gem-gray-500)]">·</span>
                <span className="italic text-[var(--gem-gray-500)]">{classification.tone}</span>
              </>
            )}
            {submission.created_at && (
              <>
                <span className="text-[var(--gem-gray-500)]">·</span>
                <span className="text-[var(--gem-gray-500)]">
                  Posted {new Date(submission.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Positioning hook — always visible */}
        {positioningHook && (
          <div
            className="relative border border-[var(--gem-gray-700)] rounded-2xl p-7 sm:p-8"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent 60%)' }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-5 bottom-5 rounded-r"
              style={{ width: 3, background: 'var(--gem-gold)' }}
            />
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)] mb-3">
              The Pitch
            </div>
            <p className="text-xl sm:text-[22px] text-[var(--gem-white)] leading-snug font-medium">
              {positioningHook}
            </p>
          </div>
        )}

        {/* Contact writer — live / upsell / writer-not-pro depending on state */}
        {contactState && (
          <ContactWriter
            evaluationId={id}
            writerName={writerName}
            state={contactState}
            isLoggedIn={!!user}
          />
        )}

        <ReportTabs
          showDetails={isOwner}
          detailsLocked={false}
          pitch={
            <>
              {/* What Makes This Special */}
              <section className="mb-12">
                <SectionHeader label="What Makes This Special" />
                {whatsSpecial.headline && (
                  <p className="text-base sm:text-lg text-[var(--gem-gray-200)] leading-relaxed mb-6">
                    {whatsSpecial.headline}
                  </p>
                )}
                <div className="space-y-3">
                  {visibleStrengths.map((s, i) => (
                    <div
                      key={i}
                      className="border border-[var(--gem-gray-700)] rounded-xl p-5 bg-white"
                    >
                      <p className="text-[15px] font-semibold text-[var(--gem-white)] mb-2">
                        {s.dimension_or_area}
                      </p>
                      <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed mb-2">
                        {s.what_it_means}
                      </p>
                      {s.evidence && (
                        <p className="text-[13px] text-[var(--gem-gray-500)] italic leading-relaxed">
                          {s.evidence}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Lead Characters */}
              <section className="mb-12">
                <SectionHeader label="Lead Characters" />
                <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
                  The parts inside this script and why an actor would chase them.
                </p>
                {leadCharacters.length === 0 ? (
                  <p className="text-sm text-[var(--gem-gray-500)] italic">
                    No lead character breakdown available for this report.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {leadCharacters.map((c, i) => (
                      <LeadCharacterCard key={i} c={c} />
                    ))}
                  </div>
                )}
              </section>

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
              overallScore={eval_?.weighted_score ?? null}
              showScores
              locked={false}
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
