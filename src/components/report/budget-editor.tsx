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
}

interface Props {
  initial: BudgetPlan | null
  gemEstimate: string | null
  gemNote: string | null
  gemTier: string | null
  submissionId: string
  onSave?: (plan: BudgetPlan) => void
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`
}

export function BudgetEditor({ initial, gemEstimate, gemNote, gemTier, submissionId, onSave }: Props) {
  const hasUserBudget = (initial?.total ?? 0) > 0
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(hasUserBudget ? fmtFull(initial!.total) : '')
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [saving, setSaving] = useState(false)

  const save = useCallback(async (total: number, expl: string) => {
    const plan: BudgetPlan = { line_items: [], explanation: expl, total }
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

  function handleSaveBudget() {
    const amt = parseInt(budgetInput.replace(/[^0-9]/g, ''), 10)
    if (!amt || isNaN(amt)) return
    save(amt, explanation)
    setEditing(false)
  }

  function handleRevert() {
    save(0, '')
    setBudgetInput('')
    setExplanation('')
    setEditing(false)
  }

  const tierLabel = gemTier ? gemTier.charAt(0).toUpperCase() + gemTier.slice(1) : null

  return (
    <div>
      {/* Main budget display */}
      <div className="flex items-baseline gap-3 mb-2">
        {hasUserBudget && !editing ? (
          <>
            <span className="text-[24px] font-medium" style={{ color: '#1C1917' }}>{fmtFull(initial!.total)}</span>
            {gemEstimate && (
              <span className="text-[13px] line-through" style={{ color: '#A8A29E' }}>{gemEstimate}</span>
            )}
          </>
        ) : (
          <>
            <span className="text-[24px] font-medium" style={{ color: '#1C1917' }}>{gemEstimate || 'No estimate'}</span>
            {tierLabel && (
              <span className="text-[13px]" style={{ color: '#78716C' }}>{tierLabel}</span>
            )}
          </>
        )}
      </div>

      {/* Source + edit/revert */}
      <div className="flex items-center gap-2 mb-4">
        {hasUserBudget && !editing ? (
          <>
            <span className="text-[12px]" style={{ color: '#78716C' }}>Your budget</span>
            <span className="text-[11px]" style={{ color: '#A8A29E' }}>·</span>
            <button onClick={() => setEditing(true)} className="text-[12px] underline border-0 bg-transparent cursor-pointer p-0" style={{ color: '#534AB7' }}>Edit</button>
            <span className="text-[11px]" style={{ color: '#A8A29E' }}>·</span>
            <button onClick={handleRevert} className="text-[12px] underline border-0 bg-transparent cursor-pointer p-0" style={{ color: '#534AB7' }}>Revert to GEM estimate</button>
          </>
        ) : !editing ? (
          <>
            <span className="text-[12px]" style={{ color: '#534AB7' }}>Based on GEM evaluation</span>
            <span className="text-[11px]" style={{ color: '#A8A29E' }}>·</span>
            <button onClick={() => setEditing(true)} className="text-[12px] underline border-0 bg-transparent cursor-pointer p-0" style={{ color: '#78716C' }}>Edit</button>
          </>
        ) : null}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: '#fafaf9', border: '1px solid #e5e7eb' }}>
          <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: '#78716C' }}>Your budget</label>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              placeholder="e.g. $5,000,000"
              className="flex-1 text-[15px] font-medium px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#534AB7]"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveBudget()}
            />
            <button
              onClick={handleSaveBudget}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-white border-0 cursor-pointer"
              style={{ background: '#534AB7' }}
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-2 rounded-lg text-[13px] border border-gray-200 bg-white cursor-pointer"
              style={{ color: '#78716C' }}
            >
              Cancel
            </button>
          </div>
          <textarea
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Explain your budget (optional)"
            className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#534AB7] resize-none"
            rows={2}
          />
        </div>
      )}

      {/* Explanation — from LLM or user */}
      {!editing && (gemNote || explanation) && (
        <div className="rounded-lg px-4 py-3" style={{ background: '#fafaf9' }}>
          <p className="text-[13px] m-0 leading-relaxed" style={{ color: '#44403C' }}>
            {explanation || gemNote}
          </p>
        </div>
      )}

      {saving && <p className="text-[12px] mt-2" style={{ color: '#78716C' }}>Saving...</p>}
    </div>
  )
}
