'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { DiscoverToggle } from '@/components/dashboard/discover-toggle'
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
  isPublic: boolean
  matchingOpportunities?: { title: string; slug: string }[]
  isProcessing?: boolean
  isLocked?: boolean
  hidden?: boolean
}

type SortKey = 'date' | 'title' | 'score'
type SortDir = 'asc' | 'desc'

const placeholderGradient = 'linear-gradient(135deg, #7c3aed, #6d28d9)'
const cardShadow = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'

// GEM diamond logo — matches dashboard exactly
function GemDiamond({ size = 10 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center shrink-0 rotate-45"
      style={{ width: size * 1.8, height: size * 1.8 }}
    >
      <span className="absolute rotate-0" style={{
        width: size * 1.8, height: size * 1.8,
        background: 'rgba(167, 139, 250, 0.15)',
        borderRadius: size * 0.06,
      }} />
      <span className="absolute rotate-0" style={{
        width: size * 1.35, height: size * 1.35,
        background: 'rgba(139, 92, 246, 0.35)',
        borderRadius: size * 0.06,
      }} />
      <span className="absolute rotate-0" style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
        borderRadius: size * 0.06,
      }} />
    </span>
  )
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

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

  async function deleteScript(id: string) {
    setDeleting(prev => new Set(prev).add(id))
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

      {/* Sort controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-white/50 mr-1">Sort:</span>
          {(['date', 'title', 'score'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer border-0 ${
                sortKey === key
                  ? 'bg-white/15 text-white'
                  : 'bg-transparent text-white/50 hover:text-white/70'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}{arrow(key)}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-white/50">
          {visible.length} {visible.length === 1 ? 'script' : 'scripts'}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <span className="text-[12px] text-white/70 font-medium">{selected.size} selected</span>
          <button
            onClick={bulkDelete}
            className="text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer border-0 bg-transparent"
          >
            Delete selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] text-white/50 hover:text-white/70 transition-colors ml-auto cursor-pointer border-0 bg-transparent"
          >
            Clear
          </button>
        </div>
      )}

      {/* Script grid — same layout as dashboard */}
      {sortedVisible.length === 0 && optimistic.length === 0 ? (
        <div className="rounded-2xl px-8 py-16 text-center" style={{ background: '#ffffff', boxShadow: cardShadow }}>
          <div className="w-16 h-20 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: '#f3f0ff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2v6h6M12 18v-6M9 15h6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-gray-900 m-0 mb-1">No scripts yet</p>
          <p className="text-[13px] text-gray-500 m-0">Upload your first screenplay to get a full evaluation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Optimistic processing cards */}
          {optimistic.map(s => (
            <div key={s.id} className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', boxShadow: cardShadow }}>
              <div className="aspect-[5/4] sm:aspect-[3/2] w-full flex items-center justify-center" style={{ background: placeholderGradient }}>
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[12px] font-medium text-white/70 m-0">Evaluating...</p>
                </div>
              </div>
              <div className="px-4 py-4">
                <h3 className="text-[16px] font-bold text-gray-900 m-0 truncate">{s.title}</h3>
                <p className="text-[13px] text-gray-600 m-0 mt-0.5">{s.format || 'Script'}</p>
              </div>
            </div>
          ))}

          {/* Completed script cards — identical to dashboard */}
          {sortedVisible.map(s => {
            if (s.isProcessing) {
              return (
                <div key={s.id} className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                  <div className="aspect-[5/4] sm:aspect-[3/2] w-full flex items-center justify-center" style={{ background: placeholderGradient }}>
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-[12px] font-medium text-white/70 m-0">Evaluating...</p>
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    <h3 className="text-[16px] font-bold text-gray-900 m-0 truncate">{s.title}</h3>
                    <p className="text-[13px] text-gray-600 m-0 mt-0.5">{s.format || 'Script'}</p>
                  </div>
                </div>
              )
            }

            const rounded = s.score ? Math.round(s.score) : null
            const reportHref = s.evaluationId ? `/report/${s.evaluationId}` : '/scripts'

            return (
              <div
                key={s.id}
                className={`rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-200 relative ${deleting.has(s.id) ? 'opacity-40 pointer-events-none' : ''}`}
                style={{ background: '#ffffff', boxShadow: cardShadow }}
              >
                {s.isLocked && (
                  <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
                    <UpgradePill />
                  </div>
                )}

                {/* Selection checkbox — scripts page only feature */}
                {!s.isLocked && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(s.id) }}
                    className="absolute top-2 left-2 z-20 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer backdrop-blur-sm"
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

                {/* Poster image area — matches dashboard */}
                <Link href={reportHref} className="block no-underline">
                  <div className="aspect-[5/4] sm:aspect-[3/2] w-full relative overflow-hidden">
                    {s.posterUrl ? (
                      <img
                        src={s.posterUrl}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: placeholderGradient }}>
                        {/* Layered concentric diamond — matches dashboard */}
                        <span className="inline-flex items-center justify-center rotate-45" style={{ width: 72, height: 72 }}>
                          <span className="absolute" style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
                          <span className="absolute" style={{ width: 54, height: 54, background: 'rgba(255,255,255,0.15)', borderRadius: 3 }} />
                          <span className="absolute" style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.22)', borderRadius: 2 }} />
                        </span>
                        <p className="text-[11px] text-white/50 m-0 mt-3">Add a poster</p>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Card info — matches dashboard exactly */}
                <div className="px-4 py-4 relative">
                  {/* Three-dot delete menu — top right */}
                  {!s.isLocked && !s.isProcessing && (
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteScript(s.id) }}
                        className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-0 bg-transparent text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
                        title="Delete script"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                    </div>
                  )}

                  <Link href={reportHref} className="block no-underline">
                    <h3 className="text-[16px] font-bold text-gray-900 m-0 line-clamp-2 pr-8 group-hover:text-purple-700 transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-[13px] text-gray-600 m-0 mt-1">
                      {[s.format, s.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase()), fmtDate(s.createdAt)].filter(Boolean).join(' · ')}
                    </p>
                  </Link>

                  {/* Score + Heat — large and prominent, matches dashboard */}
                  <div className="flex items-center gap-4 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[20px] font-bold" style={{ color: '#7c3aed' }}>
                      <GemDiamond size={10} /> {rounded || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[20px] font-bold" style={{ color: s.heat > 0 ? '#ea580c' : '#9ca3af' }}>
                      <span className="text-[18px]">🔥</span> {s.heat}
                    </span>
                  </div>

                  {/* Bottom row: Discover toggle + view report — matches dashboard */}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                    <div className="flex items-center gap-2">
                      <DiscoverToggle scriptId={s.id} isPublic={s.isPublic} isAnon={false} />
                      <span className="text-[12px] text-gray-600">{s.isPublic ? 'Published to Leaderboard' : 'Not published to Leaderboard'}</span>
                    </div>
                    <Link href={reportHref} className="text-[13px] font-semibold text-purple-600 hover:text-purple-700 transition-colors no-underline whitespace-nowrap">
                      View report →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
