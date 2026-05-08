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
  // Status
  status?: 'ready' | 'in-review' | 'reviewed'
  reviewId?: string | null     // link to /review/c/[id] when in-review or reviewed
  reviewLabel?: string | null  // e.g. "Portfolio review #2"
  // Opportunities
  matchingOpportunities?: { title: string; slug: string }[]
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
  // Three-dot menu
  showMenu?: boolean
  onHide?: (id: string) => void
}

export function ScriptRowCard({
  script: s,
  checkbox,
  checked,
  onToggle,
  showMenu = false,
  onHide,
}: Props) {
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

        {/* Score badge */}
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: s.isProcessing
              ? '#f3f4f6'
              : s.score != null && s.score >= 75
              ? 'rgba(124,58,237,0.08)'
              : 'rgba(107,114,128,0.06)',
          }}
        >
          {s.isProcessing ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
          ) : s.score != null ? (
            <span
              className="text-[14px] font-bold"
              style={{
                color: s.score >= 75 ? '#7c3aed' : '#6b7280',
                ...(s.isLocked ? { filter: 'blur(6px)', userSelect: 'none' as const } : {}),
              }}
            >
              {Math.round(s.score)}
            </span>
          ) : (
            <span className="text-[11px] text-gray-300">&mdash;</span>
          )}
        </div>

        {/* Title + format */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
              {s.title}
            </p>
            {s.format && (
              <span className="text-[12px] text-gray-400 shrink-0">{s.format}</span>
            )}
          </div>
        </div>

        {/* Three-dot menu */}
        {showMenu && !s.isLocked && !s.isProcessing && (
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
              <div className="absolute right-0 top-9 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {s.evaluationId && (
                  <Link
                    href={`/report/${s.evaluationId}?edit=1`}
                    className="block px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Edit details
                  </Link>
                )}
                {onHide && (
                  <button
                    onClick={() => { setMenuOpen(false); onHide(s.id) }}
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

      {/* Row 2: genre · opportunities · status · view details */}
      <div className="flex items-center gap-2 mt-2 ml-0" style={{ paddingLeft: checkbox ? 32 : 48 }}>
        {/* Genre */}
        {s.genre && (
          <span className="text-[12px] text-gray-400">{s.genre}</span>
        )}
        {s.genre && matches.length > 0 && (
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

        {/* Status */}
        {s.status === 'reviewed' && s.reviewId && (
          <Link
            href={`/review/c/${s.reviewId}`}
            className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition-colors"
          >
            {s.reviewLabel || 'Reviewed'}
          </Link>
        )}
        {s.status === 'in-review' && s.reviewId && (
          <Link
            href={`/review/c/${s.reviewId}`}
            className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors"
          >
            {s.reviewLabel || 'In review'}
          </Link>
        )}
        {s.status === 'ready' && (
          <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            Ready for review
          </span>
        )}

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
