'use client'

import { DIMENSION_IDS, DIMENSION_META, type DimensionId, type DimensionScore } from '@/types'

interface ScoreCardProps {
  scores: Record<DimensionId, DimensionScore>
  weightedScore: number
}

function DimensionBar({ id, score, reasoning }: { id: DimensionId; score: number; reasoning: string }) {
  const meta = DIMENSION_META[id]
  const pct = (score / 10) * 100

  const getBarColor = (s: number) => {
    if (s >= 8) return 'bg-emerald-500'
    if (s >= 6) return 'bg-amber-500'
    if (s >= 4) return 'bg-zinc-500'
    return 'bg-red-500/70'
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
          <span className="ml-1 text-[var(--gem-gray-400)]">
            · Weight: {(meta.weight * 100).toFixed(0)}%
          </span>
        </p>
      </summary>
      <div className="mt-3 pl-3 border-l-2 border-[var(--gem-gray-700)] text-sm text-[var(--gem-gray-300)] leading-relaxed">
        {reasoning}
      </div>
    </details>
  )
}

export function ScoreCard({ scores, weightedScore }: ScoreCardProps) {
  return (
    <div className="p-6 rounded-xl border border-[var(--gem-gray-700)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--gem-gray-400)]">
          Dimension Scores
        </h2>
        <span className="text-sm text-[var(--gem-gray-400)]">
          Weighted: <span className="font-bold text-[var(--gem-white)]">{weightedScore.toFixed(1)}</span>/100
        </span>
      </div>

      <div className="space-y-5">
        {DIMENSION_IDS.map(id => (
          <DimensionBar
            key={id}
            id={id}
            score={scores[id].score}
            reasoning={scores[id].reasoning}
          />
        ))}
      </div>
    </div>
  )
}
