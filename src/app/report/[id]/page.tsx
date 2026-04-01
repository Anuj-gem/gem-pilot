import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import { ReportHeader } from '@/components/report/report-header'
import { ScoreCard } from '@/components/report/score-card'
import { DevelopmentAssessment } from '@/components/report/development-assessment'
import { ProductionReality } from '@/components/report/production-reality'
import { OverallTake } from '@/components/report/overall-take'
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
import { UpgradeBanner } from '@/components/report/upgrade-banner'
import type { ScriptEvaluation, ScriptSubmission } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch evaluation with submission info
  const { data: evaluation, error } = await supabase
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
      profiles: { full_name: string; avatar_url: string | null }
    }
  }

  const report = eval_.evaluation
  const submission = eval_.script_submissions
  const isOwner = user?.id === submission.user_id

  // Get like count and whether current user has liked
  const { count: likeCount } = await supabase
    .from('script_likes')
    .select('*', { count: 'exact', head: true })
    .eq('evaluation_id', id)

  let userLiked = false
  let showUpgradeBanner = false
  if (user) {
    const { data: existingLike } = await supabase
      .from('script_likes')
      .select('id')
      .eq('evaluation_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    userLiked = !!existingLike

    // Check if user needs upgrade prompt (used free eval, not subscribed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, free_eval_used')
      .eq('id', user.id)
      .single()

    if (profile) {
      const isSubscribed = profile.subscription_status === 'active'
      const freeEvalUsed = profile.free_eval_used === true
      showUpgradeBanner = freeEvalUsed && !isSubscribed
    }
  }

  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Owner controls + like */}
        <div className="flex items-center gap-3 flex-wrap">
          {isOwner && (
            <VisibilityToggle
              submissionId={submission.id}
              initialPublic={submission.is_public ?? false}
            />
          )}
          <LikeButton
            evaluationId={id}
            initialLiked={userLiked}
            initialCount={likeCount ?? 0}
          />
        </div>

        {/* Header: title, tier, weighted score */}
        <ReportHeader
          title={submission.title}
          author={submission.profiles?.full_name ?? 'Anonymous'}
          tier={eval_.tier}
          weightedScore={eval_.weighted_score}
          format={report.format_detection.format}
          genre={report.format_detection.genre_primary}
          genreTags={report.format_detection.genre_tags}
          tone={report.format_detection.tone}
          comparables={report.format_detection.comparables}
          createdAt={eval_.created_at}
        />

        {/* Overall Take — the most important section */}
        <OverallTake take={report.development_assessment.overall_take} />

        {/* Score Card — 5 dimensions */}
        <ScoreCard scores={report.scores} weightedScore={eval_.weighted_score} />

        {/* Development Assessment — what's working, what's hurting */}
        <DevelopmentAssessment assessment={report.development_assessment} />

        {/* Production Reality Check */}
        <ProductionReality production={report.production_reality} />
      </div>

      {/* Timed upgrade prompt for free-tier users */}
      {showUpgradeBanner && <UpgradeBanner delayMs={60000} />}
    </>
  )
}
