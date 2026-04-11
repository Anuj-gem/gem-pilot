import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { type Tier } from '@/types'
import { tierLabel, tierDescription } from '@/lib/tier-display'
import { ReportActions } from './report-actions'

/** Teaser copy keyed by tier — gives free viewers a taste without revealing the score. */
const TIER_TEASERS: Record<Tier, string> = {
  'Greenlight Material':
    'Selznick flagged this script as having exceptional potential. Subscribe to see your full score, detailed development notes, and get your script in front of producers.',
  'Optionable':
    'Selznick identified real strengths in this script — there\'s something here worth developing. Subscribe to see your full score, development notes, and get matched with producers.',
  'Needs Development':
    'Selznick completed your evaluation and found areas with genuine promise. Subscribe to see your full score, detailed feedback, and what it would take to get this script in front of producers.',
}

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
  /** When true, hide the score entirely and show a verdict teaser instead. */
  blurred?: boolean
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
  blurred = false,
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

        {/* Score — hidden entirely for free viewers, shown for subscribers */}
        {!blurred && (
          <div className="shrink-0 text-right">
            <div className="text-4xl sm:text-5xl font-bold" style={{ color: tierColor(tier) }}>
              {Math.round(weightedScore)}
              <span className="text-2xl sm:text-3xl text-[var(--gem-gray-500)]">/100</span>
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
        )}
      </div>

      {/* Tier verdict — full display for subscribers, teaser for free viewers */}
      {blurred ? (
        <div className="rounded-xl border border-[var(--gem-accent)]/20 bg-[var(--gem-accent)]/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--gem-accent)] font-semibold mb-2">
            Evaluation Complete
          </p>
          <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">
            {TIER_TEASERS[tier]}
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Revise CTA + Share buttons — client component, reads eval id from pathname */}
      <ReportActions title={title} score={weightedScore} tier={tier} />
    </div>
  )
}
