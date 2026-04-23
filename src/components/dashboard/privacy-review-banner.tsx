'use client'
// Shown on the dashboard to writers who have published reports that were
// migrated to the new privacy defaults. Nudges them to review the settings
// once, then clears itself.
//
// Server renders the banner only if ANY of the writer's published submissions
// has privacy_review_needed = true. Clicking "Review now" deep-links to the
// report with the privacy panel opened (query param ?privacy=1).

import { useState } from 'react'
import { Shield, X } from 'lucide-react'

interface Props {
  firstSubmission: {
    id: string
    evaluation_id: string
    title: string
  }
  reviewCount: number
}

export function PrivacyReviewBanner({ firstSubmission, reviewCount }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      className="relative rounded-xl p-4 sm:p-5 mb-6 flex items-start gap-3"
      style={{
        background:
          'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(212,160,23,0.04))',
        border: '1px solid rgba(124,58,237,0.28)',
      }}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full grid place-items-center text-white mt-0.5"
        style={{ background: 'var(--gem-accent)' }}
      >
        <Shield size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] sm:text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1">
          New: you control what visitors see on your public reports
        </p>
        <p className="text-[12.5px] sm:text-[13.5px] text-[var(--gem-gray-300)] m-0 leading-[1.55] mb-3 max-w-[62ch]">
          We just rolled out granular privacy. Your{' '}
          {reviewCount === 1 ? 'published report is' : `${reviewCount} published reports are`}{' '}
          set to Balanced (headline, what&apos;s working, and production signal public
          — score private). Review and tune anytime.
        </p>
        <div className="flex gap-2">
          <a
            href={`/report/${firstSubmission.evaluation_id}?privacy=1`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-white"
            style={{ background: 'var(--gem-accent)' }}
          >
            Review settings
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)]"
          >
            Dismiss
          </button>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 w-6 h-6 rounded-full grid place-items-center hover:bg-[rgba(255,255,255,0.08)] text-[var(--gem-gray-500)]"
      >
        <X size={14} />
      </button>
    </div>
  )
}
