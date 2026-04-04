'use client'

import { useState } from 'react'
import { DIMENSION_IDS, DIMENSION_META, type DimensionId, type DimensionScore } from '@/types'

interface ScoreCardProps {
  scores: Record<string, DimensionScore>
  weightedScore: number
  blurred?: boolean
}

function DimensionBar({ id, score, reasoning, blurred }: { id: DimensionId; score: number; reasoning: string; blurred?: boolean }) {
  const meta = DIMENSION_META[id]
  const pct = (score / 10) * 100

  const getBarColor = (s: number) => {
    if (s >= 8) return 'bg-emerald-500'
    if (s >= 6) return 'bg-amber-500'
    if (s >= 4) return 'bg-gray-500'
    return 'bg-red-500/70'
  }

  if (blurred) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[var(--gem-gray-200)]">
            {meta.shortLabel}
          </span>
          <span className="text-sm font-bold text-[var(--gem-gray-500)] blur-sm select-none">
            ?/10
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--gem-gray-700)] overflow-hidden blur-sm select-none">
          <div
            className={`h-full rounded-full ${getBarColor(score)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[var(--gem-gray-200)]">
            {meta.shortLabel}
          </span>
          <span className="text-sm font-bold text-[var(--gem-white)]">
            {score}/10
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--gem-gray-700)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-[var(--gem-gray-500)] mt-1">
          {meta.description}
        </p>
      </summary>
      <div className="mt-3 pl-3 border-l-2 border-[var(--gem-gray-700)] text-sm text-[var(--gem-gray-300)] leading-relaxed">
        {reasoning}
      </div>
    </details>
  )
}

export function ScoreCard({ scores, weightedScore, blurred = false }: ScoreCardProps) {
  const [showAll, setShowAll] = useState(false)

  // Get all dimensions sorted by score (highest first)
  const sortedDimensions = DIMENSION_IDS.filter(id => scores[id] != null).sort(
    (a, b) => scores[b].score - scores[a].score
  )

  const top3 = sortedDimensions.slice(0, 3)

  const visibleDimensions = showAll ? sortedDimensions : top3

  return (
    <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--gem-gray-400)]">
          Story Analysis
        </h2>
      </div>

      <div className="space-y-5">
        {visibleDimensions.map((id) => (
          <DimensionBar
            key={id}
            id={id}
            score={scores[id].score}
            reasoning={scores[id].reasoning}
            blurred={blurred}
          />
        ))}

        <div className="flex items-center justify-center pt-1">
          <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 text-xs text-[var(--gem-accent)] hover:underline cursor-pointer"
          >
            {showAll ? 'Show less' : `Show all ${DIMENSION_IDS.filter(id => scores[id] != null).length} dimensions`}
          </button>
          <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
        </div>
      </div>
    </div>
  )
}
