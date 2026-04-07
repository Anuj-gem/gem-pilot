import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import { ReportHeader } from '@/components/report/report-header'
import { ScoreCard } from '@/components/report/score-card'
import { WhatsSpecialSection } from '@/components/report/whats-special'
import { WhatsHoldingItBackSection } from '@/components/report/whats-holding-it-back'
import { ProductionReality } from '@/components/report/production-reality'
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { InlineSignup } from '@/components/report/inline-signup'
import { SectionLock } from '@/components/report/section-lock'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { normalizeEvaluation } from '@/types'
import type { ScriptEvaluation, ScriptSubmission } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

// Service client for reading anonymous submissions
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

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use service client to fetch evaluation (works for anonymous submissions too)
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

  if (error || !evaluation) {
    notFound()
  }

  const eval_ = evaluation as ScriptEvaluation & {
    script_submissions: ScriptSubmission & {
      profiles: { full_name: string; avatar_url: string | null } | null
    }
  }

  const report = eval_.evaluation
  const submission = eval_.script_submissions
  const isOwner = user?.id === submission.user_id
  const isAnonymousSubmission = !submission.user_id
  const hasExpiry = isAnonymousSubmission && !!submission.expires_at
  const isExpired = hasExpiry && new Date(submission.expires_at!) < new Date()

  // Normalize v2/v3 evaluation shape
  const { classification, whatsSpecial, whatsHoldingItBack } = normalizeEvaluation(report)

  // Determine blur: based on the submission OWNER's subscription, not the viewer's.
  // If the owner is subscribed and the post is public, everyone sees it fully.
  // If the owner is NOT subscribed (or cancelled), the report is blurred for everyone
  // except the owner themselves seeing their own score/tier (header is always visible).
  let ownerIsSubscribed = false
  if (submission.user_id) {
    const { data: ownerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', submission.user_id)
      .single()

    ownerIsSubscribed = ownerProfile?.subscription_status === 'active'
  }

  const isPublicPost = submission.is_public === true
  // Show full report if: owner is subscribed, OR post is public (which requires subscription to toggle on)
  // Blur if: owner is NOT subscribed AND post is NOT public
  const showBlurred = !ownerIsSubscribed && !isPublicPost
  // Anonymous viewers (not logged in) get the ORIGINAL full blur — selective blur was
  // leaking enough value that people were bouncing instead of signing up. Logged-in free
  // viewers keep the current selective blur (teaser first sentence + dimension labels).
  const fullBlur = showBlurred && !user

  // Get like count and whether current user has liked
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

  return (
    <>
      <Nav />
      {hasExpiry && !isExpired && (
        <ExpiryCountdown expiresAt={submission.expires_at!} evaluationId={id} />
      )}
      <ReportAnalytics evaluationId={id} isBlurred={showBlurred} />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Inline signup for anonymous users — right at the top, before the report.
            id="inline-signup" is the scroll target for per-section lock CTAs below. */}
        {isAnonymousSubmission && (
          <div id="inline-signup" className="rounded-xl transition-shadow duration-500">
            <InlineSignup submissionId={submission.id} evaluationId={id} />
          </div>
        )}

        {/* Owner controls + like (only for authenticated non-anonymous submissions) */}
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

        {/* Header: title, tier, weighted score, tags */}
        <ReportHeader
          title={submission.title}
          author={submission.profiles?.full_name ?? 'Anonymous'}
          tier={eval_.tier}
          weightedScore={eval_.weighted_score}
          format={classification.format}
          genre={classification.genre_primary}
          genreTags={classification.genre_tags}
          tone={classification.tone}
          createdAt={eval_.created_at}
          isOwner={isOwner}
        />

        {/* Report sections.
            - fullBlur (anonymous viewer): each component renders its card chrome and
              header clearly but fully blurs its body. Centered lock CTA overlay.
            - showBlurred && user (logged-in free): components handle selective blur
              internally. Centered lock CTA overlay.
            - Otherwise (owner / subscribed / public): rendered normally, no overlay.
         */}
        {(() => {
          const lockVariant: 'signup' | 'pro' | null = fullBlur
            ? 'signup'
            : showBlurred && user
              ? 'pro'
              : null

          const wrap = (node: React.ReactNode, key: string) => (
            <div key={key} className="relative">
              {node}
              {lockVariant && (
                <SectionLock variant={lockVariant} evaluationId={id} position="center" />
              )}
            </div>
          )

          return (
            <>
              {wrap(
                <WhatsSpecialSection
                  data={whatsSpecial}
                  blurred={showBlurred && !fullBlur}
                  fullBlur={fullBlur}
                />,
                'special'
              )}
              {wrap(
                <WhatsHoldingItBackSection
                  data={whatsHoldingItBack}
                  blurred={showBlurred && !fullBlur}
                  fullBlur={fullBlur}
                />,
                'holding'
              )}
              {wrap(
                <ScoreCard
                  scores={report.scores}
                  weightedScore={eval_.weighted_score}
                  blurred={showBlurred && !fullBlur}
                  fullBlur={fullBlur}
                />,
                'scores'
              )}
              {wrap(
                <ProductionReality
                  production={report.production_reality}
                  blurred={showBlurred && !fullBlur}
                  fullBlur={fullBlur}
                />,
                'production'
              )}
            </>
          )
        })()}
      </div>

      {/* Subscribe overlay — only for logged-in free users, not anonymous */}
      {showBlurred && user && (
        <SubscribeGate evaluationId={id} isLoggedIn={true} />
      )}
    </>
  )
}
