// CommunityReviewCta — replaces the legacy "Request to contact" panel
// on non-owner non-producer report views. Open community model: any
// signed-in GEM member can write a review on a public completed script.
//
// Anuj 2026-04-30 v0.7.

import Link from 'next/link'
import { MessageSquare, Star } from 'lucide-react'

interface Props {
  evaluationId: string
  submissionId: string
  writerName: string
  isLoggedIn: boolean
  canReview: boolean
  reviewCount: number
}

export function CommunityReviewCta({
  evaluationId,
  submissionId,
  writerName,
  isLoggedIn,
  canReview,
  reviewCount,
}: Props) {
  const reviewHref = `/review/${submissionId}`
  const loginHref = `/login?redirect=${encodeURIComponent(`/review/${submissionId}`)}`

  return (
    <div
      className="mt-10 rounded-2xl p-6 sm:p-7 bg-white"
      style={{ border: '1px solid var(--gem-gray-700)' }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full grid place-items-center text-white"
          style={{ background: 'var(--gem-accent)' }}
        >
          <Star size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--gem-accent)] m-0 mb-1">
            Community
          </p>
          <h3 className="text-[20px] sm:text-[22px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
            Help {writerName.split(' ')[0] || 'the writer'} sharpen this script
          </h3>
        </div>
      </div>
      <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-5 max-w-[60ch]">
        Anyone in the GEM community can leave a review.{' '}
        {reviewCount > 0
          ? `${reviewCount} ${reviewCount === 1 ? 'reviewer has' : 'reviewers have'} weighed in already.`
          : 'Be the first to weigh in.'}
      </p>
      {isLoggedIn ? (
        canReview ? (
          <Link
            href={reviewHref}
            prefetch={false}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-colors hover:brightness-110"
            style={{ background: 'var(--gem-accent)' }}
          >
            <MessageSquare size={14} />
            Write a review
          </Link>
        ) : (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold"
            style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--gem-gray-500)' }}
          >
            Reviews aren&apos;t open on this script.
          </div>
        )
      ) : (
        <Link
          href={loginHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-colors hover:brightness-110"
          style={{ background: 'var(--gem-accent)' }}
        >
          <MessageSquare size={14} />
          Sign in to review
        </Link>
      )}
    </div>
  )
}
