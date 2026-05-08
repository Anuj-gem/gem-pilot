'use client'

// ReviewList — listing page for all portfolio reviews.
// Each review is a card linking to /review/c/[id].
// No profile card. Just the list + "Start new review" button.

import Link from 'next/link'

type ReviewSummary = {
  id: string
  reviewStage: string
  submittedAt: string
  reviewedAt: string | null
  scriptCount: number
}

const STAGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#6b728015', text: '#6b7280', label: 'Draft' },
  pending: { bg: '#d9770615', text: '#d97706', label: 'Pending' },
  initial_review: { bg: '#7c3aed15', text: '#7c3aed', label: 'Initial review' },
  advanced_review: { bg: '#2563eb15', text: '#2563eb', label: 'Advanced review' },
  partner_match: { bg: '#05966915', text: '#059669', label: 'Partner match' },
  complete: { bg: '#16a34a15', text: '#16a34a', label: 'Complete' },
}

export function ReviewList({
  reviews,
  hasActiveNonComplete,
}: {
  reviews: ReviewSummary[]
  hasActiveNonComplete: boolean
}) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-[22px] font-bold text-gray-900 m-0"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Portfolio reviews
        </h1>
        {!hasActiveNonComplete && (
          <Link
            href="/consideration/submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors"
          >
            Start new review
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 px-5 py-10 text-center">
          <p className="text-[14px] text-gray-500 m-0 mb-3">
            You haven't submitted any portfolio reviews yet.
          </p>
          <Link
            href="/consideration/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors"
          >
            Submit for review
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r, idx) => {
            // Reviews are newest-first. Number chronologically: oldest = #1.
            const reviewNumber = reviews.length - idx
            const stage = STAGE_COLORS[r.reviewStage] || STAGE_COLORS.pending

            return (
              <Link
                key={r.id}
                href={`/review/c/${r.id}`}
                className="block rounded-xl bg-white border border-gray-200 px-5 py-4 hover:border-purple-200 hover:bg-purple-50/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <p
                        className="text-[15px] font-bold text-gray-900 m-0"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        Portfolio review #{reviewNumber}
                      </p>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: stage.bg, color: stage.text }}
                      >
                        {stage.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-400 m-0">
                      Submitted {fmtDate(r.submittedAt)}
                      {r.reviewedAt && ` · Reviewed ${fmtDate(r.reviewedAt)}`}
                      {` · ${r.scriptCount} ${r.scriptCount === 1 ? 'script' : 'scripts'}`}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 shrink-0">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
