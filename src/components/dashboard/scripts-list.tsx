'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'

type ScriptRow = {
  id: string
  title: string
  format: string | null
  genre: string | null
  score: number | null
  evalId: string | null
  createdAt: string
  isProcessing: boolean
  isLocked: boolean
  inConsideration: boolean
  wasReviewed: boolean
  hidden: boolean
}

type SortKey = 'date' | 'title' | 'score'
type SortDir = 'asc' | 'desc'

export function ScriptsList({
  scripts,
  isPro,
}: {
  scripts: ScriptRow[]
  isPro: boolean
}) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [hiding, setHiding] = useState<Set<string>>(new Set())
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const visible = scripts.filter(s => !s.hidden)
  const hidden = scripts.filter(s => s.hidden)

  function sorted(rows: ScriptRow[]) {
    const mul = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortKey === 'date') {
        return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }
      if (sortKey === 'title') {
        return mul * a.title.localeCompare(b.title)
      }
      // score — nulls go to bottom
      const sa = a.score ?? -1
      const sb = b.score ?? -1
      return mul * (sa - sb)
    })
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'title' ? 'asc' : 'desc')
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(rows: ScriptRow[]) {
    const ids = rows.map(s => s.id)
    const allSelected = ids.every(id => selected.has(id))
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        ids.forEach(id => next.add(id))
        return next
      })
    }
  }

  async function hideScript(id: string) {
    setHiding(prev => new Set(prev).add(id))
    setMenuOpen(null)
    await fetch(`/api/scripts/${id}/hide`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hide: true }),
    })
    router.refresh()
  }

  async function unhideScript(id: string) {
    setHiding(prev => new Set(prev).add(id))
    await fetch(`/api/scripts/${id}/hide`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hide: false }),
    })
    router.refresh()
  }

  async function bulkHide() {
    const ids = [...selected]
    setHiding(new Set(ids))
    await Promise.all(
      ids.map(id =>
        fetch(`/api/scripts/${id}/hide`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hide: true }),
        })
      )
    )
    setSelected(new Set())
    router.refresh()
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const sortedVisible = sorted(visible)
  const sortedHidden = sorted(hidden)

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-[11px] text-gray-400 mr-1">Sort:</span>
        {(['date', 'title', 'score'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
              sortKey === key
                ? 'bg-gray-100 text-gray-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}{arrow(key)}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-[12px] text-gray-600 font-medium">{selected.size} selected</span>
          <button
            onClick={bulkHide}
            className="text-[12px] font-semibold text-red-600 hover:text-red-800 transition-colors"
          >
            Hide selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Script list */}
      {sortedVisible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
          <p className="text-[14px] text-gray-400 m-0 mb-3">No scripts yet. Upload your first to get started.</p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
          >
            Upload a script
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {/* Select all */}
          <div className="px-4 py-2 flex items-center gap-3 bg-gray-50/50">
            <button
              onClick={() => toggleAll(sortedVisible.filter(s => !s.isLocked))}
              className="w-4 h-4 rounded border-2 border-gray-300 flex items-center justify-center shrink-0 hover:border-gray-400 transition-colors"
            >
              {sortedVisible.filter(s => !s.isLocked).every(s => selected.has(s.id)) && sortedVisible.filter(s => !s.isLocked).length > 0 && (
                <span className="text-gray-600 text-[9px] font-bold">✓</span>
              )}
            </button>
            <span className="text-[11px] text-gray-400">
              {visible.length} {visible.length === 1 ? 'script' : 'scripts'}
            </span>
          </div>

          {sortedVisible.map(s => (
            <div
              key={s.id}
              className={`relative ${hiding.has(s.id) ? 'opacity-40 pointer-events-none' : ''}`}
            >
              {s.isLocked && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                  <UpgradePill />
                </div>
              )}
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  {!s.isLocked && !s.isProcessing ? (
                    <button
                      onClick={() => toggleSelect(s.id)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected.has(s.id)
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {selected.has(s.id) && (
                        <span className="text-white text-[9px] font-bold">✓</span>
                      )}
                    </button>
                  ) : (
                    <div className="w-4 shrink-0" />
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

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {s.format && <span className="text-[12px] text-gray-400">{s.format}</span>}
                      {s.genre && (
                        <>
                          {s.format && <span className="text-gray-200">&middot;</span>}
                          <span className="text-[12px] text-gray-400">{s.genre}</span>
                        </>
                      )}
                      {s.isProcessing && (
                        <span className="text-[12px] font-medium text-purple-500">Processing&hellip;</span>
                      )}
                      <span className="text-gray-200">&middot;</span>
                      <span className="text-[11px] text-gray-300">{formatDate(s.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status badges */}
                  {!s.isLocked && !s.isProcessing && (
                    <div className="flex items-center gap-2 shrink-0">
                      {s.inConsideration && (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          In consideration
                        </span>
                      )}
                      {!s.inConsideration && s.wasReviewed && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Reviewed
                        </span>
                      )}
                    </div>
                  )}

                  {/* Three-dot menu */}
                  {!s.isLocked && !s.isProcessing && (
                    <div className="relative shrink-0" ref={menuOpen === s.id ? menuRef : undefined}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === s.id ? null : s.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>

                      {menuOpen === s.id && (
                        <div className="absolute right-0 top-9 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                          {s.evalId && (
                            <Link
                              href={`/report/${s.evalId}`}
                              className="block px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setMenuOpen(null)}
                            >
                              View report
                            </Link>
                          )}
                          {s.evalId && (
                            <Link
                              href={`/report/${s.evalId}`}
                              className="block px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setMenuOpen(null)}
                            >
                              Edit details
                            </Link>
                          )}
                          <button
                            onClick={() => hideScript(s.id)}
                            className="block w-full text-left px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Hide
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Arrow link for locked/simple */}
                  {s.isLocked && s.evalId && (
                    <div className="shrink-0 w-8" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden scripts */}
      {hidden.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="text-[12px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
          >
            {showHidden ? 'Hide' : 'Show'} {hidden.length} hidden {hidden.length === 1 ? 'script' : 'scripts'}
          </button>

          {showHidden && (
            <div className="mt-2 rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden opacity-60">
              {sortedHidden.map(s => (
                <div
                  key={s.id}
                  className={`px-4 py-3 ${hiding.has(s.id) ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 shrink-0" />
                    <div
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(107,114,128,0.06)' }}
                    >
                      {s.score != null ? (
                        <span className="text-[14px] font-bold text-gray-400">
                          {Math.round(s.score)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-300">&mdash;</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-500 m-0 truncate">{s.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {s.format && <span className="text-[12px] text-gray-400">{s.format}</span>}
                        <span className="text-gray-200">&middot;</span>
                        <span className="text-[11px] text-gray-300">{formatDate(s.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => unhideScript(s.id)}
                      className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 shrink-0 transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
