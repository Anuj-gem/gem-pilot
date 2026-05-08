// /review/c/[id] — Detail page for a single portfolio review.
// Uses /review/c/[id] (not /review/[id]) to avoid conflict with
// the peer review route at /app/review/[id].

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ReviewDetail } from '@/components/review/review-detail'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReviewDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/review/c/${id}`)

  const service = svc()

  // Fetch the specific consideration
  const { data: consideration } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, next_steps, writer_id')
    .eq('id', id)
    .single()

  if (!consideration || consideration.writer_id !== user.id) notFound()

  // Figure out the review number (chronological, oldest = #1)
  const { data: allConsiderations } = await service
    .from('considerations')
    .select('id, submitted_at')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: true })

  const reviewNumber = ((allConsiderations || []).findIndex(c => c.id === id) + 1) || 1

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, handle, headline, bio, avatar_url')
    .eq('id', user.id)
    .single()

  // Scripts in this consideration
  const { data: cs } = await service
    .from('consideration_scripts')
    .select('script_submission_id')
    .eq('consideration_id', id)

  const scriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)

  type SubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; tags: string[] | null
  }

  let scripts: {
    id: string; title: string; format: string | null
    score: number | null; evaluationId: string | null
    headline: string | null; tags: string[]; createdAt: string
  }[] = []

  if (scriptIds.length > 0) {
    const { data: rawSubs } = await service
      .from('script_submissions')
      .select('id, title, status, declared_format, created_at, hidden_at, tags')
      .in('id', scriptIds)

    const subs = (rawSubs || []) as SubRow[]

    // Evaluations
    type EvalData = {
      id: string; submission_id: string; weighted_score: number | null
      edited_fields: { logline?: string } | null
      evaluation: { positioning_hook?: string } | null
    }
    const { data: evals } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, edited_fields, evaluation')
      .in('submission_id', scriptIds)

    const evalMap = new Map<string, EvalData>()
    for (const e of (evals || []) as EvalData[]) {
      evalMap.set(e.submission_id, e)
    }

    scripts = subs.map(s => {
      const ev = evalMap.get(s.id)
      const evalObj = ev?.evaluation as Record<string, unknown> | null
      const headline: string | null = ev?.edited_fields?.logline
        || (evalObj?.positioning_hook as string | undefined)
        || null
      return {
        id: s.id,
        title: s.title,
        format: s.declared_format,
        score: ev?.weighted_score ?? null,
        evaluationId: ev?.id ?? null,
        headline,
        tags: s.tags || [],
        createdAt: s.created_at,
      }
    })
  }

  // Events
  type EventRow = { id: string; event_type: string; message: string | null; new_stage: string | null; created_at: string }
  const { data: evts } = await service
    .from('consideration_events')
    .select('id, event_type, message, new_stage, created_at')
    .eq('consideration_id', id)
    .order('created_at', { ascending: false })

  const events = (evts || []) as EventRow[]

  const profileData = {
    fullName: profile?.full_name || null,
    handle: profile?.handle || null,
    bio: profile?.bio || null,
    avatarUrl: profile?.avatar_url || null,
    headline: profile?.headline || null,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <ReviewDetail
        reviewNumber={reviewNumber}
        review={{
          id: consideration.id,
          reviewStage: consideration.review_stage,
          submittedAt: consideration.submitted_at,
          reviewedAt: consideration.reviewed_at,
          feedback: consideration.feedback,
          nextSteps: consideration.next_steps,
        }}
        profile={profileData}
        scripts={scripts}
        events={events}
      />
    </div>
  )
}
