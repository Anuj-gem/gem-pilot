// /review — Portfolio review listing page.
// Shows all reviews as cards linking to /review/c/[id].
// No profile card. "Start new review" button if no active review.

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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="mb-5">
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Reviews
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">Your portfolio reviews will appear here.</p>
        </header>
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No reviews yet</p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">Upload scripts and request a portfolio review from the GEM team.</p>
          <a
            href="/start"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ background: 'var(--gem-accent)' }}
          >
            Get started
          </a>
        </div>
      </div>
    )
  }

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
