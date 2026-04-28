import Link from 'next/link'
import { RefreshCw, Upload } from 'lucide-react'
import { type Tier } from '@/types'
import { tierLabel, tierDescription, tierCutoffLabel, TIER_ORDER } from '@/lib/tier-display'
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
  /** When true, blur the score number and hide the tier verdict. Used for free/unsubscribed viewers. */
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
          {blurred ? (
            <div className="flex items-baseline justify-end gap-1">
              <span
                className="text-4xl sm:text-5xl font-bold text-[var(--gem-gray-500)] select-none"
                style={{ filter: 'blur(10px)' }}
                aria-hidden="true"
              >
                {Math.round(weightedScore)}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-[var(--gem-gray-400)]">/100</span>
            </div>
          ) : (
            <div className="text-4xl sm:text-5xl font-bold" style={{ color: tierColor(tier) }}>
              {Math.round(weightedScore)}
              <span className="text-2xl sm:text-3xl text-[var(--gem-gray-500)]">/100</span>
            </div>
          )}
          <div className="text-[11px] uppercase tracking-widest text-[var(--gem-gray-500)] mt-0.5">
            GEM Score
          </div>
          {blurred && (
            <div className="text-[10px] text-[var(--gem-accent)] mt-1 font-medium">
              Upgrade to unlock
            </div>
          )}
          {isOwner && !blurred && (
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

      {/* Tier ladder (GEM Verdict) — always visible. Shows all 3 tiers with score
          cutoffs; only the one the script qualifies for is filled in. Others are
          greyed out so the writer sees exactly where they stand + what's above. */}
      <div className="space-y-3">
        <span className="block text-[10px] uppercase tracking-wider text-[var(--gem-gray-500)] font-medium">GEM Verdict</span>
        <div className="grid grid-cols-3 gap-2">
          {TIER_ORDER.map(t => {
            const active = t === tier
            return (
              <div
                key={t}
                className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-[var(--gem-gray-700)] bg-transparent text-[var(--gem-gray-500)]'
                }`}
                style={active ? { backgroundColor: tierColor(t) } : undefined}
              >
                <div className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-tight ${active ? 'text-white' : 'text-[var(--gem-gray-400)]'}`}>
                  {tierLabel(t)}
                </div>
                <div className={`text-[10px] mt-1 font-medium ${active ? 'text-white/80' : 'text-[var(--gem-gray-600)]'}`}>
                  {tierCutoffLabel(t)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {displayDescription && (
        <p className="text-sm text-[var(--gem-gray-300)] max-w-lg leading-relaxed">
          {displayDescription}
        </p>
      )}

      {/* Inline "submit another" CTA — sits right under the tier summary so the
          ask (send us more work) is always adjacent to the verdict, regardless
          of tier. Works for all three tiers: greenlight writers send more to
          amplify, option-ready writers send revisions, not-ready writers send
          a different script. */}
      <Link
        href="/submit"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
      >
        <Upload size={14} />
        Send another script or draft
      </Link>

      {/* Revise CTA + Share buttons — client component, reads eval id from pathname */}
      <ReportActions title={title} score={weightedScore} tier={tier} />
    </div>
  )
}
