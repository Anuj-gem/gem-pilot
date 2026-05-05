'use client'

// FeedbackCycle — one review cycle in the feedback history.
// Collapsible script list per cycle.

import { useState } from 'react'

const OUTCOME_LABELS: Record<string, string> = {
  pass: 'Pass',
  developing: 'Keep developing',
  advancing: 'Advancing',
}
const OUTCOME_COLORS: Record<string, string> = {
  pass: 'text-gray-600 bg-gray-100',
  developing: 'text-amber-800 bg-amber-100 border border-amber-300',
  advancing: 'text-emerald-700 bg-emerald-50 border border-emerald-300',
}

export function FeedbackCycle({
  reviewedAt,
  feedback,
  outcome,
  nextSteps,
  scripts,
}: {
  reviewedAt: string | null
  feedback: string | null
  outcome: string | null
  nextSteps: string | null
  scripts: { title: string; score: number | null }[]
}) {
  const [showScripts, setShowScripts] = useState(false)
  const dateLabel = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown date'

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[14px] font-bold text-gray-900">{dateLabel}</span>
        {outcome && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            OUTCOME_COLORS[outcome] ?? 'text-gray-600 bg-gray-100'
          }`}>
            {OUTCOME_LABELS[outcome] ?? outcome}
          </span>
        )}
      </div>

      {/* Feedback body */}
      {feedback && (
        <p className="text-[13.5px] text-gray-600 leading-[1.65] m-0 whitespace-pre-line">
          {feedback}
        </p>
      )}

      {/* Next steps */}
      {nextSteps && (
        <div className="mt-3 px-3.5 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-emerald-700 m-0 mb-1">Next steps</p>
          <p className="text-[13px] text-emerald-800 m-0 leading-[1.55]">{nextSteps}</p>
        </div>
      )}

      {/* Scripts included (collapsible) */}
      {scripts.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowScripts(!showScripts)}
            className="text-[11.5px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showScripts ? 'Hide' : 'Show'} {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'} reviewed {showScripts ? '▴' : '▾'}
          </button>
          {showScripts && (
            <div className="mt-2 space-y-1.5">
              {scripts.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
                  {s.score != null && (
                    <span className="text-[12px] font-bold text-gray-500 w-7">{Math.round(s.score)}</span>
                  )}
                  <span className="text-[12px] text-gray-700">{s.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
