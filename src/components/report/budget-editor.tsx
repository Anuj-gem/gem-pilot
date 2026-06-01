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
  const [editingExplanation, setEditingExplanation] = useState(false)
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
    setEditingExplanation(false)
    setDirty(true)
    save(items, explanation)
  }

  const hasContent = items.length > 0 || explanation.trim().length > 0

  return (
    <div className="bg-white rounded-2xl p-5 px-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Budget</h3>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Visible to investors
        </span>
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

      {/* Empty state */}
      {!hasContent && !addingItem && (
        <div className="border-2 border-dashed border-gray-200 rounded-lg py-8 text-center">
          <p className="text-sm text-gray-500 mb-1">Break down your budget</p>
          <p className="text-xs text-gray-400 mb-3">Add line items to show where the money goes</p>
          <button
            onClick={() => setAddingItem(true)}
            className="text-sm font-medium px-4 py-1.5 rounded-lg border border-[#534AB7] hover:bg-[#EEEDFE] transition-colors"
            style={{ color: '#534AB7' }}
          >
            + Add line item
          </button>
        </div>
      )}

      {/* Line items */}
      {(hasContent || addingItem) && (
        <div>
          {items.length > 0 && (
            <>
              <div className="grid gap-2 text-xs text-gray-400 uppercase tracking-wider mb-1" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
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
            </>
          )}

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
              <div className="flex gap-1">
                <button onClick={addItem} className="text-green-600 hover:text-green-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              </div>
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

          {/* Total */}
          {items.length > 0 && (
            <div className="grid gap-2 pt-3 border-t border-gray-100 items-center" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
              <span className="text-sm font-medium text-gray-900">Total budget</span>
              <span className="text-right text-sm font-medium text-gray-900">{fmtFull(total)}</span>
              <span />
            </div>
          )}
        </div>
      )}

      {/* Explanation */}
      {(hasContent || explanation) && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Explain your budget</label>
          {editingExplanation ? (
            <div>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Break down your budget, explain key costs, note if and why you differ from the GEM estimate..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#534AB7] resize-none"
                rows={4}
                autoFocus
              />
              <button
                onClick={saveExplanation}
                className="mt-2 text-xs font-medium px-3 py-1 rounded border border-[#534AB7] hover:bg-[#EEEDFE] transition-colors"
                style={{ color: '#534AB7' }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <div
              onClick={() => setEditingExplanation(true)}
              className="text-sm text-gray-900 leading-relaxed cursor-pointer group"
            >
              {explanation || (
                <span className="text-gray-400 italic">Break down your budget, explain key costs, note if and why you differ from the GEM estimate...</span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline ml-2 text-gray-300 group-hover:text-gray-500 transition-colors align-middle"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          )}
        </div>
      )}

      {saving && <p className="text-xs text-gray-400 mt-2">Saving...</p>}
    </div>
  )
}
