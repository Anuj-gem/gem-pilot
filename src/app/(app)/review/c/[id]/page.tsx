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
  // For DRAFT and PENDING reviews, dynamically show ALL unreviewed scripts
  // so users can add/remove scripts. For later stages, show only attached.
  const isDraft = consideration.review_stage === 'draft'
  const isPending = consideration.review_stage === 'pending'
  const isEditable = isDraft || isPending

  type SubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; tags: string[] | null
  }

  let scriptIds: string[] = []
  let attachedScriptIds: Set<string> = new Set()

  if (isEditable) {
    // For pending reviews, track which scripts are currently attached
    if (isPending) {
      const { data: cs } = await service
        .from('consideration_scripts')
        .select('script_submission_id')
        .eq('consideration_id', id)
      for (const r of (cs || []) as { script_submission_id: string }[]) {
        attachedScriptIds.add(r.script_submission_id)
      }
    }

    // Find all completed, visible scripts NOT in any OTHER consideration
    const { data: allCons } = await service
      .from('considerations')
      .select('id')
      .eq('writer_id', user.id)
    const conIds = (allCons || []).map((c: { id: string }) => c.id)

    let reviewedScriptIds: Set<string> = new Set()
    if (conIds.length > 0) {
      // Scripts in OTHER considerations (exclude current one so its scripts still show)
      const otherConIds = conIds.filter(cid => cid !== id)
      if (otherConIds.length > 0) {
        const { data: conScripts } = await service
          .from('consideration_scripts')
          .select('script_submission_id')
          .in('consideration_id', otherConIds)
        for (const r of (conScripts || []) as { script_submission_id: string }[]) {
          reviewedScriptIds.add(r.script_submission_id)
        }
      }
    }

    // Include completed AND processing/queued scripts
    const { data: eligibleScripts } = await service
      .from('script_submissions')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['completed', 'processing', 'queued'])
      .is('hidden_at', null)
      .order('created_at', { ascending: false })

    scriptIds = (eligibleScripts || [])
      .filter((s: { id: string }) => !reviewedScriptIds.has(s.id))
      .map((s: { id: string }) => s.id)
  } else {
    // Locked stages: show only attached scripts
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', id)
    scriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)
  }

  // Pro / trial status
  const { data: writerProfile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  const isPro = writerProfile?.subscription_status === 'active'
  const isTrial = !isPro

  // Open opportunities for matching
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres')
    .eq('status', 'active')  // opportunities use 'active' not 'open'
    .eq('published', true)
  const allOpenOpps = (openOpps || []) as {
    id: string; title: string; slug: string
    formats: string[] | null; genres: string[] | null
  }[]

  function matchOpportunities(format: string | null, genre: string | null) {
    if (!format && !genre) return []
    return allOpenOpps.filter(o => {
      const fmtMatch = !o.formats || o.formats.length === 0 || (format && o.formats.some(f => f.toLowerCase() === format.toLowerCase()))
      const genreMatch = !o.genres || o.genres.length === 0 || (genre && o.genres.some(g => genre.toLowerCase().includes(g.toLowerCase())))
      return fmtMatch || genreMatch
    }).map(o => ({ title: o.title, slug: o.slug }))
  }

  // Paywall: first completed script is free, rest are locked for trial users
  // We need to find the user's first-ever completed script (chronologically)
  let firstCompletedId: string | null = null
  if (isTrial) {
    const { data: firstCompleted } = await service
      .from('script_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .is('hidden_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
    firstCompletedId = firstCompleted?.[0]?.id ?? null
  }

  let scripts: {
    id: string; title: string; format: string | null
    genre: string | null; score: number | null; evaluationId: string | null
    createdAt: string
    matchingOpportunities: { title: string; slug: string }[]
    isProcessing?: boolean
    isLocked?: boolean
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
      evaluation: { positioning_hook?: string; classification?: { genre_primary?: string }; format_detection?: { genre_primary?: string } } | null
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
      const genre = ev?.evaluation?.classification?.genre_primary
        || ev?.evaluation?.format_detection?.genre_primary
        || null
      const isStillProcessing = s.status === 'processing' || s.status === 'queued'
      const isScriptLocked = isTrial && !isStillProcessing && s.status === 'completed' && s.id !== firstCompletedId
      return {
        id: s.id,
        title: s.title,
        format: s.declared_format,
        genre,
        score: isStillProcessing ? null : (ev?.weighted_score ?? null),
        evaluationId: isStillProcessing ? null : (ev?.id ?? null),
        createdAt: s.created_at,
        matchingOpportunities: isStillProcessing ? [] : matchOpportunities(s.declared_format, genre),
        isProcessing: isStillProcessing,
        isLocked: isScriptLocked,
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
        isTrial={isTrial}
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
        attachedScriptIds={[...attachedScriptIds]}
        events={events}
      />
    </div>
  )
}
