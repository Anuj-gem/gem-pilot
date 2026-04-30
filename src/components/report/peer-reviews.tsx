'use client'

// PeerReviews — section on /report/[id] that surfaces all peer reviews.
//
// Open community model (Anuj 2026-04-30 v0.7): any signed-in non-owner
// can review a public completed script. The writer (owner) sees an
// extra "Hide" toggle on each review which dims it on their page and
// removes it from public review counts / "Most reviewed" sorting. The
// reviewer still keeps the review on their own profile.

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { EyeOff, Eye } from 'lucide-react'
import { WriterCard, type WriterCardData } from '@/components/writer-card'
import { setReviewHidden } from '@/app/review/[id]/actions'

export interface PeerReviewItem {
  id: string
  score: number
  body: string
  suggestion: string | null
  created_at: string
  updated_at: string
  reviewer_id: string
  reviewer_name: string | null
  reviewer_handle?: string | null
  reviewer_headline?: string | null
  reviewer_avatar_url?: string | null
  /** When non-null, the writer has hidden this review from their report
   *  page. Only owners see hidden rows (dimmed); non-owners get them
   *  filtered out server-side. */
  owner_hidden_at?: string | null
}

interface Props {
  submissionId: string
  reviews: PeerReviewItem[]
  viewerIsReviewer: boolean
  viewerId: string | null
  /** Owner-only: enables Hide / Unhide controls on each review. */
  isOwner?: boolean
}

export function PeerReviews({ submissionId, reviews, viewerIsReviewer, viewerId, isOwner = false }: Props) {
  const viewersOwnReview = viewerId
    ? reviews.find((r) => r.reviewer_id === viewerId)
    : null

  const visibleCount = reviews.filter((r) => !r.owner_hidden_at).length

  if (reviews.length === 0 && !viewerIsReviewer) return null

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Peer reviews
          {visibleCount > 0 && (
            <span className="ml-2 text-base font-semibold text-gray-400">
              {visibleCount}
            </span>
          )}
        </h2>
        {viewerIsReviewer && (
          <Link
            href={`/review/${submissionId}`}
            className="text-sm font-semibold text-purple-700 hover:text-purple-900"
          >
            {viewersOwnReview ? 'Edit your review →' : 'Write a review →'}
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center">
          <p className="text-sm text-gray-500 mb-4">No peer reviews yet.</p>
          {viewerIsReviewer && (
            <Link
              href={`/review/${submissionId}`}
              className="inline-block px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
            >
              Write the first review →
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} isOwner={isOwner} />
            ))}
          </div>
          {viewerIsReviewer && !viewersOwnReview && (
            <div className="mt-5 text-center">
              <Link
                href={`/review/${submissionId}`}
                className="inline-block px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
              >
                Write a review →
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ReviewCard({ r, isOwner }: { r: PeerReviewItem; isOwner: boolean }) {
  const [hidden, setHidden] = useState<boolean>(!!r.owner_hidden_at)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const date = new Date(r.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const reviewerCard: WriterCardData = {
    id: r.reviewer_id,
    full_name: r.reviewer_name,
    handle: r.reviewer_handle ?? null,
    headline: r.reviewer_headline ?? null,
    avatar_url: r.reviewer_avatar_url ?? null,
  }

  const onToggleHide = () => {
    setError(null)
    const next = !hidden
    setHidden(next) // optimistic
    startTransition(async () => {
      const res = await setReviewHidden({ reviewId: r.id, hide: next })
      if (res.error) {
        setHidden(!next)
        setError(res.error)
      }
    })
  }

  return (
    <article
      className={`relative rounded-xl border bg-white p-5 shadow-sm transition-opacity ${hidden ? 'opacity-50 border-dashed' : 'border-gray-200'}`}
    >
      {hidden && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gray-900 text-white text-[9.5px] font-bold uppercase tracking-[0.1em] px-2 py-0.5">
          <EyeOff size={10} />
          Hidden
        </div>
      )}
      <header className="flex items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <WriterCard writer={reviewerCard} size="sm" />
          <div className="text-xs text-gray-500 mt-1.5">{date}</div>
        </div>
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
      </header>

      <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap mb-3">
        {r.body}
      </p>

      {r.suggestion && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-purple-700 mb-1">
            Suggestion for next draft
          </div>
          <p className="text-[14px] leading-relaxed text-gray-700 whitespace-pre-wrap">
            {r.suggestion}
          </p>
        </div>
      )}

      {/* Owner-only hide control. Hiding removes the review from the
          public count + "Most reviewed" sort — that's the cost. */}
      {isOwner && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-gray-500 leading-tight">
            {hidden
              ? "Hidden from your report. It doesn't count toward your review total."
              : 'Visible to everyone on your report.'}
          </span>
          <button
            type="button"
            onClick={onToggleHide}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-md text-[11.5px] font-semibold px-2.5 py-1 transition-colors ${
              hidden
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            {hidden ? <Eye size={12} /> : <EyeOff size={12} />}
            {hidden ? 'Unhide' : 'Hide'}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-red-600">{error}</p>
      )}
    </article>
  )
}
