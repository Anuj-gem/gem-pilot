'use client'

// FeedbackCycle — one review cycle in the feedback history.
// Shows feedback + next steps + new scripts considered (Option B layout).

import { useState } from 'react'

export function FeedbackCycle({
  reviewedAt,
  feedback,
  nextSteps,
  scripts,
  isFirst,
}: {
  reviewedAt: string | null
  feedback: string | null
  nextSteps: string | null
  scripts: { title: string; score: number | null; carriedForward: boolean }[]
  isFirst: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  const dateLabel = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown date'

  // First consideration shows all scripts; subsequent ones show only new work
  const newScripts = isFirst ? scripts : scripts.filter(s => !s.carriedForward)
  const displayScripts = showAll ? newScripts : newScripts.slice(0, 3)
  const hiddenCount = newScripts.length - 3

  return (
    <div className="px-5 py-5">
      {/* Date */}
      <p className="text-[14px] font-medium text-gray-400 m-0 mb-3">{dateLabel}</p>

      {/* Feedback body */}
      {feedback && (
        <p className="text-[14px] text-gray-800 leading-[1.65] m-0 mb-4 whitespace-pre-line">
          {feedback}
        </p>
      )}

      {/* Next steps */}
      {nextSteps && (
        <div className="mb-4 px-4 py-3 bg-gray-50 rounded-lg">
          <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-gray-400 m-0 mb-1">What to do next</p>
          <p className="text-[13px] text-gray-700 m-0 leading-[1.55]">{nextSteps}</p>
        </div>
      )}

      {/* Scripts considered */}
      {newScripts.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-gray-400 m-0 mb-2">
            {isFirst ? 'Scripts reviewed' : 'New work considered'}
          </p>

          <div className="space-y-1">
            {displayScripts.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                {s.score != null && (
                  <span className="text-[13px] font-bold min-w-[24px]" style={{
                    color: s.score >= 75 ? '#7c3aed' : '#6b7280',
                  }}>
                    {Math.round(s.score)}
                  </span>
                )}
                <span className="text-[13px] text-gray-700 truncate">{s.title}</span>
              </div>
            ))}
          </div>

          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-[13px] font-medium text-purple-600 hover:text-purple-800 bg-transparent border-none cursor-pointer mt-2 p-0"
            >
              + {hiddenCount} more {hiddenCount === 1 ? 'script' : 'scripts'}
            </button>
          )}

          {!isFirst && (
            <p className="text-[12px] text-gray-300 m-0 mt-2">Your full portfolio is reviewed each time.</p>
          )}
        </div>
      )}
    </div>
  )
}
