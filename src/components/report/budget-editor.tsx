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
  gemEstimate: string | null // e.g. "$2M - $5M" from production_reality
  submissionId: string
  onSave?: (plan: BudgetPlan) => void
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`
  return `$${n.toLocaleString()}`
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`
}

export function BudgetEditor({ initial, gemEstimate, submissionId, onSave }: Props) {
  const [items, setItems] = useState<BudgetLineItem[]>(initial?.line_items ?? [])
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const total = items.reduce((s, i) => s + i.amount, 0)

  const save = useCallback(async (updatedItems: BudgetLineItem[], updatedExplanation: string) => {
    const t = updatedItems.reduce((s, i) => s + i.amount, 0)
    const plan: BudgetPlan = { line_items: updatedItems, explanation: updatedExplanation, total: t }
    setSaving(true)
    try {
      const res = await fetch('/api/report/financial-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, budgetPlan: plan }),
      })
      if (res.ok) {
        setDirty(false)
        onSave?.(plan)
      }
    } finally {
      setSaving(false)
    }
  }, [submissionId, onSave])

  const removeItem = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx)
    setItems(updated)
    setDirty(true)
    save(updated, explanation)
  }

  const addItem = () => {
    const amt = parseInt(newAmount.replace(/[^0-9]/g, ''), 10)
    if (!newLabel.trim() || !amt || isNaN(amt)) return
    const updated = [...items, { label: newLabel.trim(), amount: amt }]
    setItems(updated)
    setNewLabel('')
    setNewAmount('')
    setAddingItem(false)
    setDirty(true)
    save(updated, explanation)
  }

  const saveExplanation = () => {
    setDirty(true)
    save(items, explanation)
  }

  return (
    <div className="bg-white rounded-2xl p-5 px-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-600 font-medium">Budget</h3>
      </div>

      {/* GEM estimate reference */}
      {gemEstimate && (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-4" style={{ background: '#EEEDFE' }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span className="text-sm" style={{ color: '#534AB7' }}>GEM estimate</span>
          </div>
          <span className="text-sm font-medium" style={{ color: '#3C3489' }}>{gemEstimate}</span>
        </div>
      )}

      {/* Line items — always visible */}
      <div>
        <div className="grid gap-2 text-xs text-gray-600 uppercase tracking-wider mb-1" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
          <span>Line item</span>
          <span className="text-right">Cost</span>
          <span />
        </div>

        {items.map((item, i) => (
          <div key={i} className="grid gap-2 py-2.5 border-t border-gray-100 items-center text-sm" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
            <span className="text-gray-900">{item.label}</span>
            <span className="text-right text-gray-900">{fmtFull(item.amount)}</span>
            <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-gray-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}

        {/* Add item form */}
        {addingItem ? (
          <div className="grid gap-2 py-2.5 border-t border-gray-100 items-center" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
            <input
              type="text"
              placeholder="Item name"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#534AB7]"
              autoFocus
            />
            <input
              type="text"
              placeholder="$0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 text-right focus:outline-none focus:border-[#534AB7]"
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <button onClick={addItem} className="text-green-600 hover:text-green-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>
        ) : (
          <div className="py-2.5 border-t border-gray-100">
            <button
              onClick={() => setAddingItem(true)}
              className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: '#534AB7' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add line item
            </button>
          </div>
        )}

        {/* Total — always visible */}
        <div className="grid gap-2 pt-3 border-t border-gray-100 items-center" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
          <span className="text-sm font-medium text-gray-900">Total budget</span>
          <span className="text-right text-sm font-medium text-gray-900">{fmtFull(total)}</span>
          <span />
        </div>
      </div>

      {/* Explanation — always visible, always editable */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <label className="text-xs text-gray-600 uppercase tracking-wider block mb-1.5">Explain your budget</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          onBlur={saveExplanation}
          placeholder="Break down your budget, explain key costs, note if and why you differ from the GEM estimate..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#534AB7] resize-none"
          rows={3}
        />
      </div>

      {saving && <p className="text-xs text-gray-600 mt-2">Saving...</p>}
    </div>
  )
}
