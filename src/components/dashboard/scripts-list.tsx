'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { DiscoverToggle } from '@/components/dashboard/discover-toggle'
import { ScriptCardMenu } from '@/components/dashboard/script-card-menu'
import { AddCollaboratorButton } from '@/components/dashboard/add-collaborator-button'
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
  collaboratorCount: number
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

// GEM diamond logo — matches dashboard exactly
function gemDiamond(size = 7) {
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

  function handleDelete(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    fetch(`/api/scripts/${id}/hide`, { method: 'DELETE' }).then(() => router.refresh())
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

      {/* Script list — single column, dashboard-style compact rows */}
      {sortedVisible.length === 0 && optimistic.length === 0 ? (
        <div className="px-6 py-10 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 4 }}>
          <p className="text-[14px] font-semibold text-white m-0 mb-1">No scripts yet</p>
          <p className="text-[13px] m-0" style={{ color: 'rgba(255,255,255,1)' }}>Upload your first screenplay to get a full evaluation.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Optimistic processing cards */}
          {optimistic.map(s => (
            <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4 }}>
              <div className="w-[40px] h-[50px] shrink-0 rounded flex items-center justify-center" style={{ background: placeholderGradient }}>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-white m-0 truncate">{s.title}</p>
                <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: 'rgba(255,255,255,1)' }}>Evaluating...</p>
              </div>
            </div>
          ))}

          {/* Completed script cards */}
          {sortedVisible.map(s => {
            if (s.isProcessing) {
              return (
                <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4 }}>
                  <div className="w-[40px] h-[50px] shrink-0 rounded flex items-center justify-center" style={{ background: placeholderGradient }}>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white m-0 truncate">{s.title}</p>
                    <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: 'rgba(255,255,255,1)' }}>Evaluating...</p>
                  </div>
                </div>
              )
            }

            const rounded = s.score ? Math.round(s.score) : null
            const reportHref = s.evaluationId ? `/report/${s.evaluationId}` : '/scripts'
            const oppCount = s.matchingOpportunities?.length ?? 0

            return (
              <div key={s.id} className={`flex gap-2 items-start ${deleting.has(s.id) ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* Checkbox column — separate from card */}
                {!s.isLocked && (
                  <button
                    onClick={() => toggleSelect(s.id)}
                    className="mt-3 w-5 h-5 rounded shrink-0 flex items-center justify-center transition-colors cursor-pointer border-2"
                    style={{
                      borderColor: selected.has(s.id) ? '#7c3aed' : 'rgba(255,255,255,0.2)',
                      background: selected.has(s.id) ? '#7c3aed' : 'transparent',
                    }}
                  >
                    {selected.has(s.id) && (
                      <span className="text-white text-[10px] font-bold">✓</span>
                    )}
                  </button>
                )}

                {/* Card */}
                <div
                  className="flex-1 min-w-0 relative px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4 }}
                >
                  {s.isLocked && (
                    <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center" style={{ borderRadius: 4 }}>
                      <UpgradePill />
                    </div>
                  )}

                  {/* Title row with poster + three-dot menu */}
                  <div className="flex items-start gap-2.5">
                    <Link href={reportHref} className="flex-1 min-w-0 no-underline group">
                      <div className="flex items-center gap-2.5">
                        {s.posterUrl && (
                          <div className="w-[40px] h-[50px] shrink-0 rounded overflow-hidden">
                            <img src={s.posterUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-white m-0 truncate group-hover:text-purple-300 transition-colors">{s.title}</p>
                          <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: 'rgba(255,255,255,1)' }}>
                            {[s.format, s.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase()), fmtDate(s.createdAt)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    </Link>
                    {!s.isLocked && (
                      <ScriptCardMenu scriptId={s.id} evaluationId={s.evaluationId} onDelete={handleDelete} />
                    )}
                  </div>

                  {/* Stats row — score, heat | add collaborators | opps | leaderboard */}
                  <div className="flex items-center gap-0 mt-2 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold shrink-0" style={{ color: '#a78bfa' }}>
                      {gemDiamond(7)} {rounded || '—'}
                    </span>
                    <span className="text-[12px] shrink-0 ml-3" style={{ color: '#fb923c' }}>🔥 {s.heat}</span>
                    {/* Separator */}
                    <span className="shrink-0 mx-3" style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', display: 'inline-block' }} />
                    <AddCollaboratorButton scriptId={s.id} collaboratorCount={s.collaboratorCount} />
                    {oppCount > 0 && (
                      <>
                        <span className="shrink-0 mx-3" style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', display: 'inline-block' }} />
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 shrink-0" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', borderRadius: 3 }}>
                          {oppCount} available {oppCount === 1 ? 'opportunity' : 'opportunities'}
                        </span>
                      </>
                    )}
                    <span className="shrink-0 mx-3" style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', display: 'inline-block' }} />
                    <span className="shrink-0">
                      <DiscoverToggle scriptId={s.id} isPublic={s.isPublic} isAnon={false} />
                    </span>
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
