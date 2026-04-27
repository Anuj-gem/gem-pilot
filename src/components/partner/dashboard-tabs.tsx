'use client'

// DashboardTabs — three-view producer dashboard switcher (Selznick-4 v4).
//
// Visual treatment downgraded from segmented pills to text-link tabs (Gmail
// label style). The Inbox view is the default; Slate and Passed are
// secondary links in the same row.
//
// What's gone vs the prior pill-tab version:
//   - Sort row (Score / Most recent / Status) → default to score desc
//   - Tag filter bar → dropped entirely
//   - "Hero" Top-choice card → all cards are uniform compact treatment
//   - Pagination "Load more" → show every match, scroll
//   - Per-tab section headers (the verbose "Your slate" / "Passed & ended"
//     copy above the list) → tab label IS the header
//
// The MatchViewTracker still wraps each card so passive scroll-past flips
// pending → opened. That's the whole point of the dashboard view-tracking
// behavior, can't drop it.

import { useMemo, useState } from 'react'
import { MatchCard, type MatchCardData } from './match-card'
import { MatchViewTracker } from './match-view-tracker'

export interface DashboardMatchData extends MatchCardData {
  unmatchedAt: string | null
  /** Writer-editable tag tokens from script_submissions.tags. Carried
   *  through even though the v4 dashboard doesn't surface a filter UI —
   *  removing it from the type would ripple through callers and we'd
   *  rather keep the option open. */
  scriptTags: string[]
}

type TabKey = 'inbox' | 'slate' | 'passed'

interface Props {
  matches: DashboardMatchData[]
  newMatchIds: string[]
}

export function DashboardTabs({ matches, newMatchIds }: Props) {
  const [tab, setTab] = useState<TabKey>('inbox')
  const newIdSet = useMemo(() => new Set(newMatchIds), [newMatchIds])

  // Tab buckets — stable so the count badges don't flicker mid-navigation.
  const { inbox, slate, passed } = useMemo(() => {
    const inbox: DashboardMatchData[] = []
    const slate: DashboardMatchData[] = []
    const passed: DashboardMatchData[] = []
    for (const m of matches) {
      if (m.unmatchedAt || m.status === 'passed') {
        passed.push(m)
        continue
      }
      if (m.status === 'pending' || m.status === 'opened') {
        inbox.push(m)
      } else if (m.status === 'interested' || m.status === 'commented') {
        slate.push(m)
      }
    }
    return { inbox, slate, passed }
  }, [matches])

  const active = tab === 'inbox' ? inbox : tab === 'slate' ? slate : passed

  // Default sort = score desc. The producer's primary signal is score, and
  // we no longer offer a sort toggle.
  const sorted = useMemo(() => {
    const arr = [...active]
    arr.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    return arr
  }, [active])

  return (
    <div>
      {/* Text-link tab strip (Gmail-style). Inbox is the default + most
          prominent; Slate and Passed sit beside it as quieter secondary
          links. The active tab gets the gold accent. */}
      <div
        className="flex items-center gap-5 mb-6 pb-3"
        style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
      >
        <TabLink
          active={tab === 'inbox'}
          onClick={() => setTab('inbox')}
          label="New"
          count={inbox.length}
        />
        <TabLink
          active={tab === 'slate'}
          onClick={() => setTab('slate')}
          label="Slate"
          count={slate.length}
        />
        <TabLink
          active={tab === 'passed'}
          onClick={() => setTab('passed')}
          label="Passed"
          count={passed.length}
          quiet
        />
      </div>

      {active.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => (
            <MatchViewTracker
              key={m.matchId}
              matchId={m.matchId}
              initialStatus={m.status}
            >
              <MatchCard data={m} isNew={newIdSet.has(m.matchId)} />
            </MatchViewTracker>
          ))}
        </div>
      )}
    </div>
  )
}

function TabLink({
  active,
  onClick,
  label,
  count,
  quiet = false,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  quiet?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-baseline gap-1.5 text-[14px] transition-colors"
      style={{
        color: active
          ? 'var(--gem-gray-50)'
          : quiet
            ? 'var(--gem-gray-500)'
            : 'var(--gem-gray-400)',
        fontWeight: active ? 600 : 500,
        background: 'transparent',
        padding: 0,
        borderBottom: active
          ? '2px solid var(--gem-gold)'
          : '2px solid transparent',
        paddingBottom: 4,
        marginBottom: -4,
      }}
    >
      {label}
      {count > 0 && (
        <span
          className="text-[11.5px] tabular-nums"
          style={{
            color: active ? 'var(--gem-gray-300)' : 'var(--gem-gray-500)',
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({ tab }: { tab: TabKey }) {
  let title = 'Nothing here yet.'
  let body = ''
  if (tab === 'inbox') {
    title = 'Inbox is clear.'
    body = 'New matches in your lane will land here.'
  } else if (tab === 'slate') {
    title = 'Your slate is empty.'
    body = 'Mark a match Interested in your inbox to start your slate.'
  } else {
    title = 'Nothing passed yet.'
    body = 'Anything you pass on or unmatch ends up here.'
  }
  return (
    <div
      className="text-center rounded-2xl px-6 py-12 bg-white"
      style={{ border: '1px dashed var(--gem-gray-700)' }}
    >
      <p className="text-[15px] font-semibold text-[var(--gem-gray-100)] m-0 mb-1">
        {title}
      </p>
      <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0">{body}</p>
    </div>
  )
}
