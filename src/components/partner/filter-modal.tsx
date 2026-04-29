'use client'

// FilterModal — full filter editor for the producer Discover tab.
//
// Anuj 2026-04-30: the inline filter bar was too noisy on first paint
// (especially on mobile — a wall of chips before the producer sees any
// scripts). The new pattern is a one-line summary above the feed with
// a "Filter" button that opens this modal. Inside the modal: the full
// chip list, an Apply button, and a "Save as my defaults" toggle that
// persists genre / format / budget back to profiles.lane so the next
// session lands on the same view automatically.

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X } from 'lucide-react'

export type FilterAxis =
  | 'format'
  | 'budgetTier'
  | 'productionLevel'
  | 'castLevel'
  | 'genres'
  | 'scriptTags'

export type FilterState = Record<FilterAxis, Set<string>>

export interface FilterOption {
  token: string
  label: string
  count: number
}

export interface FilterOptionsByAxis {
  format: FilterOption[]
  budgetTier: FilterOption[]
  productionLevel: FilterOption[]
  castLevel: FilterOption[]
  genres: FilterOption[]
  scriptTags: FilterOption[]
}

interface Props {
  open: boolean
  onClose: () => void
  options: FilterOptionsByAxis
  /** Currently-applied filter, used as the modal's initial state. */
  current: FilterState
  /** Called when the producer hits Apply. The new filter replaces the
   *  current one; "save as defaults" is handled separately inside the
   *  modal itself (writes to profiles.lane). */
  onApply: (next: FilterState) => void
}

const AXIS_LABEL: Record<FilterAxis, string> = {
  format: 'Format',
  budgetTier: 'Budget',
  genres: 'Genre',
  productionLevel: 'Production complexity',
  castLevel: 'Cast complexity',
  scriptTags: 'Tags',
}

const AXIS_ORDER: FilterAxis[] = [
  'format',
  'budgetTier',
  'genres',
  'productionLevel',
  'castLevel',
  'scriptTags',
]

export function FilterModal({ open, onClose, options, current, onApply }: Props) {
  const [draft, setDraft] = useState<FilterState>(() => cloneFilter(current))
  const [saveDefaults, setSaveDefaults] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync draft to the current filter every time the modal opens.
  // Producer expects "open modal, see what's actually applied" not
  // "see whatever I had typed last time and bailed on."
  useEffect(() => {
    if (open) {
      setDraft(cloneFilter(current))
      setSaveDefaults(false)
      setError(null)
    }
  }, [open, current])

  if (!open) return null

  function toggle(axis: FilterAxis, token: string) {
    setDraft((prev) => {
      const next = cloneFilter(prev)
      if (next[axis].has(token)) next[axis].delete(token)
      else next[axis].add(token)
      return next
    })
  }

  function clearAll() {
    setDraft({
      format: new Set(),
      budgetTier: new Set(),
      productionLevel: new Set(),
      castLevel: new Set(),
      genres: new Set(),
      scriptTags: new Set(),
    })
  }

  async function handleApply() {
    setBusy(true)
    setError(null)
    try {
      if (saveDefaults) {
        await persistLane(draft)
      }
      onApply(draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save defaults')
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col"
        style={{
          maxHeight: '90vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-4"
          style={{ borderBottom: '1px solid var(--gem-gray-800)' }}
        >
          <h2 className="text-[17px] font-bold text-[var(--gem-gray-50)] m-0">
            Filter
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter"
            className="-mr-1 w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--gem-gray-900)] text-[var(--gem-gray-500)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable axis sections */}
        <div className="overflow-y-auto px-5 sm:px-6 py-4 flex-1">
          {AXIS_ORDER.map((axis) => {
            const opts = options[axis]
            if (!opts || opts.length === 0) return null
            const selected = draft[axis]
            return (
              <div key={axis} className="mb-5">
                <p
                  className="text-[11px] uppercase tracking-[0.18em] font-bold m-0 mb-2.5"
                  style={{ color: 'var(--gem-gray-500)' }}
                >
                  {AXIS_LABEL[axis]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {opts.map((opt) => (
                    <button
                      key={opt.token}
                      type="button"
                      onClick={() => toggle(axis, opt.token)}
                      className="inline-flex items-baseline gap-1 text-[12.5px] font-semibold transition-colors"
                      style={{
                        color: selected.has(opt.token)
                          ? 'var(--gem-gray-50)'
                          : 'var(--gem-gray-300)',
                        background: selected.has(opt.token)
                          ? 'rgba(124,58,237,0.10)'
                          : 'var(--gem-gray-900)',
                        border: selected.has(opt.token)
                          ? '1px solid rgba(124,58,237,0.30)'
                          : '1px solid var(--gem-gray-700)',
                        padding: '5px 11px',
                        borderRadius: 999,
                        lineHeight: 1.1,
                      }}
                    >
                      {opt.label}
                      <span
                        className="text-[10.5px] tabular-nums"
                        style={{
                          color: selected.has(opt.token)
                            ? 'var(--gem-gray-300)'
                            : 'var(--gem-gray-500)',
                          fontWeight: 500,
                        }}
                      >
                        {opt.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          className="px-5 sm:px-6 py-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--gem-gray-800)' }}
        >
          <label
            className="flex items-start gap-2.5 cursor-pointer select-none"
            title="Persists Format / Budget / Genre back to your saved lane"
          >
            <input
              type="checkbox"
              checked={saveDefaults}
              onChange={(e) => setSaveDefaults(e.target.checked)}
              className="mt-1 cursor-pointer"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[var(--gem-gray-50)] m-0">
                Save as my defaults
              </p>
              <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
                Persists Format, Budget, and Genre to your lane so the next
                session lands on the same view. Other filters stay
                session-only.
              </p>
            </div>
          </label>
          {error && (
            <p
              className="text-[12.5px] m-0"
              style={{ color: 'var(--gem-warning)' }}
            >
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearAll}
              className="text-[13px] font-semibold transition-colors"
              style={{
                color: 'var(--gem-gray-400)',
                background: 'transparent',
                padding: '8px 0',
                border: 0,
              }}
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={busy}
              className="text-[14px] font-semibold transition-opacity"
              style={{
                background: 'var(--gem-accent)',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: 10,
                opacity: busy ? 0.6 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.25)',
              }}
            >
              {busy ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function cloneFilter(src: FilterState): FilterState {
  return {
    format: new Set(src.format),
    budgetTier: new Set(src.budgetTier),
    productionLevel: new Set(src.productionLevel),
    castLevel: new Set(src.castLevel),
    genres: new Set(src.genres),
    scriptTags: new Set(src.scriptTags),
  }
}

// Persist Format / Budget / Genre back to profiles.lane. The other
// axes (Production complexity, Cast complexity, Tags) stay session-
// only — those aren't part of the matching engine's lane predicate
// and shouldn't bake into the saved preference.
async function persistLane(draft: FilterState) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const formatToken =
    draft.format.size === 1
      ? Array.from(draft.format)[0]
      : draft.format.size === 0
        ? 'both'
        : 'both' // multi-select on format collapses to "both"
  const budgetToken =
    draft.budgetTier.size === 1
      ? Array.from(draft.budgetTier)[0]
      : 'agnostic'
  const genres = Array.from(draft.genres)

  const { error } = await supabase
    .from('profiles')
    .update({
      lane: {
        genres,
        format: formatToken,
        budget_tier: budgetToken,
      },
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
}
