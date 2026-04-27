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

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { HeroMatchCard, MatchCard, type MatchCardData } from './match-card'
import { MatchViewTracker } from './match-view-tracker'

export interface DashboardMatchData extends MatchCardData {
  unmatchedAt: string | null
  /** Writer-editable tag tokens from script_submissions.tags. Drives the
   *  filter chips above the tabs. Distinct from the display `tags` on the
   *  card itself (which are pretty format/genre/budget summary chips). */
  scriptTags: string[]
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
  // Tag filter — applies to all 3 tabs. AND semantics (a script must
  // include EVERY selected tag to stay visible) since that's the most
  // common pattern for narrowing an inbox.
  const [tagFilter, setTagFilter] = useState<string[]>([])

  const newIdSet = useMemo(() => new Set(newMatchIds), [newMatchIds])

  // Filtered matches — apply the tag filter BEFORE splitting into tab
  // buckets so the badge counts reflect what's visible under the active
  // filter, not the raw inventory.
  const filteredMatches = useMemo(() => {
    if (tagFilter.length === 0) return matches
    return matches.filter((m) => {
      const set = new Set((m.scriptTags ?? []).map((t) => t.toLowerCase()))
      return tagFilter.every((t) => set.has(t.toLowerCase()))
    })
  }, [matches, tagFilter])

  // Tab buckets — kept stable so badge counts don't flicker mid-navigation.
  const { inbox, slate, passed } = useMemo(() => {
    const inbox: DashboardMatchData[] = []
    const slate: DashboardMatchData[] = []
    const passed: DashboardMatchData[] = []
    for (const m of filteredMatches) {
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
  }, [filteredMatches])

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

  // Suggestion universe — every tag that appears anywhere across the
  // producer's full inventory. Sorted alphabetically for predictability.
  const allKnownTags = useMemo(() => {
    const set = new Set<string>()
    for (const m of matches) {
      for (const t of m.scriptTags ?? []) {
        if (typeof t === 'string' && t.trim()) set.add(t.toLowerCase())
      }
    }
    return Array.from(set).sort()
  }, [matches])

  return (
    <div>
      {/* Tag filter — sits ABOVE the tab strip and applies to every tab.
          Producers can pile up multiple tags (AND semantics) to narrow on
          things like "female-lead + period-piece + indie". */}
      {allKnownTags.length > 0 && (
        <TagFilterBar
          allTags={allKnownTags}
          selected={tagFilter}
          onAdd={(t) =>
            setTagFilter((prev) =>
              prev.includes(t) ? prev : [...prev, t]
            )
          }
          onRemove={(t) =>
            setTagFilter((prev) => prev.filter((x) => x !== t))
          }
          onClear={() => setTagFilter([])}
        />
      )}

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
          <MatchViewTracker matchId={hero.matchId} initialStatus={hero.status}>
            <HeroMatchCard data={hero} />
          </MatchViewTracker>
        </div>
      )}
      {visibleRest.length > 0 && (
        <div className="space-y-3">
          {visibleRest.map((m) => (
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

// TagFilterBar — autocomplete + selected chips. Producers narrow their
// inbox by piling up tags (AND semantics applied by the parent).
//
// Suggestions: any tag that appears on at least one match in the producer's
// inventory. Filtered as the producer types. Click a suggestion or hit
// Enter on an exact-match query to add it. Each selected tag renders as a
// chip with an "x" to remove. "Clear filters" resets the list.
function TagFilterBar({
  allTags,
  selected,
  onAdd,
  onRemove,
  onClear,
}: {
  allTags: string[]
  selected: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Click-outside to close the suggestion popover.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const selectedSet = new Set(selected)
    return allTags
      .filter((t) => !selectedSet.has(t))
      .filter((t) => (q.length === 0 ? true : t.includes(q)))
      .slice(0, 12)
  }, [allTags, selected, query])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const q = query.trim().toLowerCase()
      if (!q) return
      // Prefer an exact suggestion match; otherwise add the typed token if
      // it exists in the universe (no point filtering on a tag no script
      // has).
      const match =
        suggestions.find((s) => s === q) ?? suggestions[0] ?? null
      if (match) {
        onAdd(match)
        setQuery('')
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="mb-5">
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] pt-2 shrink-0">
          Filter by tag
        </span>
        <div className="flex-1 min-w-[220px] relative">
          <div
            className="flex items-center gap-1.5 flex-wrap rounded-lg px-2 py-1.5"
            style={{
              background: '#fff',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            {selected.map((t) => (
              <FilterChip key={t} tag={t} onRemove={() => onRemove(t)} />
            ))}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={
                selected.length === 0 ? 'Add a tag (e.g. female-lead)' : 'Add another'
              }
              className="bg-transparent outline-none text-[13px] text-[var(--gem-gray-100)] placeholder:text-[var(--gem-gray-500)] py-1 px-1 flex-1 min-w-[120px]"
              aria-label="Filter matches by tag"
            />
          </div>
          {open && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-1 z-10 rounded-lg overflow-hidden max-h-[260px] overflow-y-auto"
              style={{
                background: '#fff',
                border: '1px solid var(--gem-gray-700)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    // Use mousedown so the click fires before the input
                    // blur handler closes the popover.
                    e.preventDefault()
                    onAdd(s)
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[var(--gem-gray-200)] hover:bg-[var(--gem-gray-900)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12.5px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-accent)] transition-colors pt-2 shrink-0"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

function FilterChip({
  tag,
  onRemove,
}: {
  tag: string
  onRemove: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-[12px] font-medium"
      style={{
        background: 'rgba(124,58,237,0.08)',
        border: '1px solid rgba(124,58,237,0.30)',
        color: 'var(--gem-accent)',
      }}
    >
      {tag}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove tag ${tag}`}
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full hover:bg-white transition-colors"
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </span>
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
