'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

type TabKey = '' | 'gem-select'

interface SearchBarProps {
  initialQuery: string
  initialGenre: string
  initialFormat: string
  initialTab: TabKey
  genres: string[]
  formats: string[]
  counts: { recent: number; gemSelect: number }
}

const TABS: { key: TabKey; label: string; countKey: keyof SearchBarProps['counts'] }[] = [
  { key: '', label: 'Recent', countKey: 'recent' },
  { key: 'gem-select', label: 'GEM Select', countKey: 'gemSelect' },
]

export function SearchBar({
  initialQuery,
  initialGenre,
  initialFormat,
  initialTab,
  genres,
  formats,
  counts,
}: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    const qs = params.toString()
    router.push(qs ? `/discover?${qs}` : '/discover')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ q: query })
  }

  // Close filter popover when clicking outside.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const activeFilterCount = (initialGenre ? 1 : 0) + (initialFormat ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="mb-6 space-y-4">
      {/* Pill tabs — primary navigation. Recent = neutral outlined pill that
          fills near-black when active; GEM Select = gold-gradient branded pill
          when active (✦ star always visible). Matches the pill treatment from
          the Selznick 3.6 email and reads cleanly on the light Discover bg. */}
      <div className="flex flex-col gap-3">
        <div className="inline-flex flex-wrap items-center gap-2">
          {TABS.map((t) => {
            const active = initialTab === t.key
            const count = counts[t.countKey]
            const isGemSelect = t.key === 'gem-select'

            // Style buckets — keep active/inactive visually distinct but both
            // pills share the same geometry so they read as a pair.
            let pillClass = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--gem-accent)]'
            let style: React.CSSProperties = {}
            let countClass = ''

            if (isGemSelect && active) {
              pillClass += ' text-white border-transparent'
              style = {
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                boxShadow: '0 2px 10px rgba(245,158,11,0.35)',
              }
              countClass = 'text-white/80'
            } else if (isGemSelect && !active) {
              pillClass += ' text-[var(--gem-gold)] border-[var(--gem-gold)]/40 bg-[var(--gem-gold)]/5 hover:bg-[var(--gem-gold)]/10 hover:border-[var(--gem-gold)]/70'
              countClass = 'text-[var(--gem-gold)]/70'
            } else if (!isGemSelect && active) {
              pillClass += ' text-white border-[var(--gem-white)]'
              style = { background: 'var(--gem-white)' }
              countClass = 'text-white/70'
            } else {
              pillClass += ' text-[var(--gem-gray-500)] border-[var(--gem-gray-700)] bg-transparent hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-500)]'
              countClass = 'text-[var(--gem-gray-500)]'
            }

            return (
              <button
                key={t.key || 'recent'}
                onClick={() => updateParams({ tab: t.key })}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${pillClass}`}
                style={style}
              >
                {isGemSelect && (
                  <span aria-hidden className="text-[13px] leading-none" style={{ transform: 'translateY(-0.5px)' }}>
                    ✦
                  </span>
                )}
                <span>{t.label}</span>
                <span className={`text-xs tabular-nums font-medium ${countClass}`}>
                  {count.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>

        {/* GEM Select explainer — only when the tab is active. Clarifies the
            75+ threshold and the private-score / public-designation split, and
            nudges writers who land on Discover to submit their own script. */}
        {initialTab === 'gem-select' && (
          <p className="text-[13px] text-[var(--gem-gray-500)] leading-[1.6] m-0 max-w-[62ch]">
            Scripts scoring 75+ earn GEM Select — the shelf for screen-ready, commercially viable work. Your score stays private; only the designation is public.{' '}
            <Link
              href="/submit"
              className="text-[var(--gem-gold)] hover:opacity-80 font-semibold underline decoration-dotted underline-offset-4 transition-opacity"
            >
              Submit a script to see how it scores →
            </Link>
          </p>
        )}
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gem-gray-500)] pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[var(--gem-gray-700)] text-sm focus:outline-none focus:border-[var(--gem-accent)]"
            style={{ color: '#111827' }}
          />
        </form>

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 border ${
              hasActiveFilters
                ? 'border-[var(--gem-accent)] text-[var(--gem-accent)] bg-[var(--gem-accent)]/5'
                : 'border-[var(--gem-gray-700)] text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] bg-white'
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--gem-accent)] text-white text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 z-50 w-[min(20rem,calc(100vw-2rem))] p-4 rounded-lg border border-gray-300 bg-white shadow-xl space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">
                  Format
                </label>
                <select
                  value={initialFormat}
                  onChange={(e) => updateParams({ format: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-sm bg-white"
                  style={{ color: '#111827' }}
                >
                  <option value="">All formats</option>
                  {formats.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">
                  Genre
                </label>
                <select
                  value={initialGenre}
                  onChange={(e) => updateParams({ genre: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-sm bg-white"
                  style={{ color: '#111827' }}
                >
                  <option value="">All genres</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => updateParams({ genre: '', format: '' })}
                  className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <X size={12} />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
