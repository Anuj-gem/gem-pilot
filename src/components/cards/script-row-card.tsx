'use client'

// ScriptRowCard — unified script preview card used on dashboard,
// /scripts, and portfolio review pages. One card, one design, everywhere.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'


export type ScriptRowData = {
  id: string
  title: string
  format: string | null
  genre: string | null
  score: number | null
  evaluationId: string | null
  createdAt: string
  // Opportunities
  matchingOpportunities?: { title: string; slug: string }[]
  // Heat
  heatScore?: number
  // Discover
  isPublic?: boolean
  // States
  isProcessing?: boolean
  isLocked?: boolean
}

interface Props {
  script: ScriptRowData
  // Checkbox mode for draft reviews
  checkbox?: boolean
  checked?: boolean
  onToggle?: (id: string) => void
  // Three-dot menu — shown by default on all completed scripts
  showMenu?: boolean
  onHide?: (id: string) => void
}

export function ScriptRowCard({
  script: s,
  checkbox,
  checked,
  onToggle,
  showMenu,
  onHide,
}: Props) {
  // Three-dot menu shows by default on any completed script (has evaluationId, not processing, not locked)
  // Callers can override with showMenu={false} to suppress
  const shouldShowMenu = showMenu !== undefined
    ? showMenu
    : !!(s.evaluationId && !s.isProcessing && !s.isLocked)

  const [menuOpen, setMenuOpen] = useState(false)
  const [callsOpen, setCallsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const callsRef = useRef<HTMLSpanElement>(null)
  const router = useRouter()

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen && !callsOpen) return
    function handleClick(e: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (callsOpen && callsRef.current && !callsRef.current.contains(e.target as Node)) setCallsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, callsOpen])

  const matches = s.matchingOpportunities || []

  return (
    <div
      className={`rounded-xl bg-white border px-4 py-3 transition-colors ${
        checkbox
          ? checked
            ? 'border-purple-200 ring-1 ring-purple-100'
            : 'border-gray-200 opacity-60'
          : 'border-gray-200'
      }`}
    >
      {/* Row 1: checkbox + score + title + format + menu */}
      <div className="flex items-center gap-3">
        {checkbox && (
          <button
            onClick={() => onToggle?.(s.id)}
            className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: checked ? '#7c3aed' : '#d1d5db',
              background: checked ? '#7c3aed' : 'transparent',
            }}
          >
            {checked && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        {/* Score badge — single neutral color */}
        {s.isProcessing ? (
          <div
            className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: '#f3f4f6' }}
          >
            <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : s.score != null ? (
          <div
            className="shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center"
            style={{
              background: '#f3f4f6',
              border: '1.5px solid #e5e7eb',
              ...(s.isLocked ? { filter: 'blur(6px)', userSelect: 'none' as const } : {}),
            }}
          >
            <span className="text-[16px] font-extrabold leading-none text-gray-800">
              {Math.round(s.score)}
            </span>
            <span className="text-[7px] font-bold uppercase tracking-wide mt-0.5 text-gray-400">
              Score
            </span>
          </div>
        ) : (
          <div
            className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(107,114,128,0.06)' }}
          >
            <span className="text-[11px] text-gray-300">&mdash;</span>
          </div>
        )}

        {/* Title + format + date */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
              {s.title}
            </p>
            {s.format && (
              <span className="text-[12px] text-gray-400 shrink-0">{s.format}</span>
            )}
            {s.format && s.createdAt && <span className="text-gray-200 shrink-0">&middot;</span>}
            {s.createdAt && (
              <span className="text-[12px] text-gray-300 shrink-0">
                {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Three-dot menu — always visible on completed scripts */}
        {shouldShowMenu && (
          <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {s.evaluationId && (
                  <Link
                    href={`/report/${s.evaluationId}?edit=1`}
                    className="block px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Edit details
                  </Link>
                )}
                {s.evaluationId && (
                  <button
                    onClick={async () => {
                      setMenuOpen(false)
                      await fetch(`/api/scripts/${s.id}/visibility`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_public: !s.isPublic }),
                      })
                      router.refresh()
                    }}
                    className="block w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {s.isPublic ? 'Remove from Discover' : 'Publish to Discover'}
                  </button>
                )}
                {onHide ? (
                  <button
                    onClick={() => { setMenuOpen(false); onHide(s.id) }}
                    className="block w-full text-left px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Hide
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setMenuOpen(false)
                      await fetch(`/api/scripts/${s.id}/hide`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ hide: true }),
                      })
                      router.refresh()
                    }}
                    className="block w-full text-left px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Hide
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: genre · heat · opportunities · view details */}
      <div className="flex items-center gap-2 mt-2 ml-0" style={{ paddingLeft: checkbox ? 32 : 56 }}>
        {/* Genre */}
        {s.genre && (
          <span className="text-[12px] text-gray-400">{s.genre}</span>
        )}
        {s.genre && (s.heatScore || matches.length > 0) && (
          <span className="text-gray-200">&middot;</span>
        )}

        {/* Insider Heat */}
        {!!s.heatScore && s.heatScore > 0 && (
          <span className="text-[12px] font-semibold" style={{ color: '#f97316' }}>
            🔥 {s.heatScore} Insider Heat
          </span>
        )}
        {!!s.heatScore && s.heatScore > 0 && matches.length > 0 && (
          <span className="text-gray-200">&middot;</span>
        )}

        {/* Open calls dropdown */}
        {matches.length > 0 && (
          <span className="relative inline-flex items-center" ref={callsRef}>
            <button
              onClick={() => setCallsOpen(!callsOpen)}
              className="text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {matches.length} {matches.length === 1 ? 'opportunity' : 'opportunities'} {callsOpen ? '▴' : '▾'}
            </button>
            {callsOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5">
                {matches.map(m => (
                  <Link
                    key={m.slug}
                    href={`/opportunities/${m.slug}`}
                    className="block px-3 py-1.5 text-[12px] text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors truncate"
                  >
                    {m.title}
                  </Link>
                ))}
              </div>
            )}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* View details link */}
        {s.evaluationId && !s.isLocked && !s.isProcessing && (
          <Link
            href={`/report/${s.evaluationId}`}
            className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 whitespace-nowrap"
          >
            View details →
          </Link>
        )}
      </div>
    </div>
  )
}
