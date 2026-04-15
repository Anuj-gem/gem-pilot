// v4 report — positioning-first. No scores or tiers in the Pitch view.
// Pitch tab (public): hook, what makes this special, lead characters.
// Details tab (private to the writer, paid unlock for viewers):
//   production reality, considerations for development, dimension analysis (with X/10).
//
// Gate model — unchanged from v3: blur is driven by the SUBMISSION OWNER's subscription.
//   ownerIsSubscribed  → report is fully unlocked for everyone
//   !ownerIsSubscribed → free tease: pitch hook + headline + 2 strengths; everything else
//                        is blurred behind SectionLock CTAs (pro for logged-in, signup for
//                        anonymous). Owner always sees their own report fully.
//
// Dimension scores are shown as "X/10" in Details. For free viewers they blur to "?/10"
// which is the tease the writer said entices upgrade.
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
import {
  DetailsView,
  SectionHeader,
  LeadCharacterCard,
  LockedLeadCharacterCard,
} from '@/components/report/details-view'
import { normalizeEvaluation } from '@/types'
import type { ScriptEvaluation, ScriptSubmission, GEMEvaluation } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ for?: string }>
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
  const { for: forWriter } = await searchParams
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

  // Gate logic (subscription-only):
  //   Only paying subscribers see full reports. This applies to EVERYONE,
  //   including the writer who uploaded the script — the owner is the highest-
  //   intent conversion target, so we don't give them a free full view of their
  //   own work. Free tier universally = hook + headline + 2 strengths, rest blurred.
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

  // Content blur gate = WRITER's subscription status (not viewer's).
  // Pro writer → report is unblurred for everyone. Free writer → blurred for everyone,
  // including the owner (the owner blur is the upsell pressure).
  const unlocked = ownerIsSubscribed
  const showBlurred = !unlocked
  // Login is required to reach this page, so any locked viewer is a free member.
  const lockVariant: 'signup' | 'pro' | null = showBlurred ? 'pro' : null

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

  // Free tease: first 2 strengths fully visible, remainder locked.
  const allStrengths = whatsSpecial.strengths ?? []
  const visibleStrengths = unlocked ? allStrengths : allStrengths.slice(0, 2)
  const lockedStrengthCount = unlocked ? 0 : Math.max(0, allStrengths.length - 2)

  const positioningHook = report.positioning_hook ?? ''
  const leadCharacters = report.lead_characters ?? []
  const considerations = report.considerations ?? []
  const production = report.production_reality
  const scores = report.scores ?? {}

  // Contact Writer state matrix — gated ONLY by the WRITER's subscription.
  // Anyone (free or paid) can contact a Pro writer. Free writers are not reachable.
  //   - owner on free tier  → owner_upsell  (upgrade to become reachable)
  //   - owner on Pro        → hide (can't message self)
  //   - non-owner, writer Pro  → live (viewer tier doesn't matter)
  //   - non-owner, writer free → writer_not_pro
  let contactState: 'live' | 'owner_upsell' | 'writer_not_pro' | null = null
  if (!isAnonymousSubmission && !!submission.user_id) {
    if (isOwner) {
      contactState = ownerIsSubscribed ? null : 'owner_upsell'
    } else {
      contactState = ownerIsSubscribed ? 'live' : 'writer_not_pro'
    }
  }

  return (
    <>
      <Nav />
      {hasExpiry && !isExpired && (
        <ExpiryCountdown expiresAt={submission.expires_at!} evaluationId={id} />
      )}
      <ReportAnalytics evaluationId={id} isBlurred={showBlurred} />

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
          detailsLocked={!unlocked}
          pitch={
            <>
              {!unlocked && lockVariant && (
                <InlineUpgradeCTA
                  evaluationId={id}
                  label="You're seeing a preview of this report"
                  subtext="Upgrade to read every writer's full pitch and message them directly."
                />
              )}

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
                  {lockedStrengthCount > 0 && (
                    <>
                      {/* Fully blur the entire locked strength — dimension label
                          included. The first 2 visible strengths carry the value
                          proof; leaking more detail weakens the upgrade pressure. */}
                      {allStrengths.slice(2).map((s, i) => (
                        <div
                          key={i}
                          className="border border-[var(--gem-gray-700)] rounded-xl p-5 bg-white select-none"
                          style={{ filter: 'blur(5px)' }}
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
                      {lockVariant && <InlineUpgradeCTA evaluationId={id} />}
                    </>
                  )}
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
                ) : unlocked ? (
                  <div className="space-y-3">
                    {leadCharacters.map((c, i) => (
                      <LeadCharacterCard key={i} c={c} />
                    ))}
                  </div>
                ) : (
                  <>
                    {lockVariant && <InlineUpgradeCTA evaluationId={id} />}
                    <div className="space-y-3">
                      {leadCharacters.map((c, i) => (
                        <LockedLeadCharacterCard key={i} c={c} />
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          }
          details={
            unlocked ? (
              <DetailsView
                scores={scores}
                production={production}
                considerations={considerations}
                overallScore={eval_?.weighted_score ?? null}
                showScores
                locked={false}
              />
            ) : (
              <DetailsView
                scores={scores}
                production={production}
                considerations={considerations}
                overallScore={eval_?.weighted_score ?? null}
                showScores={false}
                locked={true}
                evaluationId={id}
              />
            )
          }
        />
      </div>

      {showBlurred && user && <SubscribeGate evaluationId={id} isLoggedIn={true} />}
    </>
  )
}
