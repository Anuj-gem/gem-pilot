'use client'

// DashboardScriptCard — compact script card with:
// - Title (clickable → report)
// - Date posted
// - "View report →" link
// - "N available opportunities" expandable dropdown
// - Three-dot menu (hide, etc.)

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'

type QualifyingOpp = {
  id: string
  title: string
  slug: string
}

interface DashboardScriptCardProps {
  scriptId: string
  title: string
  format: string | null
  genre: string | null
  evaluationId: string | null
  createdAt: string
  qualifyingOpps: QualifyingOpp[]
}

export function DashboardScriptCard({
  scriptId,
  title,
  format,
  genre,
  evaluationId,
  createdAt,
  qualifyingOpps,
}: DashboardScriptCardProps) {
  const [oppsOpen, setOppsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fmtDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleHide() {
    setHiding(true)
    setMenuOpen(false)
    await fetch(`/api/scripts/${scriptId}/hide`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hide: true }),
    })
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-purple-200 transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
              {title}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {format && <span className="text-[12px] text-gray-400">{format}</span>}
            {genre && <span className="text-[12px] text-gray-400">· {genre}</span>}
            <span className="text-[12px] text-gray-300">·</span>
            <span className="text-[12px] text-gray-400">{fmtDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View report */}
          {evaluationId && (
            <Link
              href={`/report/${evaluationId}`}
              className="text-[12px] text-purple-600 hover:text-purple-700 font-semibold whitespace-nowrap flex items-center gap-1"
            >
              View report
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )}

          {/* Three-dot menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-[160px] rounded-lg bg-white z-[60] overflow-hidden py-1"
                style={{
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                }}
              >
                <button
                  onClick={handleHide}
                  disabled={hiding}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors text-left"
                >
                  <EyeOff size={14} className="text-gray-400" />
                  {hiding ? 'Hiding...' : 'Hide script'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Qualifying opportunities expandable */}
      {qualifyingOpps.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <button
            onClick={() => setOppsOpen(o => !o)}
            className="flex items-center gap-1.5 text-[12px] text-purple-600 font-semibold hover:text-purple-700 transition-colors"
          >
            {qualifyingOpps.length} available {qualifyingOpps.length === 1 ? 'opportunity' : 'opportunities'}
            {oppsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {oppsOpen && (
            <div className="mt-2 space-y-1.5">
              {qualifyingOpps.map(opp => (
                <Link
                  key={opp.id}
                  href={`/opportunities/${opp.slug}/apply?script=${scriptId}`}
                  className="block rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 hover:border-purple-200 hover:bg-purple-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-gray-800 truncate">
                      {opp.title}
                    </span>
                    <span className="text-[11px] text-purple-600 font-semibold shrink-0">
                      Apply →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
