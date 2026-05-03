'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const FORMATS = [
  { value: 'all', label: 'All formats' },
  { value: 'feature', label: 'Feature film' },
  { value: 'series', label: 'Series' },
]

const GENRES = [
  { value: 'all', label: 'All genres' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'horror', label: 'Horror' },
  { value: 'drama', label: 'Drama' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'romance', label: 'Romance' },
  { value: 'crime', label: 'Crime' },
  { value: 'action', label: 'Action' },
]

const BUDGETS = [
  { value: 'all', label: 'All budgets' },
  { value: 'micro', label: 'Micro' },
  { value: 'indie', label: 'Indie' },
  { value: 'mid', label: 'Mid' },
  { value: 'studio', label: 'Studio' },
  { value: 'premium', label: 'Premium' },
]

interface OpportunitiesFilterProps {
  currentFormat: string
  currentGenre: string
  currentBudget: string
}

export function OpportunitiesFilter({ currentFormat, currentGenre, currentBudget }: OpportunitiesFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const qs = params.toString()
    router.push(`/opportunities${qs ? `?${qs}` : ''}`)
  }

  const selectClass = "text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-400 transition-colors cursor-pointer"

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={currentFormat}
        onChange={e => updateFilter('format', e.target.value)}
        className={selectClass}
      >
        {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <select
        value={currentGenre}
        onChange={e => updateFilter('genre', e.target.value)}
        className={selectClass}
      >
        {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
      </select>
      <select
        value={currentBudget}
        onChange={e => updateFilter('budget', e.target.value)}
        className={selectClass}
      >
        {BUDGETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>
    </div>
  )
}
