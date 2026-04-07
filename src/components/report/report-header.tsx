import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { type Tier } from '@/types'
import { tierLabel, tierDescription } from '@/lib/tier-display'
import { ReportActions } from './report-actions'

interface ReportHeaderProps {
  title: string
  author: string
  tier: Tier
  weightedScore: number
  format: string
  genre: string
  genreTags: string[]
  tone: string
  createdAt: string
  isOwner?: boolean
}

function tierColor(tier: Tier) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

export function ReportHeader({
  title,
  author,
  tier,
  weightedScore,
  format,
  genre,
  genreTags,
  tone,
  createdAt,
  isOwner = false,
}: ReportHeaderProps) {
  const displayLabel = tierLabel(tier)
  const displayDescription = tierDescription(tier)
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-5">
      {/* Title + Score */}
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">{title}</h1>
          <p className="text-sm text-[var(--gem-gray-400)] mt-1.5">
            by {author} <span className="text-[var(--gem-gray-600)]">·</span> {date}
          </p>
          <p className="text-sm text-[var(--gem-gray-300)] mt-0.5">{format} · {genre}{tone ? ` · ${tone}` : ''}</p>
        </div>

        {/* Score — clean text, no ring */}
        <div className="shrink-0 text-right">
          <div className="text-4xl sm:text-5xl font-bold" style={{ color: tierColor(tier) }}>
            {Math.round(weightedScore)}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--gem-gray-500)] mt-0.5">
            GEM score
          </div>
          {isOwner && (
            <Link
              href={`/submit?title=${encodeURIComponent(title)}`}
              className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-[var(--gem-accent)] text-[var(--gem-accent)] hover:bg-[var(--gem-accent)] hover:text-white transition-colors"
            >
              <RefreshCw size={11} />
              Revise
            </Link>
          )}
        </div>
      </div>

      {/* Tier (GEM Verdict) */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-[var(--gem-gray-500)] font-medium">GEM Verdict:</span>
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: tierColor(tier) }}
        >
          {displayLabel}
        </span>
      </div>

      {displayDescription && (
        <p className="text-sm text-[var(--gem-gray-400)] max-w-lg leading-relaxed">
          {displayDescription}
        </p>
      )}

      {/* Revise CTA + Share buttons — client component, reads eval id from pathname */}
      <ReportActions title={title} score={weightedScore} tier={tier} />
    </div>
  )
}
