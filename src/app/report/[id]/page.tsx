import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import { ReportHeader } from '@/components/report/report-header'
import { ScoreCard } from '@/components/report/score-card'
import { DevelopmentAssessment } from '@/components/report/development-assessment'
import { ProductionReality } from '@/components/report/production-reality'
import { OverallTake } from '@/components/report/overall-take'
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
import { BlurredSection } from '@/components/report/blurred-section'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ReportAnalytics } from '@/components/report/report-analytics'
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
        id, user_id, title, filename, file_size, status, is_public, created_at,
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

  // Determine if user can see full report
  let isSubscribed = false
  if (user) {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    isSubscribed = profile?.subscription_status === 'active'
  }

  const showBlurred = !isSubscribed

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
      <ReportAnalytics evaluationId={id} isBlurred={showBlurred} />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Owner controls + like (only for authenticated non-anonymous submissions) */}
        {!isAnonymousSubmission && (
          <div className="flex items-center gap-3 flex-wrap">
            {isOwner && isSubscribed && (
              <VisibilityToggle
                submissionId={submission.id}
                initialPublic={submission.is_public ?? false}
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

        {/* Header: title, tier, weighted score — ALWAYS VISIBLE */}
        <ReportHeader
          title={submission.title}
          author={submission.profiles?.full_name ?? 'Anonymous'}
          tier={eval_.tier}
          weightedScore={eval_.weighted_score}
          format={report.format_detection.format}
          genre={report.format_detection.genre_primary}
          genreTags={report.format_detection.genre_tags}
          tone={report.format_detection.tone}
          comparables={showBlurred ? [] : report.format_detection.comparables}
          createdAt={eval_.created_at}
        />

        {/* Report sections — blurred for non-subscribers */}
        {showBlurred ? (
          <>
            <BlurredSection sectionLabel="The Overall Take">
              <OverallTake take={report.development_assessment.overall_take} />
            </BlurredSection>

            <BlurredSection sectionLabel="Score Breakdown">
              <ScoreCard scores={report.scores} weightedScore={eval_.weighted_score} />
            </BlurredSection>

            <BlurredSection sectionLabel="Development Assessment">
              <DevelopmentAssessment assessment={report.development_assessment} />
            </BlurredSection>

            <BlurredSection sectionLabel="Production Reality">
              <ProductionReality production={report.production_reality} />
            </BlurredSection>
          </>
        ) : (
          <>
            <OverallTake take={report.development_assessment.overall_take} />
            <ScoreCard scores={report.scores} weightedScore={eval_.weighted_score} />
            <DevelopmentAssessment assessment={report.development_assessment} />
            <ProductionReality production={report.production_reality} />
          </>
        )}
      </div>

      {/* Sticky subscribe CTA for non-subscribers */}
      {showBlurred && (
        <SubscribeGate evaluationId={id} isLoggedIn={!!user} />
      )}
    </>
  )
}
