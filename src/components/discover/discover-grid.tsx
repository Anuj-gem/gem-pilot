// DiscoverGrid — client-side sort + filter + grid renderer for the
// Community page.
//
// Filters live in a sheet (FiltersSheet) opened by a single Filters
// button — no inline pill explosion. URL syncs sort + filters so
// share-links keep state.
//
// Anuj 2026-04-30 v0.7.

'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'
import {
  FiltersSheet, FiltersTrigger,
  type FormatId, type GenreId, type BudgetId, type FilterValue, activeFilterCount,
} from './filters-sheet'

export interface DiscoverCard {
  data: ScriptCardData
  recentTs: number
  selznick: number
  heat: number
  reviews: number
  /** Whether the writer has elected to show their score publicly. When
   *  false, the script is excluded from Top-GEM sort entirely — you
   *  can't hide your score and still rank on it. */
  scoreVisible: boolean
  /** Raw genre_primary string from the eval, lowercased + stripped to
   *  alpha so we can match GenreId loosely. */
  genreKey: string | null
  /** budget_tier from evaluation.packaging.budget_tier.tier — already
   *  normalized to the producer-lane vocabulary. Null if unknown. */
  budget: BudgetId | null
}

const SORTS = [
  { id: 'top_gem', label: 'GEM Score' },
  { id: 'top_heat', label: 'Heat' },
  { id: 'recent', label: 'Recent' },
] as const
type SortId = (typeof SORTS)[number]['id']

function genreMatches(genreKey: string | null, want: GenreId): boolean {
  if (!genreKey) return false
  switch (want) {
    case 'sci-fi':       return genreKey.includes('scifi') || genreKey.includes('sciencefiction')
    case 'thriller':     return genreKey.includes('thrill')
    case 'horror':       return genreKey.includes('horror')
    case 'fantasy':      return genreKey.includes('fantas')
    case 'crime':        return genreKey.includes('crime') || genreKey.includes('noir')
    case 'romance':      return genreKey.includes('romance') || genreKey.includes('romcom') || genreKey.includes('romanticcomedy')
    case 'action':       return genreKey.includes('action') || genreKey.includes('adventure')
    case 'family':       return genreKey.includes('family') || genreKey.includes('animat')
    case 'documentary':  return genreKey.includes('document')
    case 'musical':      return genreKey.includes('musical')
    case 'western':      return genreKey.includes('western')
    case 'comedy':       return genreKey.includes('comedy') || genreKey.includes('romcom')
    case 'drama':        return genreKey.includes('drama') || genreKey.includes('biograph') || genreKey.includes('history')
    default:             return false
  }
}

interface Props {
  cards: DiscoverCard[]
  initialSort: SortId
  initialFilters: FilterValue
  /** Base path for URL sync — defaults to '/community'. */
  basePath?: string
  /** Whether the viewer is a GEM insider (Pro member). When false,
   *  author names are blurred and report links are locked. */
  isInsider?: boolean
}

export function DiscoverGrid({ cards, initialSort, initialFilters, basePath = '/discover', isInsider = false }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [sort, setSort] = useState<SortId>(initialSort)
  const [filters, setFilters] = useState<FilterValue>(initialFilters)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [, startTransition] = useTransition()

  // Sync URL whenever state changes.
  useEffect(() => {
    const params = new URLSearchParams(sp?.toString() || '')
    if (sort === 'top_gem') params.delete('sort'); else params.set('sort', sort)
    if (filters.format === 'all') params.delete('format'); else params.set('format', filters.format)
    if (filters.genres.length === 0) params.delete('genres'); else params.set('genres', filters.genres.join(','))
    if (filters.budgets.length === 0) params.delete('budgets'); else params.set('budgets', filters.budgets.join(','))
    const qs = params.toString()
    const next = qs ? `${basePath}?${qs}` : basePath
    startTransition(() => router.replace(next, { scroll: false }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, filters])

  const visible = useMemo(() => {
    let list = cards
    // Format
    if (filters.format !== 'all') {
      const dbValue = filters.format === 'feature' ? 'Feature film' : 'Series'
      list = list.filter((c) => c.data.format === dbValue)
    }
    // Genre — ANY of the chosen genres matches
    if (filters.genres.length > 0) {
      list = list.filter((c) => filters.genres.some((g) => genreMatches(c.genreKey, g)))
    }
    // Budget — ANY of the chosen tiers matches the script's tier
    if (filters.budgets.length > 0) {
      list = list.filter((c) => c.budget != null && filters.budgets.includes(c.budget))
    }
    // Top-GEM sort excludes scripts where the writer hid their score.
    if (sort === 'top_gem') {
      list = list.filter((c) => c.scoreVisible)
    }
    const key: 'selznick' | 'heat' | 'recentTs' =
      sort === 'top_gem' ? 'selznick'
      : sort === 'top_heat' ? 'heat'
      : 'recentTs'
    return [...list].sort((a, b) => Number(b[key]) - Number(a[key])).slice(0, 60)
  }, [cards, sort, filters])

  const filterCount = activeFilterCount(filters)

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        {/* Sort pills */}
        <div className="flex items-center gap-1">
          {SORTS.map((s) => {
            const active = s.id === sort
            return (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Single Filters trigger — opens the sheet with everything */}
        <FiltersTrigger count={filterCount} onClick={() => setSheetOpen(true)} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-400">
          No scripts match these filters yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((c) => (
            <ScriptCard key={c.data.submission_id} s={c.data} density="poster" isInsider={isInsider} />
          ))}
        </div>
      )}

      <FiltersSheet
        open={sheetOpen}
        initial={filters}
        onClose={() => setSheetOpen(false)}
        onApply={setFilters}
      />
    </>
  )
}
