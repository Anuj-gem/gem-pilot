'use client'

// FilterModal — full filter editor for the producer Discover tab.
//
// Anuj 2026-04-30: rewritten with all layout-critical CSS as inline
// styles after the Tailwind className-driven version was rendering with
// broken column widths in the deployed build (text wrapping one word
// per line on the right side, body axes vanishing). Inline styles
// can't fall victim to Tailwind compile/scan issues.

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
  current: FilterState
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--gem-gray-800)',
          }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--gem-gray-50)',
              margin: 0,
            }}
          >
            Filter
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: 'var(--gem-gray-500)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            overflowY: 'auto',
            padding: '16px 24px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {AXIS_ORDER.map((axis) => {
            const opts = options[axis]
            if (!opts || opts.length === 0) return null
            const selected = draft[axis]
            return (
              <div key={axis} style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: 'var(--gem-gray-500)',
                    margin: '0 0 10px 0',
                  }}
                >
                  {AXIS_LABEL[axis]}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {opts.map((opt) => {
                    const isOn = selected.has(opt.token)
                    return (
                      <button
                        key={opt.token}
                        type="button"
                        onClick={() => toggle(axis, opt.token)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'baseline',
                          gap: 4,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: isOn
                            ? 'var(--gem-gray-50)'
                            : 'var(--gem-gray-300)',
                          background: isOn
                            ? 'rgba(124,58,237,0.10)'
                            : 'var(--gem-gray-900)',
                          border: isOn
                            ? '1px solid rgba(124,58,237,0.30)'
                            : '1px solid var(--gem-gray-700)',
                          padding: '5px 11px',
                          borderRadius: 999,
                          lineHeight: 1.1,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                        <span
                          style={{
                            fontSize: 10.5,
                            fontVariantNumeric: 'tabular-nums',
                            color: isOn
                              ? 'var(--gem-gray-300)'
                              : 'var(--gem-gray-500)',
                            fontWeight: 500,
                          }}
                        >
                          {opt.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid var(--gem-gray-800)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Layout: a single inline label "[checkbox] Save as my
              defaults" rendered as a normal text line via display:block
              + the checkbox aligned with verticalAlign. Description
              follows as its own paragraph. No flex container — flex
              span was rendering the title outside the modal on the
              deployed build for reasons we couldn't pin down. Plain
              inline-block layout sidesteps the issue entirely.
              Anuj 2026-04-30. */}
          <label
            style={{
              display: 'block',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--gem-gray-50)',
              lineHeight: 1.4,
            }}
          >
            <input
              type="checkbox"
              checked={saveDefaults}
              onChange={(e) => setSaveDefaults(e.target.checked)}
              style={{
                cursor: 'pointer',
                marginRight: 8,
                verticalAlign: 'middle',
              }}
            />
            Save as my defaults
          </label>
          <p
            style={{
              fontSize: 12,
              color: 'var(--gem-gray-400)',
              margin: '4px 0 0 24px',
              lineHeight: 1.45,
            }}
          >
            Persists Format, Budget, and Genre to your lane so the next
            session lands on the same view. Other filters stay
            session-only.
          </p>
          {error && (
            <p style={{ fontSize: 12.5, margin: 0, color: 'var(--gem-warning)' }}>
              {error}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={clearAll}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--gem-gray-400)',
                background: 'transparent',
                padding: '8px 0',
                border: 0,
                cursor: 'pointer',
              }}
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={busy}
              style={{
                fontSize: 14,
                fontWeight: 600,
                background: 'var(--gem-accent)',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: 10,
                opacity: busy ? 0.6 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.25)',
                border: 0,
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
      : 'both'
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
