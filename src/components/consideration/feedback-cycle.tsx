'use client'

// FeedbackCycle — one review cycle card.
// Used on both /feedback page and dashboard.
// Design: timeline bar → feedback text → "Your next move" hero → script count footer.

import { useState } from 'react'
import Link from 'next/link'

export function FeedbackCycle({
  submittedAt,
  reviewedAt,
  feedback,
  nextSteps,
  scriptCount,
  linkToFull,
}: {
  submittedAt: string | null
  reviewedAt: string | null
  feedback: string | null
  nextSteps: string | null
  scriptCount: number
  linkToFull?: boolean
}) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
      {/* Timeline bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
        {submittedAt && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
            <span className="text-[12px] text-gray-500">Submitted {fmtDate(submittedAt)}</span>
          </div>
        )}
        {submittedAt && reviewedAt && (
          <svg width="16" height="2" className="shrink-0"><line x1="0" y1="1" x2="16" y2="1" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,2"/></svg>
        )}
        {reviewedAt && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[12px] text-gray-500">Feedback received {fmtDate(reviewedAt)}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Feedback text */}
        {feedback && (
          <p className="text-[14px] text-gray-800 leading-[1.65] m-0 mb-4 whitespace-pre-line">
            {feedback}
          </p>
        )}

        {/* Your next move — the hero */}
        {nextSteps && (
          <div className="mb-4 pl-4 py-3 pr-4 rounded-r-lg" style={{
            background: '#f5f3ff',
            borderLeft: '3px solid #7c3aed',
          }}>
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] m-0 mb-1" style={{ color: '#7c3aed' }}>
              Your next move
            </p>
            <p className="text-[14px] leading-[1.55] m-0" style={{ color: '#4c1d95' }}>
              {nextSteps}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-[13px] text-gray-400">
            {scriptCount} {scriptCount === 1 ? 'script' : 'scripts'} reviewed
          </span>
          {linkToFull && (
            <Link href="/feedback" className="text-[13px] font-medium text-purple-600 hover:text-purple-800">
              View full feedback
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
