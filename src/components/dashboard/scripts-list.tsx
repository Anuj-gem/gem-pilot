'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { useNewUploads } from '@/hooks/use-new-uploads'

type ScriptRow = {
  id: string
  title: string
  format: string | null
  genre: string | null
  genres: string[]
  score: number | null
  evaluationId: string | null
  createdAt: string
  heat: number
  posterUrl: string | null
  matchingOpportunities?: { title: string; slug: string }[]
  isProcessing?: boolean
  isLocked?: boolean
  hidden?: boolean
}

type SortKey = 'date' | 'title' | 'score'
type SortDir = 'asc' | 'desc'

const placeholderGradient = 'linear-gradient(135deg, #7c3aed, #6d28d9)'
const cardShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'

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
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Optimistic processing cards from new uploads + auto-refresh poller
  const optimistic = useNewUploads(scripts.map(s => s.id))
  const hasProcessing = scripts.some(s => s.isProcessing) || optimistic.length > 0

  const visible = scripts.filter((s: ScriptRow) => !s.hidden)

  function sorted(rows: ScriptRow[]) {
    const mul = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortKey === 'date') {
        return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }
      if (sortKey === 'title') {
        return mul * a.title.localeCompare(b.title)
      }
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

  async function deleteScript(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    setMenuOpen(null)
    await fetch(`/api/scripts/${id}/hide`, { method: 'DELETE' })
    router.refresh()
  }

  async function bulkDelete() {
    const ids = [...selected]
    setDeleting(new Set(ids))
    await Promise.all(ids.map(id => fetch(`/api/scripts/${id}/hide`, { method: 'DELETE' })))
    setSelected(new Set())
    router.refresh()
  }

  const sortedVisible = sorted(visible)

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div>
      <ProcessingPoller active={hasProcessing} />

      {/* Sort controls + select all */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-gray-600 mr-1">Sort:</span>
          {(['date', 'title', 'score'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer border-0 bg-transparent ${
                sortKey === key
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}{arrow(key)}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-gray-600">
          {visible.length} {visible.length === 1 ? 'script' : 'scripts'}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-[12px] text-gray-600 font-medium">{selected.size} selected</span>
          <button
            onClick={bulkDelete}
            className="text-[12px] font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer border-0 bg-transparent"
          >
            Delete selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] text-gray-600 hover:text-gray-800 transition-colors ml-auto cursor-pointer border-0 bg-transparent"
          >
            Clear
          </button>
        </div>
      )}

      {/* Script grid */}
      {sortedVisible.length === 0 && optimistic.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <p className="text-[14px] text-gray-600 m-0">No scripts yet. Use <strong>+ New</strong> to upload your first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Optimistic processing cards */}
          {optimistic.map(s => (
            <div key={s.id} className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: cardShadow }}>
              <div className="aspect-[3/4] w-full relative overflow-hidden" style={{ background: placeholderGradient }}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <p className="text-[12px] font-medium text-white/80 m-0 mt-3">Evaluating...</p>
                </div>
              </div>
              <div className="px-4 py-3">
                <h3 className="text-[14px] font-semibold text-gray-900 m-0 truncate">{s.title}</h3>
                <p className="text-[12px] text-gray-600 m-0 mt-0.5">{s.format || 'Script'}</p>
              </div>
            </div>
          ))}

          {/* Completed script cards */}
          {sortedVisible.map(s => {
            if (s.isProcessing) {
              return (
                <div key={s.id} className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: cardShadow }}>
                  <div className="aspect-[3/4] w-full relative overflow-hidden" style={{ background: placeholderGradient }}>
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <p className="text-[12px] font-medium text-white/80 m-0 mt-3">Evaluating...</p>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <h3 className="text-[14px] font-semibold text-gray-900 m-0 truncate">{s.title}</h3>
                    <p className="text-[12px] text-gray-600 m-0 mt-0.5">{s.format || 'Script'}</p>
                  </div>
                </div>
              )
            }

            const rounded = s.score ? Math.round(s.score) : null
            const reportHref = s.evaluationId ? `/report/${s.evaluationId}` : '/scripts'

            return (
              <div
                key={s.id}
                className={`rounded-2xl bg-white overflow-hidden group hover:shadow-xl transition-all duration-200 relative ${deleting.has(s.id) ? 'opacity-40 pointer-events-none' : ''}`}
                style={{ boxShadow: cardShadow }}
              >
                {s.isLocked && (
                  <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
                    <UpgradePill />
                  </div>
                )}

                {/* Selection checkbox */}
                {!s.isLocked && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(s.id) }}
                    className="absolute top-2 left-2 z-20 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer bg-black/20 backdrop-blur-sm"
                    style={{
                      borderColor: selected.has(s.id) ? '#7c3aed' : 'rgba(255,255,255,0.6)',
                      background: selected.has(s.id) ? '#7c3aed' : 'rgba(0,0,0,0.2)',
                    }}
                  >
                    {selected.has(s.id) && (
                      <span className="text-white text-[10px] font-bold">✓</span>
                    )}
                  </button>
                )}

                {/* Three-dot menu */}
                {!s.isLocked && !s.isProcessing && (
                  <div className="absolute top-2 right-2 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id) }}
                      className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-0 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    {menuOpen === s.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40 min-w-[120px]">
                          <button
                            onClick={() => deleteScript(s.id)}
                            className="w-full text-left px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0 bg-transparent"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Poster image area */}
                <Link href={reportHref} className="block no-underline">
                  <div className="aspect-[3/4] w-full relative overflow-hidden">
                    {s.posterUrl ? (
                      <img
                        src={s.posterUrl}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: placeholderGradient }}>
                        <span className="text-[48px] font-bold text-white/30 leading-none">
                          {(s.title || '?').charAt(0).toUpperCase()}
                        </span>
                        <p className="text-[11px] text-white/50 m-0 mt-2">Add a poster on your report page</p>
                      </div>
                    )}

                    {/* Score + heat overlay */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                      {rounded ? (
                        <span className="text-[12px] font-semibold text-white/90">
                          GEM Score: {rounded}
                        </span>
                      ) : (
                        <span />
                      )}
                      {s.heat > 0 && (
                        <span className="text-[12px] font-semibold text-white/90">
                          🔥 {s.heat}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Card content below poster */}
                <div className="px-4 py-3">
                  <Link href={reportHref} className="block no-underline">
                    <h3 className="text-[14px] font-semibold text-gray-900 m-0 truncate group-hover:text-purple-700 transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-[12px] text-gray-600 m-0 mt-0.5">
                      {[s.format, s.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase())].filter(Boolean).join(' · ')}
                    </p>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
