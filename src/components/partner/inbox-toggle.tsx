'use client'

// InboxToggle — client component that switches between the producer's
// "inbox" (hero + top 8 cards) and the full-list view (all matches in
// their lane, up to 100). Server fetches everything once; this just
// toggles which slice renders. Sort controls only apply to the
// full-list view.

import { useMemo, useState } from 'react'
import { HeroMatchCard, MatchCard, type MatchCardData } from './match-card'

type SortMode = 'score' | 'recent' | 'status'

// Status sort priority for the "Status" sort option. Mirrors the
// page-level STATUS_RANK so the most actionable items come first.
const STATUS_RANK: Record<MatchCardData['status'], number> = {
  interested: 0,
  commented: 1,
  opened: 2,
  pending: 3,
  passed: 4,
}

interface Props {
  hero: MatchCardData | null
  // All matches except the hero, already pre-sorted by score DESC by the
  // server. The first 8 are the default-mode "more matches" rail.
  restByScore: MatchCardData[]
  // Same set as restByScore but the order doesn't matter — we re-sort
  // client-side based on the active SortMode.
  allMatches: MatchCardData[]
  // IDs of matches whose created_at > the producer's last visit. Comes
  // across as an array because Sets don't serialize across the
  // server→client boundary.
  newMatchIds: string[]
  totalCount: number
}

export function InboxToggle({
  hero,
  restByScore,
  allMatches,
  newMatchIds,
  totalCount,
}: Props) {
  const [view, setView] = useState<'inbox' | 'all'>('inbox')
  const [sort, setSort] = useState<SortMode>('score')

  const newIdSet = useMemo(() => new Set(newMatchIds), [newMatchIds])

  const top8 = useMemo(() => restByScore.slice(0, 8), [restByScore])

  const sortedAll = useMemo(() => {
    const arr = [...allMatches]
    if (sort === 'score') {
      arr.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    } else if (sort === 'recent') {
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } else if (sort === 'status') {
      arr.sort((a, b) => {
        const ar = STATUS_RANK[a.status] ?? 99
        const br = STATUS_RANK[b.status] ?? 99
        if (ar !== br) return ar - br
        return (b.score ?? -1) - (a.score ?? -1)
      })
    }
    return arr
  }, [allMatches, sort])

  if (view === 'inbox') {
    return (
      <>
        {hero && (
          <div className="mb-8">
            <HeroMatchCard data={hero} />
          </div>
        )}
        {top8.length > 0 && (
          <>
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-400)] m-0">
                More matches in your lane
              </h3>
              <span className="text-[12.5px] text-[var(--gem-gray-400)]">
                Top {top8.length} by score
              </span>
            </div>
            <div className="space-y-3">
              {top8.map((m) => (
                <MatchCard
                  key={m.matchId}
                  data={m}
                  isNew={newIdSet.has(m.matchId)}
                />
              ))}
            </div>
          </>
        )}
        {totalCount > top8.length && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setView('all')}
              className="text-[13.5px] font-medium text-[var(--gem-accent)] hover:text-[var(--gem-accent-hover)] transition-colors"
            >
              Browse all {totalCount} matches in your lane →
            </button>
          </div>
        )}
      </>
    )
  }

  // Full-list view
  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <h3 className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-400)] m-0">
          All matches in your lane
        </h3>
        <span className="text-[12.5px] text-[var(--gem-gray-400)]">
          {sortedAll.length}{' '}
          {sortedAll.length === 1 ? 'script' : 'scripts'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <SortButton
            active={sort === 'score'}
            onClick={() => setSort('score')}
            label="Score (high to low)"
          />
          <SortButton
            active={sort === 'recent'}
            onClick={() => setSort('recent')}
            label="Most recent"
          />
          <SortButton
            active={sort === 'status'}
            onClick={() => setSort('status')}
            label="Status (interested first)"
          />
        </div>
      </div>
      <div className="space-y-3">
        {sortedAll.map((m) => (
          <MatchCard
            key={m.matchId}
            data={m}
            isNew={newIdSet.has(m.matchId)}
          />
        ))}
      </div>
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setView('inbox')}
          className="text-[13.5px] font-medium text-[var(--gem-accent)] hover:text-[var(--gem-accent-hover)] transition-colors"
        >
          ← Back to inbox
        </button>
      </div>
    </>
  )
}

function SortButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-medium px-2.5 py-1 rounded-md transition-colors"
      style={{
        background: active ? 'rgba(124,58,237,0.10)' : '#fff',
        border: active
          ? '1px solid rgba(124,58,237,0.30)'
          : '1px solid var(--gem-gray-700)',
        color: active ? 'var(--gem-accent)' : 'var(--gem-gray-300)',
      }}
    >
      {label}
    </button>
  )
}
