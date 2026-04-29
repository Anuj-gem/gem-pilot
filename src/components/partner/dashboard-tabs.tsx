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
  /** Canonical-token axes the producer-side filter UI indexes on.
   *  Populated by /partner/page.tsx shapeMatch from the eval JSON.
   *  Anuj 2026-04-30. */
  filterAxes?: {
    productionLevel: 'low' | 'medium' | 'high' | null
    castLevel: 'low' | 'medium' | 'high' | null
    budgetTier: string | null
    format: string | null
    genres: string[]
    scriptTags: string[]
  }
}

type TabKey = 'inbox' | 'slate' | 'passed'
type SortKey = 'score' | 'recent' | 'views'

type FilterAxis =
  | 'format'
  | 'budgetTier'
  | 'productionLevel'
  | 'castLevel'
  | 'genres'
  | 'scriptTags'

type FilterState = Record<FilterAxis, Set<string>>

const EMPTY_FILTER: FilterState = {
  format: new Set(),
  budgetTier: new Set(),
  productionLevel: new Set(),
  castLevel: new Set(),
  genres: new Set(),
  scriptTags: new Set(),
}

const LEVEL_LABELS: Record<'low' | 'medium' | 'high', string> = {
  low: 'Smooth',
  medium: 'Manageable',
  high: 'Complex',
}

const BUDGET_LABELS: Record<string, string> = {
  micro: 'Sub-$1M',
  indie: '$1–15M',
  mid: '$15–50M',
  studio: '$50M+',
  premium: '$50–100M',
  tentpole: '$100M+',
}

interface Props {
  matches: DashboardMatchData[]
  newMatchIds: string[]
}

export function DashboardTabs({ matches, newMatchIds }: Props) {
  const [tab, setTab] = useState<TabKey>('inbox')
  const [sort, setSort] = useState<SortKey>('score')
  const [filter, setFilter] = useState<FilterState>(() => ({ ...EMPTY_FILTER }))
  const newIdSet = useMemo(() => new Set(newMatchIds), [newMatchIds])

  function toggleFilter(axis: FilterAxis, token: string) {
    setFilter((prev) => {
      const next = { ...prev, [axis]: new Set(prev[axis]) }
      if (next[axis].has(token)) next[axis].delete(token)
      else next[axis].add(token)
      return next
    })
  }

  function clearAllFilters() {
    setFilter({
      format: new Set(),
      budgetTier: new Set(),
      productionLevel: new Set(),
      castLevel: new Set(),
      genres: new Set(),
      scriptTags: new Set(),
    })
  }

  const hasActiveFilters =
    filter.format.size > 0 ||
    filter.budgetTier.size > 0 ||
    filter.productionLevel.size > 0 ||
    filter.castLevel.size > 0 ||
    filter.genres.size > 0 ||
    filter.scriptTags.size > 0

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

  // Compute the filter option set from the FULL match list (not just the
  // active tab) so toggling tabs doesn't make filter chips disappear and
  // reappear. Counts in chip badges reflect the active tab though, so a
  // producer can see "this many in my New tab match this filter."
  const filterOptions = useMemo(
    () => buildFilterOptions(matches),
    [matches]
  )

  // Apply filters before sort. Empty axis = no constraint on that axis.
  // Within an axis multi-select is OR. Across axes is AND.
  const filtered = useMemo(() => {
    if (!hasActiveFilters) return active
    return active.filter((m) => {
      const ax = m.filterAxes
      if (filter.format.size > 0 && !(ax?.format && filter.format.has(ax.format))) return false
      if (
        filter.budgetTier.size > 0 &&
        !(ax?.budgetTier && filter.budgetTier.has(ax.budgetTier))
      ) {
        return false
      }
      if (
        filter.productionLevel.size > 0 &&
        !(ax?.productionLevel && filter.productionLevel.has(ax.productionLevel))
      ) {
        return false
      }
      if (
        filter.castLevel.size > 0 &&
        !(ax?.castLevel && filter.castLevel.has(ax.castLevel))
      ) {
        return false
      }
      if (filter.genres.size > 0) {
        const overlap = (ax?.genres ?? []).some((g) => filter.genres.has(g))
        if (!overlap) return false
      }
      if (filter.scriptTags.size > 0) {
        const overlap = (ax?.scriptTags ?? []).some((t) =>
          filter.scriptTags.has(t)
        )
        if (!overlap) return false
      }
      return true
    })
  }, [active, filter, hasActiveFilters])

  // Sort by the user-selected key. Score uses the always-raw sortScore so
  // writers who hide their number from view still rank correctly. Recent
  // sorts by createdAt (most recent first). Views sorts by aggregate
  // industry view count.
  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sort === 'recent') {
      arr.sort((a, b) => {
        const at = new Date(a.createdAt).getTime()
        const bt = new Date(b.createdAt).getTime()
        return bt - at
      })
    } else if (sort === 'views') {
      arr.sort((a, b) => {
        const av = a.stats?.views ?? 0
        const bv = b.stats?.views ?? 0
        return bv - av
      })
    } else {
      arr.sort((a, b) => {
        const av = a.sortScore ?? a.score ?? -1
        const bv = b.sortScore ?? b.score ?? -1
        return bv - av
      })
    }
    return arr
  }, [filtered, sort])

  return (
    <div>
      {/* Text-link tab strip (Gmail-style). Inbox is the default + most
          prominent; Slate and Passed sit beside it as quieter secondary
          links. The active tab gets the gold accent. */}
      <div
        className="flex items-center gap-5 mb-6 pb-3 flex-wrap"
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
        {/* Sort selector pushed to the far right of the tab row. Producer
            can toggle between Score (the default — ranked by raw score
            even when the writer hides it from view), Recent (newest
            match first), and Views (highest aggregate industry view
            count first). */}
        <div className="ml-auto flex items-center gap-1">
          <span
            className="text-[11.5px] uppercase tracking-[0.14em] font-bold mr-1"
            style={{ color: 'var(--gem-gray-500)' }}
          >
            Sort
          </span>
          <SortPill active={sort === 'score'} onClick={() => setSort('score')}>
            Score
          </SortPill>
          <SortPill active={sort === 'recent'} onClick={() => setSort('recent')}>
            Recent
          </SortPill>
          <SortPill active={sort === 'views'} onClick={() => setSort('views')}>
            Views
          </SortPill>
        </div>
      </div>

      {/* Filter bar — multi-select chips per axis. Anuj 2026-04-30:
          producer-side narrowing without leaving the page. Default state
          (no chips active) shows everything; clicking a chip toggles it
          on. Clear all wipes the whole bar. */}
      <FilterBar
        options={filterOptions}
        filter={filter}
        onToggle={toggleFilter}
        onClear={clearAllFilters}
        active={hasActiveFilters}
      />

      {active.length === 0 ? (
        <EmptyState tab={tab} />
      ) : sorted.length === 0 ? (
        <FilteredEmptyState onClear={clearAllFilters} />
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

function SortPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-semibold transition-colors"
      style={{
        color: active ? 'var(--gem-gray-50)' : 'var(--gem-gray-400)',
        background: active ? 'rgba(124,58,237,0.10)' : 'transparent',
        border: active
          ? '1px solid rgba(124,58,237,0.30)'
          : '1px solid var(--gem-gray-700)',
        padding: '4px 10px',
        borderRadius: 999,
        lineHeight: 1.1,
      }}
    >
      {children}
    </button>
  )
}

interface FilterOption {
  token: string
  label: string
  count: number
}

interface FilterOptions {
  format: FilterOption[]
  budgetTier: FilterOption[]
  productionLevel: FilterOption[]
  castLevel: FilterOption[]
  genres: FilterOption[]
  scriptTags: FilterOption[]
}

function buildFilterOptions(matches: DashboardMatchData[]): FilterOptions {
  const counts: Record<FilterAxis, Map<string, number>> = {
    format: new Map(),
    budgetTier: new Map(),
    productionLevel: new Map(),
    castLevel: new Map(),
    genres: new Map(),
    scriptTags: new Map(),
  }

  for (const m of matches) {
    const ax = m.filterAxes
    if (!ax) continue
    if (ax.format) bump(counts.format, ax.format)
    if (ax.budgetTier) bump(counts.budgetTier, ax.budgetTier)
    if (ax.productionLevel) bump(counts.productionLevel, ax.productionLevel)
    if (ax.castLevel) bump(counts.castLevel, ax.castLevel)
    for (const g of ax.genres) bump(counts.genres, g)
    for (const t of ax.scriptTags) bump(counts.scriptTags, t)
  }

  const titleCase = (s: string) =>
    s.replace(/[\s_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const sortByCount = (entries: [string, number][]) =>
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  return {
    format: sortByCount([...counts.format]).map(([token, count]) => ({
      token,
      label: titleCase(token),
      count,
    })),
    budgetTier: sortByCount([...counts.budgetTier]).map(([token, count]) => ({
      token,
      label: BUDGET_LABELS[token] ?? titleCase(token),
      count,
    })),
    productionLevel: (['low', 'medium', 'high'] as const)
      .filter((lv) => counts.productionLevel.has(lv))
      .map((lv) => ({
        token: lv,
        label: LEVEL_LABELS[lv],
        count: counts.productionLevel.get(lv) ?? 0,
      })),
    castLevel: (['low', 'medium', 'high'] as const)
      .filter((lv) => counts.castLevel.has(lv))
      .map((lv) => ({
        token: lv,
        label: LEVEL_LABELS[lv],
        count: counts.castLevel.get(lv) ?? 0,
      })),
    genres: sortByCount([...counts.genres]).map(([token, count]) => ({
      token,
      label: titleCase(token),
      count,
    })),
    scriptTags: sortByCount([...counts.scriptTags]).map(([token, count]) => ({
      token,
      label: titleCase(token.replace(/-/g, ' ')),
      count,
    })),
  }
}

function bump(m: Map<string, number>, k: string) {
  m.set(k, (m.get(k) ?? 0) + 1)
}

function FilterBar({
  options,
  filter,
  onToggle,
  onClear,
  active,
}: {
  options: FilterOptions
  filter: FilterState
  onToggle: (axis: FilterAxis, token: string) => void
  onClear: () => void
  active: boolean
}) {
  const sections: { axis: FilterAxis; label: string; opts: FilterOption[] }[] = (
    [
      { axis: 'format' as const, label: 'Format', opts: options.format },
      { axis: 'budgetTier' as const, label: 'Budget', opts: options.budgetTier },
      { axis: 'genres' as const, label: 'Genre', opts: options.genres.slice(0, 12) },
      {
        axis: 'productionLevel' as const,
        label: 'Production',
        opts: options.productionLevel,
      },
      { axis: 'castLevel' as const, label: 'Cast', opts: options.castLevel },
      { axis: 'scriptTags' as const, label: 'Tags', opts: options.scriptTags.slice(0, 16) },
    ]
  ).filter((s) => s.opts.length > 0)

  if (sections.length === 0) return null

  return (
    <div
      className="mb-5 pb-4"
      style={{ borderBottom: '1px solid var(--gem-gray-800)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p
          className="text-[11px] uppercase tracking-[0.18em] font-bold m-0"
          style={{ color: 'var(--gem-gray-500)' }}
        >
          Filter
        </p>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11.5px] font-semibold transition-colors"
            style={{
              color: 'var(--gem-accent)',
              background: 'transparent',
              padding: 0,
              border: 0,
            }}
          >
            Clear all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {sections.map((s) => (
          <div key={s.axis} className="flex flex-wrap items-baseline gap-1.5">
            <span
              className="text-[11px] uppercase tracking-[0.14em] font-bold mr-1.5 mt-1"
              style={{ color: 'var(--gem-gray-500)', minWidth: 70 }}
            >
              {s.label}
            </span>
            {s.opts.map((opt) => (
              <FilterChip
                key={`${s.axis}:${opt.token}`}
                active={filter[s.axis].has(opt.token)}
                onClick={() => onToggle(s.axis, opt.token)}
                label={opt.label}
                count={opt.count}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-baseline gap-1 text-[12px] font-semibold transition-colors"
      style={{
        color: active ? 'var(--gem-gray-50)' : 'var(--gem-gray-300)',
        background: active ? 'rgba(124,58,237,0.10)' : 'var(--gem-gray-900)',
        border: active
          ? '1px solid rgba(124,58,237,0.30)'
          : '1px solid var(--gem-gray-700)',
        padding: '4px 10px',
        borderRadius: 999,
        lineHeight: 1.1,
      }}
    >
      {label}
      <span
        className="text-[10.5px] tabular-nums"
        style={{
          color: active ? 'var(--gem-gray-300)' : 'var(--gem-gray-500)',
          fontWeight: 500,
        }}
      >
        {count}
      </span>
    </button>
  )
}

function FilteredEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="text-center rounded-2xl px-6 py-12 bg-white"
      style={{ border: '1px dashed var(--gem-gray-700)' }}
    >
      <p className="text-[15px] font-semibold text-[var(--gem-gray-100)] m-0 mb-1">
        No matches with these filters.
      </p>
      <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0 mb-3">
        Try widening your filter or clearing it entirely.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="text-[12.5px] font-semibold transition-colors"
        style={{
          color: 'var(--gem-accent)',
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.30)',
          padding: '6px 14px',
          borderRadius: 999,
        }}
      >
        Clear all filters
      </button>
    </div>
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
