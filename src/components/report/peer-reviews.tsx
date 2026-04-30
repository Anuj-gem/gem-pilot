// PeerReviews — section on /report/[id] that surfaces all peer reviews
// (Anuj 2026-04-29 peer-reviews v0.1).
//
// - Anyone authenticated sees the reviews (RLS policy in 016 migration).
// - Each review shows: reviewer name, score, body, suggestion, date.
// - If the viewer is a reviewer, a "Review this script" or "Edit your
//   review" CTA appears in the header.

import Link from 'next/link'

export interface PeerReviewItem {
  id: string
  score: number
  body: string
  suggestion: string | null
  created_at: string
  updated_at: string
  reviewer_id: string
  reviewer_name: string | null
}

interface Props {
  submissionId: string
  reviews: PeerReviewItem[]
  viewerIsReviewer: boolean
  viewerId: string | null
}

export function PeerReviews({ submissionId, reviews, viewerIsReviewer, viewerId }: Props) {
  const viewersOwnReview = viewerId
    ? reviews.find((r) => r.reviewer_id === viewerId)
    : null

  if (reviews.length === 0 && !viewerIsReviewer) return null

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Peer reviews
          {reviews.length > 0 && (
            <span className="ml-2 text-base font-semibold text-gray-400">
              {reviews.length}
            </span>
          )}
        </h2>
        {viewerIsReviewer && (
          <Link
            href={`/review/${submissionId}`}
            className="text-sm font-semibold text-purple-700 hover:text-purple-900"
          >
            {viewersOwnReview ? 'Edit your review →' : 'Review this script →'}
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center">
          <p className="text-sm text-gray-500">
            No peer reviews yet. {viewerIsReviewer && 'Be the first.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </section>
  )
}

function ReviewCard({ r }: { r: PeerReviewItem }) {
  const date = new Date(r.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex items-start gap-4 mb-3">
        <div
          className="shrink-0 flex flex-col items-center justify-center rounded-lg"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.30)',
            minWidth: 52,
            padding: '6px 10px',
          }}
        >
          <span className="text-[9px] uppercase tracking-[0.14em] font-bold text-purple-700">Score</span>
          <span className="text-xl font-bold text-gray-900 tabular-nums leading-none mt-0.5">{r.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-gray-900">
            {r.reviewer_name || 'GEM Reviewer'}
          </div>
          <div className="text-xs text-gray-500">{date}</div>
        </div>
      </header>

      <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap mb-3">
        {r.body}
      </p>

      {r.suggestion && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-amber-700 mb-1">
            Suggestion for next draft
          </div>
          <p className="text-[14px] leading-relaxed text-gray-700 whitespace-pre-wrap">
            {r.suggestion}
          </p>
        </div>
      )}
    </article>
  )
}
