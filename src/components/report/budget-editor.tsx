'use client'

import { useState, useCallback } from 'react'

export interface BudgetLineItem {
  label: string
  amount: number
}

export interface BudgetPlan {
  line_items: BudgetLineItem[]
  explanation: string
  total: number
  budget_low?: number
  budget_high?: number
}

interface Props {
  initial: BudgetPlan | null
  gemEstimate: string | null
  gemNote: string | null
  gemTier: string | null
  gemPerEpisode?: string | null
  gemSeasonTotal?: string | null
  submissionId: string
  onSave?: (plan: BudgetPlan) => void
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString()}`
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`
}

function parseAmount(s: string): number {
  return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0
}

export function BudgetEditor({ initial, gemEstimate, gemNote, gemTier, gemPerEpisode, gemSeasonTotal, submissionId, onSave }: Props) {
  const hasUserBudget = (initial?.total ?? 0) > 0 || (initial?.budget_low ?? 0) > 0 || (initial?.budget_high ?? 0) > 0
  const [editing, setEditing] = useState(false)
  const [lowInput, setLowInput] = useState(initial?.budget_low ? fmtFull(initial.budget_low) : '')
  const [highInput, setHighInput] = useState(initial?.budget_high ? fmtFull(initial.budget_high) : (initial?.total ? fmtFull(initial.total) : ''))
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [saving, setSaving] = useState(false)

  const save = useCallback(async (low: number, high: number, expl: string) => {
    const total = high || low
    const plan: BudgetPlan = { line_items: [], explanation: expl, total, budget_low: low, budget_high: high }
    setSaving(true)
    try {
      const res = await fetch('/api/report/financial-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, budgetPlan: plan }),
      })
      if (res.ok) onSave?.(plan)
    } finally {
      setSaving(false)
    }
  }, [submissionId, onSave])

  function handleSave() {
    const low = parseAmount(lowInput)
    const high = parseAmount(highInput)
    if (!low && !high) return
    save(low, high, explanation)
    setEditing(false)
  }

  function handleRevert() {
    save(0, 0, '')
    setLowInput('')
    setHighInput('')
    setExplanation('')
    setEditing(false)
  }

  const isSeries = !!gemPerEpisode
  const gemDisplayEstimate = (() => {
    const raw = gemEstimate?.replace(/total negative cost/i, '').trim()
    if (isSeries && gemPerEpisode) {
      return `${gemPerEpisode.replace(/\/ep$/i, '').trim()} per episode`
    }
    return raw || null
  })()

  // Display the user's range or single number
  const userLow = initial?.budget_low ?? 0
  const userHigh = initial?.budget_high ?? initial?.total ?? 0
  const userDisplay = userLow > 0 && userHigh > 0 && userLow !== userHigh
    ? `${fmtShort(userLow)}–${fmtShort(userHigh)}`
    : userHigh > 0
    ? fmtFull(userHigh)
    : null

  return (
    <div>
      {!editing ? (
        <>
          {/* Display state */}
          <div className="mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[24px] font-medium" style={{ color: '#1C1917' }}>
                {hasUserBudget ? userDisplay : gemDisplayEstimate || 'No estimate'}
              </span>
            </div>
            {!hasUserBudget && isSeries && gemSeasonTotal && (
              <div className="text-[13px] mt-1" style={{ color: '#78716C' }}>{gemSeasonTotal}</div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4">
            {hasUserBudget ? (
              <>
                <button onClick={() => setEditing(true)} className="text-[12px] underline border-0 bg-transparent cursor-pointer p-0" style={{ color: '#534AB7' }}>Edit</button>
                <span className="text-[11px]" style={{ color: '#A8A29E' }}>·</span>
                <button onClick={handleRevert} className="text-[12px] underline border-0 bg-transparent cursor-pointer p-0" style={{ color: '#78716C' }}>
                  Revert to GEM estimate{gemDisplayEstimate ? ` (${gemDisplayEstimate})` : ''}
                </button>
              </>
            ) : (
              <>
                <span className="text-[12px]" style={{ color: '#534AB7' }}>Based on GEM evaluation</span>
                <span className="text-[11px]" style={{ color: '#A8A29E' }}>·</span>
                <button onClick={() => setEditing(true)} className="text-[12px] underline border-0 bg-transparent cursor-pointer p-0" style={{ color: '#78716C' }}>Set your own budget</button>
              </>
            )}
          </div>

          {/* Explanation */}
          {(explanation || gemNote) && (
            <div className="rounded-lg px-4 py-3" style={{ background: '#fafaf9' }}>
              <p className="text-[13px] m-0 leading-relaxed" style={{ color: '#44403C' }}>
                {explanation || gemNote}
              </p>
            </div>
          )}
        </>
      ) : (
        /* Edit form */
        <div className="p-4 rounded-lg" style={{ background: '#fafaf9', border: '1px solid #e5e7eb' }}>
          <div className="text-[12px] mb-2" style={{ color: '#78716C' }}>Your budget range</div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1">
              <label className="text-[11px] block mb-1" style={{ color: '#A8A29E' }}>Low</label>
              <input
                type="text"
                value={lowInput}
                onChange={e => setLowInput(e.target.value)}
                placeholder="e.g. $5,000,000"
                className="w-full text-[15px] font-medium px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#534AB7]"
                autoFocus
              />
            </div>
            <span className="text-[14px] mt-5" style={{ color: '#A8A29E' }}>–</span>
            <div className="flex-1">
              <label className="text-[11px] block mb-1" style={{ color: '#A8A29E' }}>High</label>
              <input
                type="text"
                value={highInput}
                onChange={e => setHighInput(e.target.value)}
                placeholder="e.g. $10,000,000"
                className="w-full text-[15px] font-medium px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#534AB7]"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>
          <div className="text-[12px] mb-1.5" style={{ color: '#78716C' }}>Explanation (optional)</div>
          <textarea
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Why does your budget differ from the GEM estimate?"
            className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#534AB7] resize-none mb-3"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-[13px] font-medium text-white border-0 cursor-pointer" style={{ background: '#534AB7' }}>Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg text-[13px] border border-gray-200 bg-white cursor-pointer" style={{ color: '#78716C' }}>Cancel</button>
          </div>
        </div>
      )}

      {saving && <p className="text-[12px] mt-2" style={{ color: '#78716C' }}>Saving...</p>}
    </div>
  )
}
