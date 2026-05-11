'use client'

// DashboardScriptCard — script card with:
// - Tier-colored score badge (large, left side)
// - Title + format/genre/date
// - "Qualifies for N open calls" context line
// - "View report →" link
// - Three-dot menu (hide)
// - Expandable qualifying opportunities

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, ChevronDown, ChevronUp, EyeOff } from 'lucide-react'

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
  score: number | null
  qualifyingOpps: QualifyingOpp[]
  isProcessing?: boolean
}


export function DashboardScriptCard({
  scriptId,
  title,
  format,
  genre,
  evaluationId,
  createdAt,
  score,
  qualifyingOpps,
  isProcessing: processing,
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
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-purple-200 transition-colors">
      <div className="flex items-start gap-3">
        {/* Score badge — spinner when processing, score when done */}
        {processing ? (
          <div
            className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: '#f3f4f6', border: '1.5px solid #e5e7eb' }}
          >
            <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : score != null ? (
          <div
            className="shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center"
            style={{ background: '#f3f4f6', border: '1.5px solid #e5e7eb' }}
          >
            <span className="text-[18px] font-extrabold leading-none text-gray-800">
              {Math.round(score)}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wide mt-0.5 text-gray-400">
              Score
            </span>
          </div>
        ) : null}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{title}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {format && <span className="text-[12px] text-gray-400">{format}</span>}
                {genre && <span className="text-[12px] text-gray-400">· {genre}</span>}
                <span className="text-[12px] text-gray-300">·</span>
                <span className="text-[12px] text-gray-400">{fmtDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              {processing && (
                <span className="text-[12px] text-purple-600 font-medium">Evaluating...</span>
              )}
              {!processing && evaluationId && (
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
              {!processing && <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                >
                  <MoreHorizontal size={15} />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-[160px] rounded-lg bg-white z-[60] overflow-hidden py-1"
                    style={{ border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
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
              </div>}
            </div>
          </div>

          {/* Qualifying opps — contextual line + expandable (hidden while processing) */}
          {!processing && qualifyingOpps.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setOppsOpen(o => !o)}
                className="flex items-center gap-1.5 text-[12px] text-green-700 font-semibold hover:text-green-800 transition-colors bg-transparent border-0 cursor-pointer p-0"
              >
                Qualifies for {qualifyingOpps.length} open {qualifyingOpps.length === 1 ? 'call' : 'calls'}
                {oppsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {oppsOpen && (
                <div className="mt-2 space-y-1.5">
                  {qualifyingOpps.map(opp => (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.slug}`}
                      className="block rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 hover:border-purple-200 hover:bg-purple-50/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-gray-800 truncate">{opp.title}</span>
                        <span className="text-[11px] text-purple-600 font-semibold shrink-0">Apply →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
