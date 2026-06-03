'use client'

import { useState, useCallback } from 'react'

export interface RevenueSource {
  label: string
  projection: number
  note: string
}

export interface RevenuePlan {
  sources: RevenueSource[]
  total: number
}

const PRESET_SOURCES = [
  'Theatrical distribution',
  'Streaming sale',
  'Online / self-distribution',
  'Social media',
  'Merchandise',
  'Product placement',
  'Other',
]

interface Props {
  initial: RevenuePlan | null
  submissionId: string
  onSave?: (plan: RevenuePlan) => void
  readOnly?: boolean
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`
}

export function RevenuePlanEditor({ initial, submissionId, onSave, readOnly = false }: Props) {
  // Read-only mode for non-owners
  if (readOnly) {
    const sources = initial?.sources ?? []
    const total = sources.reduce((s, src) => s + src.projection, 0)
    if (sources.length === 0) return <p className="text-[13px] m-0" style={{ color: '#78716C' }}>No revenue sources added yet.</p>
    return (
      <div>
        {sources.map((src, i) => (
          <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: i < sources.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <span className="text-[14px]" style={{ color: '#1C1917' }}>{src.label}</span>
            <span className="text-[14px] font-medium" style={{ color: '#534AB7' }}>{fmtFull(src.projection)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3 mt-2" style={{ borderTop: '1px solid #e7e5e4' }}>
          <span className="text-[14px] font-semibold" style={{ color: '#1C1917' }}>Total</span>
          <span className="text-[14px] font-semibold" style={{ color: '#534AB7' }}>{fmtFull(total)}</span>
        </div>
      </div>
    )
  }

  const [sources, setSources] = useState<RevenueSource[]>(initial?.sources ?? [])
  const [saving, setSaving] = useState(false)
  const [addingSource, setAddingSource] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newProjection, setNewProjection] = useState('')
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [editNoteValue, setEditNoteValue] = useState('')

  const total = sources.reduce((s, src) => s + src.projection, 0)
  const usedLabels = new Set(sources.map((s) => s.label))

  const save = useCallback(async (updatedSources: RevenueSource[]) => {
    const t = updatedSources.reduce((s, src) => s + src.projection, 0)
    const plan: RevenuePlan = { sources: updatedSources, total: t }
    setSaving(true)
    try {
      const res = await fetch('/api/report/financial-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, revenuePlan: plan }),
      })
      if (res.ok) onSave?.(plan)
    } finally {
      setSaving(false)
    }
  }, [submissionId, onSave])

  const removeSource = (idx: number) => {
    const updated = sources.filter((_, i) => i !== idx)
    setSources(updated)
    save(updated)
  }

  const addSource = () => {
    const amt = parseInt(newProjection.replace(/[^0-9]/g, ''), 10)
    if (!newLabel.trim() || !amt || isNaN(amt)) return
    const updated = [...sources, { label: newLabel.trim(), projection: amt, note: newNote.trim() }]
    setSources(updated)
    setNewLabel('')
    setNewProjection('')
    setNewNote('')
    setAddingSource(false)
    save(updated)
  }

  const addPreset = (label: string) => {
    setNewLabel(label)
    setAddingSource(true)
  }

  const startEditNote = (idx: number) => {
    setEditingNote(idx)
    setEditNoteValue(sources[idx].note)
  }

  const saveNote = (idx: number) => {
    const updated = sources.map((s, i) => i === idx ? { ...s, note: editNoteValue } : s)
    setSources(updated)
    setEditingNote(null)
    save(updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-600 font-medium">Revenue plan</h3>
      </div>

      {/* Sources — always visible */}
      <div>
        <div className="grid gap-2 text-xs text-gray-600 uppercase tracking-wider mb-1" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
          <span>Source</span>
          <span className="text-right">Projection</span>
          <span />
        </div>

        {sources.map((src, i) => (
          <div key={i} className="py-2.5 border-t border-gray-100">
            <div className="grid gap-2 items-center text-sm" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
              <span className="text-gray-900">{src.label}</span>
              <span className="text-right font-medium" style={{ color: '#085041' }}>{fmtFull(src.projection)}</span>
              <button onClick={() => removeSource(i)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* Note */}
            {editingNote === i ? (
              <div className="mt-2">
                <textarea
                  value={editNoteValue}
                  onChange={(e) => setEditNoteValue(e.target.value)}
                  placeholder="Why is this projection realistic?"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#534AB7] resize-none"
                  rows={2}
                  autoFocus
                />
                <button
                  onClick={() => saveNote(i)}
                  className="mt-1 text-xs px-2 py-0.5 rounded border border-[#534AB7] hover:bg-[#EEEDFE]"
                  style={{ color: '#534AB7' }}
                >
                  Save
                </button>
              </div>
            ) : (
              <div
                onClick={() => startEditNote(i)}
                className="mt-1 text-xs text-gray-600 leading-relaxed cursor-pointer group"
              >
                {src.note || <span className="text-gray-600 italic">Add reasoning...</span>}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline ml-1 text-gray-300 group-hover:text-gray-500 align-middle"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
            )}
          </div>
        ))}

        {/* Add source form */}
        {addingSource ? (
          <div className="py-2.5 border-t border-gray-100 space-y-2">
            <div className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
              <input
                type="text"
                placeholder="Source name"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#534AB7]"
                autoFocus
              />
              <input
                type="text"
                placeholder="$0"
                value={newProjection}
                onChange={(e) => setNewProjection(e.target.value)}
                className="text-sm border border-gray-200 rounded px-2 py-1.5 text-right focus:outline-none focus:border-[#534AB7]"
              />
              <button onClick={addSource} className="text-green-600 hover:text-green-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>
            <textarea
              placeholder="Why is this realistic? (optional)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#534AB7] resize-none"
              rows={2}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addSource() } }}
            />
          </div>
        ) : (
          <div className="py-2.5 border-t border-gray-100">
            <button
              onClick={() => setAddingSource(true)}
              className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: '#534AB7' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add source
            </button>
            {/* Preset pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_SOURCES.filter((p) => !usedLabels.has(p)).map((p) => (
                <button
                  key={p}
                  onClick={() => addPreset(p)}
                  className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Total — always visible */}
        <div className="grid gap-2 pt-3 border-t border-gray-100 items-center" style={{ gridTemplateColumns: '1fr 110px 28px' }}>
          <span className="text-sm font-medium text-gray-900">Total projected revenue</span>
          <span className="text-right text-sm font-medium" style={{ color: '#085041' }}>{fmtFull(total)}</span>
          <span />
        </div>
      </div>

      {saving && <p className="text-xs text-gray-600 mt-2">Saving...</p>}
    </div>
  )
}
