// /review — Portfolio review listing page.
// Shows all reviews as cards linking to /review/c/[id].
// No profile card. "Start new review" button if no active review.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ReviewList } from '@/components/review/review-list'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ReviewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/review')

  const service = svc()

  // All considerations, newest first
  const { data: rawConsiderations } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  type Consideration = {
    id: string; status: string; review_stage: string
    submitted_at: string; reviewed_at: string | null
  }
  const considerations = (rawConsiderations || []) as Consideration[]

  // Script counts per consideration
  const reviewSummaries = await Promise.all(
    considerations.map(async (c) => {
      const { data: cs } = await service
        .from('consideration_scripts')
        .select('script_submission_id')
        .eq('consideration_id', c.id)

      return {
        id: c.id,
        reviewStage: c.review_stage,
        submittedAt: c.submitted_at,
        reviewedAt: c.reviewed_at,
        scriptCount: (cs || []).length,
      }
    })
  )

  return (
    <div className="max-w-2xl mx-auto">
      <ReviewList reviews={reviewSummaries} />
    </div>
  )
}
