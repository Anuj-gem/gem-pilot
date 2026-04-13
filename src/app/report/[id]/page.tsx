import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound, redirect } from 'next/navigation'
import Nav from '@/components/nav'
import { ReportHeader } from '@/components/report/report-header'
import { ScoreCard } from '@/components/report/score-card'
import { WhatsSpecialSection } from '@/components/report/whats-special'
import { WhatsHoldingItBackSection } from '@/components/report/whats-holding-it-back'
// ProductionReality is now rendered inside WhatsHoldingItBackSection
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
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
  const isPublicSubmission = submission.is_public === true

  // Gate: anonymous (unclaimed) reports are not viewable by anyone who isn't
  // logged in. This forces the signup-during-eval flow and prevents people
  // from sharing raw anon-eval links to bypass account creation.
  // Logged-in users viewing an anon report still see it (e.g., admin/testing).
  if (isAnonymousSubmission && !user) {
    redirect(`/login?redirect=${encodeURIComponent(`/report/${id}`)}`)
  }

  // Gate: private reports (not public) are only viewable by the owner or
  // anyone logged in. (Non-owners get login wall.)
  if (!isAnonymousSubmission && !isPublicSubmission && !user) {
    redirect(`/login?redirect=${encodeURIComponent(`/report/${id}`)}`)
  }

  // Normalize v2/v3 evaluation shape
  const { classification, whatsSpecial, whatsHoldingItBack } = normalizeEvaluation(report)

  // Reports are now fully visible to all viewers — no blur. The paywall lives
  // at submission time (3rd+ eval requires GEM Pro). UpgradeCard is shown to
  // non-subscriber owners as a soft upsell, with messaging tuned to where they
  // are in the 2-free-evals lifecycle.
  let ownerIsSubscribed = false
  let ownerEvalCount = 0
  if (submission.user_id) {
    const { data: ownerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', submission.user_id)
      .single()

    ownerIsSubscribed = ownerProfile?.subscription_status === 'active'

    if (!ownerIsSubscribed) {
      const { count } = await serviceClient
        .from('script_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', submission.user_id)
      ownerEvalCount = count ?? 0
    }
  }

  // Show upgrade CTA to non-subscriber owners viewing their own report.
  const showUpgradeCta = isOwner && !ownerIsSubscribed && !isAnonymousSubmission

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
      <ReportAnalytics evaluationId={id} isBlurred={false} />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
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

        {/* Full report — no blur. Everyone who can see this page sees it fully. */}
        <WhatsSpecialSection
          data={whatsSpecial}
          blurred={false}
          fullBlur={false}
        />

        <WhatsHoldingItBackSection
          data={whatsHoldingItBack}
          blurred={false}
          fullBlur={false}
          production={report.production_reality}
        />
        <ScoreCard
          scores={report.scores}
          weightedScore={eval_.weighted_score}
          blurred={false}
          fullBlur={false}
        />

        {/* Upgrade nudge — shown to non-subscriber owners. Copy adapts to where
            they are in the 2-free-evals lifecycle. */}
        {showUpgradeCta && (
          <UpgradeCard
            evaluationId={id}
            isLoggedIn={!!user}
            evalsUsed={ownerEvalCount}
          />
        )}

        {/* Got another script? Push a 2nd eval to non-subscriber owners who still have one left. */}
        {showUpgradeCta && ownerEvalCount < 2 && (
          <SubmitCta
            isLoggedIn={!!user}
            submissionId={submission.id}
            evaluationId={id}
            isAnonymousSubmission={isAnonymousSubmission}
          />
        )}
      </div>

      {/* Sticky bottom bar — persistent CTA for non-subscriber owners */}
      {showUpgradeCta && (
        <StickyBottomBar evaluationId={id} isLoggedIn={!!user} />
      )}
    </>
  )
}
