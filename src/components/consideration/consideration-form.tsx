'use client'

// ConsiderationForm — select scripts and submit for consideration.
// Trial users can only include their first script. Pro users can include all.
// Locked scripts + upgrade CTAs open the paywall modal via gem:open-upgrade-modal.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OpenCallsDropdown } from '@/components/dashboard/open-calls-dropdown'
import { InlineScriptUpload } from '@/components/inline-script-upload'

type ScriptOption = {
  id: string
  title: string
  format: string | null
  score: number | null
  carriedForward: boolean
  createdAt: string
  eligible: boolean
  openCallMatches: { title: string; slug: string }[]
}

function openUpgrade() {
  window.dispatchEvent(new Event('gem:open-upgrade-modal'))
}

export function ConsiderationForm({
  scripts, isPro, isEditing = false, currentScriptIds = [],
}: {
  scripts: ScriptOption[]; isPro: boolean; isEditing?: boolean; currentScriptIds?: string[]
}) {
  const router = useRouter()
  const carried = isEditing ? [] : scripts.filter(s => s.carriedForward && s.eligible)
  const selectable = isEditing
    ? scripts.filter(s => s.eligible)
    : scripts.filter(s => !s.carriedForward && s.eligible)
  const locked = scripts.filter(s => !s.eligible)

  const currentSet = new Set(currentScriptIds)
  const [selected, setSelected] = useState<Set<string>>(
    isEditing
      ? new Set(selectable.filter(s => currentSet.has(s.id)).map(s => s.id))
      : new Set(selectable.map(s => s.id))
  )
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

    const endpoint = isEditing ? '/api/consideration/update' : '/api/consideration/submit'
    const method = isEditing ? 'PATCH' : 'POST'
    const res = await fetch(endpoint, {
      method,
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
      <h1 className="text-[22px] font-bold text-gray-900 m-0">
        {isEditing ? 'Edit consideration' : 'Request consideration'}
      </h1>
      <p className="text-[14px] text-gray-500 mt-1.5 mb-6">
        {isEditing
          ? 'Update which scripts are included. Your consideration will be reviewed with whatever you select below.'
          : 'Select which scripts to include. Our industry partners will consider everything you submit when deciding whether to move forward with you.'}
      </p>

      {/* Eligible scripts */}
      {selectable.length > 0 && (
        <>
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-purple-600 m-0 mb-2">
            {carried.length > 0 ? 'New scripts' : 'Your scripts'}
          </p>
          {selectable.map(s => {
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[12px] text-gray-400">
                      {s.format || 'Script'}{s.score != null ? ` · ${s.score.toFixed(1)}` : ''}
                    </span>
                    {s.openCallMatches.length > 0 && (
                      <>
                        <span className="text-gray-200">&middot;</span>
                        <OpenCallsDropdown
                          count={s.openCallMatches.length}
                          matches={s.openCallMatches}
                        />
                      </>
                    )}
                  </div>
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
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-gray-400 m-0 mb-2">
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[12px] text-gray-400">
                    {s.format || 'Script'}{s.score != null ? ` · ${s.score.toFixed(1)}` : ''}
                  </span>
                  {s.openCallMatches.length > 0 && (
                    <>
                      <span className="text-gray-200">&middot;</span>
                      <OpenCallsDropdown
                        count={s.openCallMatches.length}
                        matches={s.openCallMatches}
                      />
                    </>
                  )}
                </div>
              </div>
              <span className="text-[12px] text-gray-400 font-medium shrink-0">Included</span>
            </div>
          ))}
        </>
      )}

      {/* Locked scripts (trial users with multiple scripts) */}
      {locked.length > 0 && (
        <>
          <div className="h-2" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-gray-400 m-0">
              Requires GEM Pro
            </p>
            <button
              onClick={openUpgrade}
              className="text-[12px] font-semibold text-purple-600 hover:text-purple-800"
            >
              Upgrade →
            </button>
          </div>
          {locked.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={openUpgrade}
              className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl mb-2 bg-gray-50 opacity-60 text-left hover:border-purple-300 hover:opacity-80 transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-gray-500 m-0 truncate">{s.title}</p>
                <p className="text-[12px] text-gray-400 m-0 mt-0.5">
                  {s.format || 'Script'}{s.score != null ? ` · ${s.score.toFixed(1)}` : ''}
                </p>
              </div>
            </button>
          ))}
        </>
      )}

      {/* Trial upgrade nudge */}
      {!isPro && (
        <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-[12.5px] text-gray-600 m-0 leading-[1.5]">
            Only your first script is eligible on the free trial.{' '}
            <button
              onClick={openUpgrade}
              className="text-purple-600 font-semibold hover:text-purple-800 underline"
            >
              Upgrade to GEM Pro
            </button>{' '}
            to submit your full portfolio for consideration.
          </p>
        </div>
      )}

      {/* Add a new script CTA */}
      <div className="mt-4">
        {isPro ? (
          <InlineScriptUpload />
        ) : (
          <button
            onClick={openUpgrade}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-[13px] font-semibold text-gray-400 hover:border-purple-400 hover:text-purple-600 transition-colors"
          >
            + Submit additional scripts — GEM Pro
          </button>
        )}
      </div>

      {/* Summary */}
      {totalCount > 0 && (
        <div className="mt-4 px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl">
          <p className="text-[12.5px] text-purple-700 m-0 leading-[1.5]">
            <strong>{totalCount} {totalCount === 1 ? 'script' : 'scripts'}</strong> will be reviewed together as your portfolio.
            You&apos;ll receive feedback on your strengths, positioning, and next steps.
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
        {submitting ? 'Submitting…' : isEditing ? 'Update consideration' : 'Request consideration'}
      </button>

      <p className="text-[12px] text-gray-400 text-center mt-3 m-0">
        You&apos;ll receive feedback within 5–7 days
      </p>
    </div>
  )
}
