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

  // Normalize v2/v3 evaluation shape
  const { classification, comparables, whatsSpecial, whatsHoldingItBack } = normalizeEvaluation(report)

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

  // Public leaderboard posts are always fully visible.
  // Blur only applies to the viewer's own non-subscribed evaluations.
  const isPublicPost = submission.is_public === true
  const showBlurred = !isSubscribed && !isPublicPost

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

        {/* Header: title, tier, weighted score, tags, comparables */}
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
        />

        {/* What Makes This Special */}
        <WhatsSpecialSection data={whatsSpecial} blurred={showBlurred} />

        {/* What Needs Development */}
        <WhatsHoldingItBackSection data={whatsHoldingItBack} blurred={showBlurred} />

        {/* Story Analysis (10 dimension scores) */}
        <ScoreCard scores={report.scores} weightedScore={eval_.weighted_score} blurred={showBlurred} />

        {/* Production Reality */}
        <ProductionReality production={report.production_reality} blurred={showBlurred} />

        {/* Comparables (moved from header to bottom) */}
        {comparables && comparables.length > 0 && (
          <div className={`p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]${showBlurred ? ' blur-sm select-none' : ''}`}>
            <h2 className="text-xs uppercase tracking-widest text-[var(--gem-gray-400)] mb-4">
              Comparables
            </h2>
            <div className="space-y-3">
              {comparables.map((comp: any, i: number) => (
                <div key={i}>
                  <span className="text-sm font-medium text-[var(--gem-white)]">{comp.title}</span>
                  {(comp.similarity_note || comp.why) && (
                    <span className="text-sm text-[var(--gem-gray-400)]"> — {comp.similarity_note || comp.why}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky subscribe CTA for non-subscribers */}
      {showBlurred && (
        <SubscribeGate evaluationId={id} isLoggedIn={!!user} />
      )}
    </>
  )
}
