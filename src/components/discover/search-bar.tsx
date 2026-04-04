'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

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
    <div className="mb-6 space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gem-gray-500)]" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title or author..."
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-[var(--gem-gray-700)] text-sm text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:outline-none focus:border-[var(--gem-accent)]"
        />
      </form>

      {/* Format pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => updateParams({ format: '' })}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
            !initialFormat
              ? 'bg-[var(--gem-accent)] text-white'
              : 'bg-white text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] border border-[var(--gem-gray-700)]'
          }`}
        >
          All Formats
        </button>
        {formats.map(f => (
          <button
            key={f}
            onClick={() => updateParams({ format: f })}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
              initialFormat === f
                ? 'bg-[var(--gem-accent)] text-white'
                : 'bg-white text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] border border-[var(--gem-gray-700)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Genre pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => updateParams({ genre: '' })}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
            !initialGenre
              ? 'bg-[var(--gem-accent)] text-white'
              : 'bg-white text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] border border-[var(--gem-gray-700)]'
          }`}
        >
          All Genres
        </button>
        {genres.map(g => (
          <button
            key={g}
            onClick={() => updateParams({ genre: g })}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
              initialGenre === g
                ? 'bg-[var(--gem-accent)] text-white'
                : 'bg-white text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] border border-[var(--gem-gray-700)]'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Sort pills */}
      <div className="flex gap-2">
        {[
          { value: 'score', label: 'Top Score' },
          { value: 'likes', label: 'Most Liked' },
          { value: 'recent', label: 'Recent' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => updateParams({ sort: opt.value === 'score' ? '' : opt.value })}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              initialSort === opt.value || (!initialSort && opt.value === 'score')
                ? 'bg-[var(--gem-accent)] text-white'
                : 'bg-white text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] border border-[var(--gem-gray-700)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
