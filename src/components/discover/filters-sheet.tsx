'use client'

// FiltersSheet — single source of truth for browse filters on the
// Community page. One "Filters" pill on the page opens this sheet; it
// holds Format / Genre / Budget tier (mirroring producer lanes so
// writers can filter by the same vocabulary producers do).
//
// Mobile = bottom sheet, desktop = centered modal. Portaled to body to
// escape any clipping ancestors. Esc + backdrop-click + Done button all
// close. Reset clears everything.
//
// Anuj 2026-04-30 v0.7.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Filter } from 'lucide-react'

export const FORMATS = [
  { id: 'all', label: 'All formats' },
  { id: 'feature', label: 'Features' },
  { id: 'series', label: 'Series' },
] as const
export type FormatId = (typeof FORMATS)[number]['id']

export const GENRES = [
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
export type GenreId = (typeof GENRES)[number]['id']

export const BUDGETS = [
  { id: 'micro', label: 'Micro', caption: '<$1M' },
  { id: 'indie', label: 'Indie', caption: '$1–15M' },
  { id: 'mid', label: 'Mid', caption: '$15–50M' },
  { id: 'studio', label: 'Studio', caption: '$50M+' },
  { id: 'agnostic', label: 'Agnostic', caption: 'Open' },
] as const
export type BudgetId = (typeof BUDGETS)[number]['id']

export interface FilterValue {
  format: FormatId
  genres: GenreId[]
  budgets: BudgetId[]
}

interface Props {
  open: boolean
  initial: FilterValue
  onClose: () => void
  onApply: (next: FilterValue) => void
}

export function activeFilterCount(v: FilterValue): number {
  return (v.format === 'all' ? 0 : 1) + v.genres.length + v.budgets.length
}

export function FiltersSheet({ open, initial, onClose, onApply }: Props) {
  const [format, setFormat] = useState<FormatId>(initial.format)
  const [genres, setGenres] = useState<GenreId[]>(initial.genres)
  const [budgets, setBudgets] = useState<BudgetId[]>(initial.budgets)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Re-sync when the sheet (re-)opens with a different initial.
  useEffect(() => {
    if (open) {
      setFormat(initial.format)
      setGenres(initial.genres)
      setBudgets(initial.budgets)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Esc to close.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!mounted || !open) return null

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
  }

  const apply = () => {
    onApply({ format, genres, budgets })
    onClose()
  }
  const reset = () => {
    setFormat('all')
    setGenres([])
    setBudgets([])
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm"
      onMouseUp={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
            Filters
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Format — single-select */}
          <Section label="Format">
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <Chip
                  key={f.id}
                  active={format === f.id}
                  onClick={() => setFormat(f.id)}
                >
                  {f.label}
                </Chip>
              ))}
            </div>
          </Section>

          {/* Genre — multi-select */}
          <Section label="Genre">
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <Chip
                  key={g.id}
                  active={genres.includes(g.id)}
                  onClick={() => setGenres(toggle(genres, g.id))}
                >
                  {g.label}
                </Chip>
              ))}
            </div>
          </Section>

          {/* Budget tier — multi-select */}
          <Section label="Budget tier">
            <div className="flex flex-wrap gap-1.5">
              {BUDGETS.map((b) => (
                <Chip
                  key={b.id}
                  active={budgets.includes(b.id)}
                  onClick={() => setBudgets(toggle(budgets, b.id))}
                  caption={b.caption}
                >
                  {b.label}
                </Chip>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={reset}
            className="text-[12px] font-semibold text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Reset
          </button>
          <div className="flex-1" />
          <button
            onClick={apply}
            className="text-[12.5px] font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.14em] font-bold text-gray-500 mb-2">{label}</p>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children, caption }: { active: boolean; onClick: () => void; children: React.ReactNode; caption?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active
          ? 'bg-purple-600 border-purple-600 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
      {caption && <span className={`text-[10px] font-normal ${active ? 'opacity-90' : 'text-gray-500'}`}>{caption}</span>}
    </button>
  )
}

/** A small "Filters" trigger pill — pairs with the sheet. The active
 *  count badge appears when any filter is set. */
export function FiltersTrigger({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        count > 0
          ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <Filter size={13} />
      Filters
      {count > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold w-4 h-4">
          {count}
        </span>
      )}
    </button>
  )
}
