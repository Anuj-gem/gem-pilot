import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { TIER_META, type Tier } from '@/types'
import { tierLabel } from '@/lib/tier-display'

function tierColor(tier: string) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

export interface SampleGridItem {
  slug: string
  title: string
  author: string
  year: number | null
  type: string // "TV Pilot" or "Feature"
  genre: string | null
  weighted_score: number
  tier: Tier
  tone: string | null
  logline: string | null
}

interface SampleGridProps {
  samples: SampleGridItem[]
  rankOffset?: number
}

export function SampleGrid({ samples, rankOffset = 0 }: SampleGridProps) {
  return (
    <div className="space-y-3">
      {samples.map((s, index) => (
        <SampleRow key={s.slug} sample={s} rank={index + 1 + rankOffset} />
      ))}
    </div>
  )
}

function SampleRow({ sample, rank }: { sample: SampleGridItem; rank: number }) {
  const tierMeta = TIER_META[sample.tier as Tier]
  return (
    <Link
      href={`/sample/${sample.slug}`}
      className="group block rounded-xl card-glass overflow-hidden"
    >
      <div className="flex" style={{ borderLeft: `4px solid ${tierColor(sample.tier)}` }}>
        {/* Rank + Score */}
        <div className="shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center py-4 sm:py-5 bg-[var(--gem-gray-800)]/30">
          <span className={`text-base sm:text-lg font-bold tabular-nums ${
            rank <= 3 ? 'text-[var(--gem-gold)]' : 'text-[var(--gem-gray-400)]'
          }`}>#{rank}</span>
          <span className="text-xl sm:text-2xl font-bold tabular-nums mt-0.5" style={{ color: tierColor(sample.tier) }}>
            {Math.round(sample.weighted_score)}
          </span>
          <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-[var(--gem-gray-500)] mt-0.5">GEM Score</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-4 sm:py-5 px-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold truncate group-hover:text-[var(--gem-accent)] transition-colors">
                  {sample.title}
                </h3>
                <span className="inline-flex items-center gap-0.5 text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 border border-violet-200 font-semibold uppercase tracking-wider">
                  <Sparkles size={9} /> GEM Sample
                </span>
              </div>
              <div className="text-xs text-[var(--gem-gray-400)] mt-0.5">
                by {sample.author}{sample.year ? ` · ${sample.year}` : ''}
              </div>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold shrink-0 ${tierMeta?.bgClass ?? ''} ${tierMeta?.colorClass ?? ''}`}>
              {tierLabel(sample.tier as Tier)}
            </span>
          </div>

          {sample.logline && (
            <p className="text-xs text-[var(--gem-gray-400)] mt-2 line-clamp-2 leading-relaxed">
              {sample.logline}
            </p>
          )}

          {sample.tone && (
            <p className="text-[11px] text-[var(--gem-gray-500)] mt-1.5 italic truncate">
              {sample.tone}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-medium">
              {sample.type}
            </span>
            {sample.genre && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                {sample.genre}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] font-medium group-hover:underline">
              View Full Report <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
