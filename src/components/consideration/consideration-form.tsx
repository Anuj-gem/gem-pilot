'use client'

// ConsiderationForm — select scripts and submit for consideration.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ScriptOption = {
  id: string
  title: string
  format: string | null
  score: number | null
  carriedForward: boolean
  createdAt: string
}

export function ConsiderationForm({ scripts }: { scripts: ScriptOption[] }) {
  const router = useRouter()
  const carried = scripts.filter(s => s.carriedForward)
  const selectable = scripts.filter(s => !s.carriedForward)

  // New scripts first (not previously considered), then carried forward below
  const newScripts = selectable
  const [selected, setSelected] = useState<Set<string>>(new Set(selectable.map(s => s.id)))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalCount = carried.length + selected.size

  async function handleSubmit() {
    if (totalCount === 0) return
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/consideration/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script_ids: [...carried.map(s => s.id), ...selected],
        carried_ids: carried.map(s => s.id),
      }),
    })

    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-[22px] font-bold text-gray-900 m-0">Request consideration</h1>
      <p className="text-[14px] text-gray-500 mt-1.5 mb-6">
        Select which scripts to include. Previously submitted scripts carry forward automatically.
      </p>

      {/* New scripts — shown first */}
      {newScripts.length > 0 && (
        <>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-purple-600 m-0 mb-2">
            {carried.length > 0 ? 'New scripts' : 'Your scripts'}
          </p>
          {newScripts.map(s => {
            const isSelected = selected.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border rounded-xl mb-2 text-left transition-colors ${
                  isSelected
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-purple-600' : 'border-2 border-gray-300'
                }`}>
                  {isSelected && <span className="text-white text-[11px] font-bold">✓</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                  <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                    {s.format || 'Script'}{s.score != null ? ` · ${s.score.toFixed(1)}` : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </>
      )}

      {/* Previously considered scripts — carried forward */}
      {carried.length > 0 && (
        <>
          <div className="h-2" />
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-400 m-0 mb-2">
            Previously considered
          </p>
          {carried.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl mb-2 bg-gray-50 opacity-75"
            >
              <div className="w-5 h-5 rounded bg-gray-400 flex items-center justify-center shrink-0">
                <span className="text-white text-[11px] font-bold">✓</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-gray-700 m-0 truncate">{s.title}</p>
                <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                  {s.format || 'Script'}{s.score != null ? ` · ${s.score.toFixed(1)}` : ''}
                </p>
              </div>
              <span className="text-[10.5px] text-gray-400 font-medium shrink-0">Included</span>
            </div>
          ))}
        </>
      )}

      {/* Summary */}
      {totalCount > 0 && (
        <div className="mt-4 px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl">
          <p className="text-[12.5px] text-purple-700 m-0 leading-[1.5]">
            <strong>{totalCount} {totalCount === 1 ? 'script' : 'scripts'}</strong> will be reviewed together as your portfolio.
            You&apos;ll receive holistic feedback on your commercial positioning and next steps.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-red-600 mt-3 m-0">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || totalCount === 0}
        className="w-full mt-5 px-4 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-bold transition-colors"
      >
        {submitting ? 'Submitting…' : 'Submit for consideration'}
      </button>

      <p className="text-[11.5px] text-gray-400 text-center mt-3 m-0">
        You&apos;ll receive feedback within 5–7 days
      </p>
    </div>
  )
}
