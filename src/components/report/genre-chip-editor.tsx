'use client'

// GenreChipEditor — owner-only inline editor for a script's genres, rendered
// as the classification pill row in the report hero.
//
// Format is shown but LOCKED (tied to the score). Genres are a controlled
// vocabulary (LOCKED_GENRE_VOCAB): the first genre is primary, up to two
// more are secondary (3 total). Each genre chip shows an "×" to remove; a
// "+" button reveals a small menu of the remaining allowed genres to add.
// Capped at 3 — at the cap the "+" disappears.
//
// Any change POSTs { genre_primary, genre_secondary } to the edit endpoint,
// which merges partial edited_fields, so genres save without touching other
// fields. Non-owners just see the plain pills.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOCKED_GENRE_VOCAB } from '@/lib/edited-fields'

const MAX_GENRES = 3

interface Props {
  evaluationId: string
  isOwner: boolean
  format: string | null
  initialPrimary: string | null
  initialSecondary: string[]
}

const pillStyle: React.CSSProperties = {
  background: 'rgba(43,26,85,0.85)',
  color: '#fff',
  border: '1px solid rgba(124,58,237,0.4)',
}

export function GenreChipEditor({
  evaluationId,
  isOwner,
  format,
  initialPrimary,
  initialSecondary,
}: Props) {
  const router = useRouter()
  const [genres, setGenres] = useState<string[]>(() =>
    [initialPrimary, ...initialSecondary].filter((g): g is string => !!g),
  )
  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Keep in sync if server values change after a refresh
  useEffect(() => {
    setGenres([initialPrimary, ...initialSecondary].filter((g): g is string => !!g))
  }, [initialPrimary, initialSecondary])

  // Close add-menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  async function persist(next: string[]) {
    const prev = genres
    setGenres(next)
    setSaving(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre_primary: next[0] ?? '',
          genre_secondary: next.slice(1, 3),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      router.refresh()
    } catch {
      setGenres(prev) // revert
    } finally {
      setSaving(false)
    }
  }

  function removeGenre(g: string) {
    persist(genres.filter((x) => x !== g))
  }
  function addGenre(g: string) {
    if (genres.includes(g) || genres.length >= MAX_GENRES) return
    setMenuOpen(false)
    persist([...genres, g])
  }

  const remaining = (LOCKED_GENRE_VOCAB as readonly string[]).filter((g) => !genres.includes(g))
  const atCap = genres.length >= MAX_GENRES

  // Non-owner: plain display pills
  if (!isOwner) {
    return (
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {format && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(124,58,237,0.9)', color: '#fff' }}>
            {format}
          </span>
        )}
        {genres.map((g, i) => (
          <span key={`g-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={pillStyle}>
            {g}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2 mt-3 flex-wrap" style={{ opacity: saving ? 0.6 : 1 }}>
      {/* Format — locked */}
      {format && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(124,58,237,0.9)', color: '#fff' }}>
          {format}
        </span>
      )}

      {/* Genre chips with remove */}
      {genres.map((g, i) => (
        <span key={`g-${i}`} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-semibold" style={pillStyle}>
          {g}
          <button
            type="button"
            onClick={() => removeGenre(g)}
            disabled={saving}
            aria-label={`Remove ${g}`}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full transition-colors hover:bg-white/20 disabled:opacity-50"
            style={{ color: 'rgba(255,255,255,0.85)', border: 'none', background: 'transparent', cursor: 'pointer', lineHeight: 0 }}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}

      {/* Add button + menu */}
      {!atCap && remaining.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            disabled={saving}
            aria-label="Add genre"
            className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors hover:bg-white/10 disabled:opacity-50"
            style={{ color: '#fff', border: '1px dashed rgba(124,58,237,0.6)', background: 'transparent', cursor: 'pointer', lineHeight: 0 }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="absolute left-0 top-full mt-1 z-50 max-h-64 overflow-auto rounded-xl py-1 shadow-lg"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', minWidth: 160 }}
            >
              {remaining.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => addGenre(g)}
                  className="w-full text-left px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[rgba(124,58,237,0.06)] border-0 bg-transparent cursor-pointer"
                  style={{ color: '#1C1917' }}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
