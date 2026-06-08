'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { ScriptCardMenu } from '@/components/dashboard/script-card-menu'
import { useNewUploads } from '@/hooks/use-new-uploads'
import { FailedScriptCard } from '@/components/dashboard/failed-script-card'

type CollabInfo = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: string
  status: string
}

type ScriptRow = {
  id: string
  title: string
  format: string | null
  genre: string | null
  genres: string[]
  score: number | null
  evaluationId: string | null
  createdAt: string
  totalBacking: number
  backerCount: number
  totalFollowing: number
  followerCount: number
  collaboratorCount: number
  collaborators?: CollabInfo[]
  posterUrl: string | null
  isPublic: boolean
  qualifyingOpps?: { id: string; title: string; slug: string; subtitle: string | null }[]
  availableOppCount?: number
  pendingAppCount?: number
  scoreRank?: number | null
  matchingOpportunities?: { title: string; slug: string }[]
  isProcessing?: boolean
  isFailed?: boolean
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
        background: '#7c3aed',
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

      {/* Script list — white expanded cards matching dashboard */}
      {sortedVisible.length === 0 && optimistic.length === 0 ? (
        <div className="px-6 py-10 text-center" style={{ background: '#ffffff', border: '1px dashed #d1d5db', borderRadius: 4 }}>
          <p className="text-[14px] font-semibold m-0 mb-1" style={{ color: '#111827' }}>No scripts yet</p>
          <p className="text-[13px] m-0" style={{ color: '#6b7280' }}>Upload your first screenplay to get a full evaluation.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Optimistic processing cards */}
          {optimistic.map(s => (
            <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4 }}>
              <div className="w-[40px] h-[50px] shrink-0 rounded flex items-center justify-center" style={{ background: placeholderGradient }}>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold m-0 truncate" style={{ color: '#111827' }}>{s.title}</p>
                <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>Evaluating...</p>
              </div>
            </div>
          ))}

          {/* Completed script cards */}
          {sortedVisible.map(s => {
            if (s.isProcessing) {
              return (
                <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                  <div className="w-[40px] h-[50px] shrink-0 rounded flex items-center justify-center" style={{ background: placeholderGradient }}>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold m-0 truncate" style={{ color: '#111827' }}>{s.title}</p>
                    <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>Evaluating...</p>
                  </div>
                </div>
              )
            }

            if (s.isFailed) {
              return (
                <FailedScriptCard key={s.id} scriptId={s.id} title={s.title} format={s.format} createdAt={s.createdAt} />
              )
            }

            const rounded = s.score ? Math.round(s.score) : null
            const reportHref = s.evaluationId ? `/report/${s.evaluationId}` : '/scripts'

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

                {/* Card — white expanded style matching dashboard */}
                <div
                  className="flex-1 min-w-0 relative px-3 py-2.5"
                  style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  {s.isLocked && (
                    <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center" style={{ borderRadius: 8 }}>
                      <UpgradePill />
                    </div>
                  )}

                  {/* Row 1: poster + title + format/genre/date + menu */}
                  <div className="flex items-start gap-2.5">
                    <Link href={reportHref} className="flex-1 min-w-0 no-underline group">
                      <div className="flex items-center gap-2.5">
                        {s.posterUrl && (
                          <div className="w-[40px] h-[50px] shrink-0 rounded overflow-hidden">
                            <img src={s.posterUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold m-0 truncate group-hover:text-purple-600 transition-colors" style={{ color: '#111827' }}>{s.title}</p>
                          <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>
                            {[s.format, s.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase()), fmtDate(s.createdAt)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    </Link>
                    {!s.isLocked && (
                      <ScriptCardMenu scriptId={s.id} evaluationId={s.evaluationId} onDelete={handleDelete} />
                    )}
                  </div>

                  {/* Row 2: GEM Score + rank | Backing badges | View report → */}
                  <div className="flex items-center mt-2" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>GEM Score</span>
                      <span className="inline-flex">{gemDiamond(5)}</span>
                      <span className="text-[15px] font-extrabold leading-none" style={{ color: '#6d28d9' }}>{rounded || '—'}</span>
                      {s.isPublic && s.scoreRank ? (
                        <span className="text-[11px] font-semibold" style={{ color: '#7c3aed' }}>#{s.scoreRank}</span>
                      ) : (
                        <span className="text-[11px] font-semibold" style={{ color: '#9ca3af' }}>Rank: N/A</span>
                      )}
                    </div>
                    {(s.totalBacking > 0 || s.totalFollowing > 0) && (
                      <div className="ml-4 flex items-center gap-2">
                        {s.totalBacking > 0 && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#ecfdf5', color: '#15803d', border: '1px solid #6ee7b7' }}>
                            {s.totalBacking >= 1000 ? `$${Math.round(s.totalBacking / 1000)}K` : `$${s.totalBacking}`} backed
                          </span>
                        )}
                        {s.totalFollowing > 0 && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
                            {s.totalFollowing >= 1000 ? `$${Math.round(s.totalFollowing / 1000)}K` : `$${s.totalFollowing}`} following
                          </span>
                        )}
                      </div>
                    )}
                    <span className="flex-1" />
                    {s.evaluationId && (
                      <Link href={reportHref} className="text-[12px] font-semibold no-underline shrink-0" style={{ color: '#7c3aed' }}>
                        View report →
                      </Link>
                    )}
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
