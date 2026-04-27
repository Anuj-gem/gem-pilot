'use client'

// DashboardTabs — three-tab client switcher for the producer dashboard.
//
//   - Inbox    (default): pending | opened, not unmatched. The fresh stuff.
//                Hero card on top + list, sortable.
//   - Slate              : interested | commented, not unmatched. Active
//                pursuits — no hero, just a sortable list.
//   - Passed             : passed OR unmatched. Quietest — compact list,
//                small header, dimmer styling.
//
// Server passes in everything pre-shaped + the "new since visit" id set as
// an array. Sorting + filtering happens entirely client-side.

import { useMemo, useState } from 'react'
import { HeroMatchCard, MatchCard, type MatchCardData } from './match-card'

export interface DashboardMatchData extends MatchCardData {
  unmatchedAt: string | null
}

type SortMode = 'score' | 'recent' | 'status'
type TabKey = 'inbox' | 'slate' | 'passed'

const STATUS_RANK: Record<MatchCardData['status'], number> = {
  interested: 0,
  commented: 1,
  opened: 2,
  pending: 3,
  passed: 4,
}

interface Props {
  matches: DashboardMatchData[]
  newMatchIds: string[]
}

// Inbox pagination — producers see a stable inbox of 10 (hero + 9 cards) on
// first render. Clicking "Load more" reveals the next batch. The window
// resets when the producer switches tabs so the count badge always reflects
// real inventory, not what's been disclosed.
const INBOX_PAGE_SIZE = 10

export function DashboardTabs({ matches, newMatchIds }: Props) {
  const [tab, setTab] = useState<TabKey>('inbox')
  const [sort, setSort] = useState<SortMode>('score')
  const [inboxVisible, setInboxVisible] = useState<number>(INBOX_PAGE_SIZE)

  const newIdSet = useMemo(() => new Set(newMatchIds), [newMatchIds])

  // Tab buckets — kept stable so badge counts don't flicker mid-navigation.
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

  const active =
    tab === 'inbox' ? inbox : tab === 'slate' ? slate : passed

  const sorted = useMemo(() => {
    const arr = [...active]
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
  }, [active, sort])

  // Inbox hero — highest-scoring inbox row, only shown on the Inbox tab.
  const hero = useMemo(() => {
    if (tab !== 'inbox' || inbox.length === 0) return null
    return [...inbox].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0] ?? null
  }, [tab, inbox])

  const restWithoutHero = useMemo(() => {
    if (!hero) return sorted
    return sorted.filter((m) => m.matchId !== hero.matchId)
  }, [sorted, hero])

  return (
    <div>
      {/* Tab strip */}
      <div
        className="flex items-center gap-1 mb-6"
        style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
      >
        <TabButton
          active={tab === 'inbox'}
          onClick={() => setTab('inbox')}
          label="Inbox"
          count={inbox.length}
        />
        <TabButton
          active={tab === 'slate'}
          onClick={() => setTab('slate')}
          label="Slate"
          count={slate.length}
        />
        <TabButton
          active={tab === 'passed'}
          onClick={() => setTab('passed')}
          label="Passed"
          count={passed.length}
          quiet
        />
      </div>

      {/* Sort row — only when there's enough content to bother */}
      {active.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-400)]">
            {tab === 'inbox'
              ? 'Inbox'
              : tab === 'slate'
                ? 'Your slate'
                : 'Passed & ended'}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <SortButton
              active={sort === 'score'}
              onClick={() => setSort('score')}
              label="Score"
            />
            <SortButton
              active={sort === 'recent'}
              onClick={() => setSort('recent')}
              label="Most recent"
            />
            <SortButton
              active={sort === 'status'}
              onClick={() => setSort('status')}
              label="Status"
            />
          </div>
        </div>
      )}

      {/* Body */}
      {active.length === 0 ? (
        <EmptyState tab={tab} />
      ) : tab === 'inbox' ? (
        <InboxBody
          hero={hero}
          rest={restWithoutHero}
          newIdSet={newIdSet}
          visibleCount={inboxVisible}
          onLoadMore={() =>
            setInboxVisible((n) =>
              Math.min(n + INBOX_PAGE_SIZE, inbox.length)
            )
          }
        />
      ) : tab === 'slate' ? (
        <div className="space-y-3">
          {sorted.map((m) => (
            <MatchCard
              key={m.matchId}
              data={m}
              isNew={newIdSet.has(m.matchId)}
            />
          ))}
        </div>
      ) : (
        // Passed tab — render compact rows. We re-use MatchCard for
        // consistency but wrap in a dimmed container.
        <div className="space-y-2 opacity-90">
          {sorted.map((m) => (
            <CompactPassedRow key={m.matchId} data={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function TabButton({
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
      className="inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-semibold transition-colors"
      style={{
        color: active
          ? 'var(--gem-accent)'
          : quiet
            ? 'var(--gem-gray-500)'
            : 'var(--gem-gray-300)',
        borderBottom: active
          ? '2px solid var(--gem-accent)'
          : '2px solid transparent',
        marginBottom: -1,
        background: 'transparent',
      }}
    >
      {label}
      <span
        className="inline-flex items-center justify-center text-[11px] font-bold rounded-full px-1.5 min-w-[20px] h-[20px]"
        style={{
          background: active
            ? 'rgba(124,58,237,0.10)'
            : 'var(--gem-gray-900)',
          border: active
            ? '1px solid rgba(124,58,237,0.30)'
            : '1px solid var(--gem-gray-700)',
          color: active
            ? 'var(--gem-accent)'
            : quiet
              ? 'var(--gem-gray-500)'
              : 'var(--gem-gray-400)',
        }}
      >
        {count}
      </span>
    </button>
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

// InboxBody — wraps the hero + paginated list. The hero counts as 1 of the
// 10 default-visible cards, so the list below it shows up to (visibleCount
// - 1) cards. The "Load more" button stays put until the producer has seen
// every card in their lane, at which point it disappears.
function InboxBody({
  hero,
  rest,
  newIdSet,
  visibleCount,
  onLoadMore,
}: {
  hero: DashboardMatchData | null
  rest: DashboardMatchData[]
  newIdSet: Set<string>
  visibleCount: number
  onLoadMore: () => void
}) {
  const restCap = hero ? Math.max(0, visibleCount - 1) : visibleCount
  const visibleRest = rest.slice(0, restCap)
  const remaining = Math.max(0, rest.length - visibleRest.length)

  return (
    <>
      {hero && (
        <div className="mb-8">
          <HeroMatchCard data={hero} />
        </div>
      )}
      {visibleRest.length > 0 && (
        <div className="space-y-3">
          {visibleRest.map((m) => (
            <MatchCard
              key={m.matchId}
              data={m}
              isNew={newIdSet.has(m.matchId)}
            />
          ))}
        </div>
      )}
      {remaining > 0 && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-4 py-2 transition-all duration-150 hover:brightness-105 active:scale-[0.98]"
            style={{
              border: '1px solid var(--gem-gray-700)',
              background: '#fff',
              color: 'var(--gem-gray-200)',
            }}
          >
            Load more
            <span className="text-[var(--gem-gray-500)] font-normal">
              ({remaining} more in your lane)
            </span>
          </button>
        </div>
      )}
    </>
  )
}

function CompactPassedRow({ data }: { data: DashboardMatchData }) {
  const reason =
    data.unmatchedAt
      ? 'Match ended'
      : data.status === 'passed'
        ? 'Passed'
        : ''
  return (
    <a
      href={`/partner/script/${data.matchId}`}
      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-white"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[var(--gem-gray-200)] truncate">
          {data.title}
        </div>
        {data.headline && (
          <div className="text-[12.5px] text-[var(--gem-gray-500)] truncate mt-0.5">
            {data.headline}
          </div>
        )}
      </div>
      {typeof data.score === 'number' && (
        <div className="text-[14px] font-bold tabular-nums text-[var(--gem-gray-400)] shrink-0">
          {data.score.toFixed(1)}
        </div>
      )}
      {reason && (
        <span
          className="text-[10.5px] uppercase tracking-[0.16em] font-semibold rounded-full px-2 py-0.5 shrink-0"
          style={{
            border: '1px solid var(--gem-gray-700)',
            color: 'var(--gem-gray-500)',
            background: '#fff',
          }}
        >
          {reason}
        </span>
      )}
    </a>
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
      className="text-center rounded-2xl px-6 py-14"
      style={{
        border: '1px dashed var(--gem-gray-700)',
        background: 'var(--gem-gray-900)',
      }}
    >
      <p className="text-[15px] font-semibold text-[var(--gem-gray-100)] m-0 mb-1">
        {title}
      </p>
      <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0">{body}</p>
    </div>
  )
}
