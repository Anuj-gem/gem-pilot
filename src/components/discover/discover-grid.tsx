// DiscoverGrid — client-side sort + filter + grid renderer for /discover.
// Anuj 2026-04-30 v0.6 redesign.
//
// Server fetches the full set of public scripts once. The client owns sort
// and format filter state (URL-synced via shallow router push) so tab
// clicks don't trigger a server round trip — that was the "double-click"
// feel of the prior page.

'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'

export interface DiscoverCard {
  data: ScriptCardData
  recentTs: number
  selznick: number
  reviews: number
}

const SORTS = [
  { id: 'recent', label: 'Most recent' },
  { id: 'top_gem', label: 'Top GEM score' },
  { id: 'most_reviewed', label: 'Most reviewed' },
] as const
type SortId = (typeof SORTS)[number]['id']

const FORMATS = [
  { id: 'all', label: 'All' },
  { id: 'feature', label: 'Features' },
  { id: 'series', label: 'Series' },
] as const
type FormatId = (typeof FORMATS)[number]['id']

interface Props {
  cards: DiscoverCard[]
  initialSort: SortId
  initialFormat: FormatId
}

export function DiscoverGrid({ cards, initialSort, initialFormat }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [sort, setSort] = useState<SortId>(initialSort)
  const [format, setFormat] = useState<FormatId>(initialFormat)
  const [, startTransition] = useTransition()

  // Sync URL (shallow) so refreshes / share-links keep state — without
  // forcing a server re-render of the whole page.
  useEffect(() => {
    const params = new URLSearchParams(sp?.toString() || '')
    if (sort === 'recent') params.delete('sort')
    else params.set('sort', sort)
    if (format === 'all') params.delete('format')
    else params.set('format', format)
    const qs = params.toString()
    const next = qs ? `/discover?${qs}` : '/discover'
    // Replace (not push) so back-button isn't polluted by tab clicks.
    startTransition(() => {
      router.replace(next, { scroll: false })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, format])

  const visible = useMemo(() => {
    let list = cards
    if (format !== 'all') {
      const dbValue = format === 'feature' ? 'Feature film' : 'Series'
      list = list.filter((c) => c.data.format === dbValue)
    }
    const key: keyof DiscoverCard =
      sort === 'top_gem' ? 'selznick'
      : sort === 'most_reviewed' ? 'reviews'
      : 'recentTs'
    return [...list].sort((a, b) => Number(b[key]) - Number(a[key])).slice(0, 60)
  }, [cards, sort, format])

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
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
        <div className="flex items-center gap-1">
          {FORMATS.map((f) => {
            const active = f.id === format
            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center text-sm text-gray-400">
          No scripts here yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((c) => (
            <ScriptCard key={c.data.submission_id} s={c.data} density="poster" />
          ))}
        </div>
      )}
    </>
  )
}
