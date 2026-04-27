// MatchCard — single uniform producer-dashboard card (Selznick-4 v4).
//
// Score is the producer's primary scanning signal, so it lives on the LEFT
// as a colored badge (green for 75+, amber for 50-74, gray below). Title +
// headline + tag chips run down the middle. The action row (Interested /
// Pass) sits at the bottom, full width.
//
// What's gone vs the prior split design:
//   - HeroMatchCard variant ("Top choice for you this week") — every card
//     uses the same compact treatment now. The score badge alone is the
//     ranking signal; we don't need a separate hero treatment to surface
//     the highest-scoring row.
//   - Score on the right as bare text → score is now a colored badge on
//     the left, which lands harder for someone scanning a list.
//   - "GEM score" caption under the number → dropped, the badge speaks
//     for itself.

import Link from 'next/link'
import { MatchActions } from './match-actions'

type MatchStatus = 'pending' | 'opened' | 'interested' | 'passed' | 'commented'

export interface MatchCardData {
  matchId: string
  status: MatchStatus
  title: string
  score: number | null
  headline: string | null
  tags: string[]
  createdAt: string
}

export function MatchCard({
  data,
  isNew = false,
}: {
  data: MatchCardData
  isNew?: boolean
}) {
  return (
    <div
      className="relative rounded-xl bg-white px-5 sm:px-6 py-5"
      style={{
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      {isNew && <NewPill />}
      <div className="flex gap-4 sm:gap-5 items-start">
        <ScoreBadge score={data.score} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/partner/script/${data.matchId}`}
            className="block group"
          >
            <h3 className="text-[18px] sm:text-[19px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 group-hover:text-[var(--gem-accent)] transition-colors">
              {data.title}
            </h3>
          </Link>
          {data.headline && (
            <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.5] mt-2 m-0 max-w-[60ch]">
              {data.headline}
            </p>
          )}
          {data.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2.5">
              {data.tags.map((t, i) => (
                <Tag key={i} text={t} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        className="mt-4 pt-3"
        style={{ borderTop: '1px solid var(--gem-gray-700)' }}
      >
        <MatchActions matchId={data.matchId} status={data.status} variant="card" />
      </div>
    </div>
  )
}

// Backwards-compat re-export. The prior design exposed both MatchCard and
// HeroMatchCard; v4 collapses them into one. Keeping the named export so
// stale imports don't break the build during the transition.
export const HeroMatchCard = MatchCard

function ScoreBadge({ score }: { score: number | null }) {
  // Producer-facing score badge — color-coded by tier so the producer can
  // scan a list and triage by color before reading any text.
  //   75+ → green  (greenlight territory)
  //   50–74 → amber (worth a read)
  //   <50 → gray (low-confidence)
  // Null → also gray, but with em-dash instead of a number.
  let palette: { bg: string; fg: string; border: string }
  if (typeof score !== 'number' || Number.isNaN(score)) {
    palette = {
      bg: 'var(--gem-gray-900)',
      fg: 'var(--gem-gray-500)',
      border: 'var(--gem-gray-700)',
    }
  } else if (score >= 75) {
    palette = {
      bg: 'rgba(5,150,105,0.10)',
      fg: '#059669',
      border: 'rgba(5,150,105,0.30)',
    }
  } else if (score >= 50) {
    palette = {
      bg: 'rgba(217,119,6,0.10)',
      fg: 'var(--gem-warning)',
      border: 'rgba(217,119,6,0.30)',
    }
  } else {
    palette = {
      bg: 'var(--gem-gray-900)',
      fg: 'var(--gem-gray-400)',
      border: 'var(--gem-gray-700)',
    }
  }
  const display =
    typeof score === 'number' && !Number.isNaN(score) ? score.toFixed(0) : '—'
  return (
    <div
      className="shrink-0 grid place-items-center rounded-lg w-[60px] h-[60px] sm:w-[64px] sm:h-[64px] tabular-nums"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span
        className="font-extrabold leading-none"
        style={{ color: palette.fg, fontSize: 26 }}
      >
        {display}
      </span>
    </div>
  )
}

function Tag({ text }: { text: string }) {
  return (
    <span
      className="text-[11.5px] font-medium px-2 py-0.5 rounded-full"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
        color: 'var(--gem-gray-400)',
      }}
    >
      {text}
    </span>
  )
}

function NewPill() {
  return (
    <span
      className="absolute top-3 right-3 inline-flex items-center text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full"
      style={{
        color: 'var(--gem-accent)',
        background: 'rgba(124,58,237,0.10)',
        border: '1px solid rgba(124,58,237,0.30)',
      }}
    >
      New
    </span>
  )
}
