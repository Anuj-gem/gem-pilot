// DiscoverGrid — client-side sort + filter + grid renderer for the
// Community page. The server fetches the full set of public scripts
// once; sort/format/genre state is owned client-side and URL-synced
// shallowly so tab clicks don't trigger a server round-trip.
//
// Anuj 2026-04-30 v0.7 — added genre filter (writer-side echo of the
// producer "lane" tag set), dropped the activity strip + page title.

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
  { id: 'all', label: 'All formats' },
  { id: 'feature', label: 'Features' },
  { id: 'series', label: 'Series' },
] as const
type FormatId = (typeof FORMATS)[number]['id']

// Lane-style genre filter — mirrors producer-onboarding GENRES so writers
// can dial into the same buckets producers use. "All" sits at the front;
// the rest are alpha-ish by use frequency.
const GENRES = [
  { id: 'all', label: 'All genres' },
  { id: 'drama', label: 'Drama' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'horror', label: 'Horror' },
  { id: 'sci-fi', label: 'Sci-Fi' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'crime', label: 'Crime' },
  { id: 'romance', label: 'Romance' },
  { id: 'action', label: 'Action' },
  { id: 'family', label: 'Family' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'musical', label: 'Musical' },
  { id: 'western', label: 'Western' },
] as const
type GenreId = (typeof GENRES)[number]['id']

/** Loose match between a card's genre string and a filter id. The
 *  evaluation `genre_primary` is free-form ("Sci-Fi", "Sci Fi", "Crime
 *  Drama", "Romantic Comedy"…) so we normalize before comparing. */
function genreMatches(cardGenre: string | null | undefined, filterId: GenreId): boolean {
  if (filterId === 'all') return true
  if (!cardGenre) return false
  const k = cardGenre.toLowerCase().replace(/[^a-z]/g, '')
  switch (filterId) {
    case 'sci-fi':       return k.includes('scifi') || k.includes('sciencefiction')
    case 'thriller':     return k.includes('thrill')
    case 'horror':       return k.includes('horror')
    case 'fantasy':      return k.includes('fantas')
    case 'crime':        return k.includes('crime') || k.includes('noir')
    case 'romance':      return k.includes('romance') || k.includes('romcom') || k.includes('romanticcomedy')
    case 'action':       return k.includes('action') || k.includes('adventure')
    case 'family':       return k.includes('family') || k.includes('animat')
    case 'documentary':  return k.includes('document')
    case 'musical':      return k.includes('musical')
    case 'western':      return k.includes('western')
    case 'comedy':       return k.includes('comedy') || k.includes('romcom')
    case 'drama':        return k.includes('drama') || k.includes('biograph') || k.includes('history')
    default:             return false
  }
}

interface Props {
  cards: DiscoverCard[]
  initialSort: SortId
  initialFormat: FormatId
  initialGenre: GenreId
}

export function DiscoverGrid({ cards, initialSort, initialFormat, initialGenre }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [sort, setSort] = useState<SortId>(initialSort)
  const [format, setFormat] = useState<FormatId>(initialFormat)
  const [genre, setGenre] = useState<GenreId>(initialGenre)
  const [, startTransition] = useTransition()

  // Sync URL (shallow) so refreshes / share-links keep state — without
  // forcing a server re-render of the whole page.
  useEffect(() => {
    const params = new URLSearchParams(sp?.toString() || '')
    if (sort === 'recent') params.delete('sort'); else params.set('sort', sort)
    if (format === 'all') params.delete('format'); else params.set('format', format)
    if (genre === 'all') params.delete('genre'); else params.set('genre', genre)
    const qs = params.toString()
    const next = qs ? `/discover?${qs}` : '/discover'
    startTransition(() => {
      router.replace(next, { scroll: false })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, format, genre])

  const visible = useMemo(() => {
    let list = cards
    if (format !== 'all') {
      const dbValue = format === 'feature' ? 'Feature film' : 'Series'
      list = list.filter((c) => c.data.format === dbValue)
    }
    if (genre !== 'all') {
      list = list.filter((c) => genreMatches(c.data.genre, genre))
    }
    const key: keyof DiscoverCard =
      sort === 'top_gem' ? 'selznick'
      : sort === 'most_reviewed' ? 'reviews'
      : 'recentTs'
    return [...list].sort((a, b) => Number(b[key]) - Number(a[key])).slice(0, 60)
  }, [cards, sort, format, genre])

  return (
    <>
      {/* Filter bar — sticks at the top, app-shell feel (no big H1) */}
      <div className="mb-5 space-y-2.5">
        {/* Row 1: sort + format */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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

        {/* Row 2: genre lane filter — horizontal scroll on overflow */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
          {GENRES.map((g) => {
            const active = g.id === genre
            return (
              <button
                key={g.id}
                onClick={() => setGenre(g.id)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  active
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-400">
          No scripts match these filters yet.
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
