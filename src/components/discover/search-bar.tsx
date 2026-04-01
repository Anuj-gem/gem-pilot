'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

interface SearchBarProps {
  initialQuery: string
  initialGenre: string
  initialFormat: string
  initialSort: string
  genres: string[]
  formats: string[]
}

export function SearchBar({
  initialQuery,
  initialGenre,
  initialFormat,
  initialSort,
  genres,
  formats,
}: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [showFilters, setShowFilters] = useState(!!initialGenre || !!initialFormat)

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    router.push(`/discover?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ q: query })
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gem-gray-500)]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title or author..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-sm text-white placeholder:text-[var(--gem-gray-500)] focus:outline-none focus:border-[var(--gem-accent)]"
          />
        </form>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
            showFilters
              ? 'border-[var(--gem-accent)] text-[var(--gem-accent)] bg-[var(--gem-accent)]/10'
              : 'border-[var(--gem-gray-700)] text-[var(--gem-gray-400)] hover:text-white'
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3">
          <select
            value={initialGenre}
            onChange={e => updateParams({ genre: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-sm text-white focus:outline-none focus:border-[var(--gem-accent)]"
          >
            <option value="">All Genres</option>
            {genres.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={initialFormat}
            onChange={e => updateParams({ format: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-sm text-white focus:outline-none focus:border-[var(--gem-accent)]"
          >
            <option value="">All Formats</option>
            {formats.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <div className="flex rounded-lg border border-[var(--gem-gray-700)] overflow-hidden text-sm">
            {[
              { value: 'score', label: 'Top Score' },
              { value: 'likes', label: 'Most Liked' },
              { value: 'recent', label: 'Recent' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => updateParams({ sort: opt.value === 'score' ? '' : opt.value })}
                className={`px-3 py-1.5 transition-colors ${
                  initialSort === opt.value || (!initialSort && opt.value === 'score')
                    ? 'bg-[var(--gem-accent)] text-white'
                    : 'bg-[var(--gem-gray-800)] text-[var(--gem-gray-400)] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
