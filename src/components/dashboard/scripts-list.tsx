'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UpgradePill } from '@/components/dashboard/upgrade-pill'
import { ScriptRowCard, type ScriptRowData } from '@/components/cards/script-row-card'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { useNewUploads } from '@/hooks/use-new-uploads'

type ScriptRow = ScriptRowData & {
  isProcessing?: boolean
  isLocked?: boolean
  hidden?: boolean
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

      {/* Optimistic processing cards (instant, before server refresh) */}
      {optimistic.length > 0 && (
        <div className="space-y-2 mb-2">
          {optimistic.map(s => (
            <ScriptRowCard key={s.id} script={s} />
          ))}
        </div>
      )}

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
            onClick={bulkDelete}
            className="text-[12px] font-semibold text-red-600 hover:text-red-800 transition-colors"
          >
            Delete selected
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
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <p className="text-[14px] text-gray-400 m-0">No scripts yet. Use <strong>+ New</strong> to upload your first.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="px-1 py-1 flex items-center gap-3">
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
              className={`relative ${deleting.has(s.id) ? 'opacity-40 pointer-events-none' : ''}`}
            >
              {s.isLocked && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-xl">
                  <UpgradePill />
                </div>
              )}
              <ScriptRowCard
                script={s}
                showMenu={!s.isLocked && !s.isProcessing}
                onDelete={deleteScript}
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload button removed — use "+ New" in the nav */}
    </div>
  )
}
