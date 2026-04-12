import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import { ReportHeader } from '@/components/report/report-header'
import { ScoreCard } from '@/components/report/score-card'
import { WhatsSpecialSection } from '@/components/report/whats-special'
import { WhatsHoldingItBackSection } from '@/components/report/whats-holding-it-back'
// ProductionReality is now rendered inside WhatsHoldingItBackSection
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { UpgradeCard } from '@/components/report/upgrade-card'
import { StickyBottomBar } from '@/components/report/sticky-bottom-bar'
import { SubmitCta } from '@/components/report/submit-cta'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { PrivateDemoBanner } from '@/components/report/private-demo-banner'
import { normalizeEvaluation } from '@/types'
import type { ScriptEvaluation, ScriptSubmission } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ for?: string }>
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

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { for: forWriter } = await searchParams
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
  // Free viewers see: score + verdict + What's Good headline (visible),
  // strength details + What to Address + Story Analysis (fully blurred).
  // Primary CTA pushes 2nd eval submission, secondary CTA pushes upgrade.
  const fullBlur = showBlurred

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
      <div className={`max-w-3xl mx-auto px-4 py-8 space-y-8 ${showBlurred ? 'pb-32' : ''}`}>
        {/* Private demo banner — shown when ?for=Writer+Name is present in the URL */}
        {forWriter && (
          <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />
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

        {/* Header: title, tier, weighted score, tags.
            Score + verdict are now VISIBLE to all users (free and paid). */}
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
          blurred={false}
        />

        {/* What's Special — headline always visible, strength details blurred for free */}
        <WhatsSpecialSection
          data={whatsSpecial}
          blurred={showBlurred}
          fullBlur={false}
        />

        {/* Primary CTA for free viewers: submit another script.
            Anonymous → create account first, then redirect to dashboard.
            Logged-in free → go to /submit. */}
        {showBlurred && (
          <SubmitCta
            isLoggedIn={!!user}
            submissionId={submission.id}
            evaluationId={id}
            isAnonymousSubmission={isAnonymousSubmission}
          />
        )}

        {/* Everything below is fully blurred for free users */}
        <WhatsHoldingItBackSection
          data={whatsHoldingItBack}
          blurred={false}
          fullBlur={fullBlur}
          production={report.production_reality}
        />
        <ScoreCard
          scores={report.scores}
          weightedScore={eval_.weighted_score}
          blurred={false}
          fullBlur={fullBlur}
        />

        {/* Secondary CTA: upgrade card — shown after blurred content */}
        {showBlurred && (
          <UpgradeCard evaluationId={id} isLoggedIn={!!user} />
        )}
      </div>

      {/* Sticky bottom bar — persistent upgrade CTA for all free viewers */}
      {showBlurred && (
        <StickyBottomBar evaluationId={id} isLoggedIn={!!user} />
      )}
    </>
  )
}
