// AnnotationLayer — client-side annotation management for review mode.
// Wraps around report sections and provides the add/edit/delete UI.
// In reviewer mode: "+" buttons + inline textarea + save/delete.
// In writer mode: read-only annotation cards.

'use client'

import { useState, createContext, useContext, useCallback } from 'react'
import { AnnotationCard, type Annotation } from './annotation-card'

// ─── Context ────────────────────────────────────────────────────────

type AnnotationContextValue = {
  annotations: Annotation[]
  mode: 'reviewer' | 'writer' | 'none'
  opportunityTitle: string | null
  submissionRowId: string | null
  addAnnotation: (anchor: string, comment: string, sentiment: string | null) => Promise<void>
  updateAnnotation: (id: string, comment: string, sentiment: string | null) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>
}

const AnnotationContext = createContext<AnnotationContextValue>({
  annotations: [],
  mode: 'none',
  opportunityTitle: null,
  submissionRowId: null,
  addAnnotation: async () => {},
  updateAnnotation: async () => {},
  deleteAnnotation: async () => {},
})

export function useAnnotations() {
  return useContext(AnnotationContext)
}

// ─── Provider ───────────────────────────────────────────────────────

interface AnnotationProviderProps {
  initialAnnotations: Annotation[]
  mode: 'reviewer' | 'writer' | 'none'
  opportunityTitle: string | null
  submissionRowId: string | null
  children: React.ReactNode
}

export function AnnotationProvider({
  initialAnnotations,
  mode,
  opportunityTitle,
  submissionRowId,
  children,
}: AnnotationProviderProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)

  const addAnnotation = useCallback(async (anchor: string, comment: string, sentiment: string | null) => {
    if (!submissionRowId) return
    const res = await fetch('/api/opportunities/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionRowId, anchor, comment, sentiment }),
    })
    if (res.ok) {
      const ann = await res.json()
      setAnnotations(prev => [...prev, ann])
    }
  }, [submissionRowId])

  const updateAnnotation = useCallback(async (id: string, comment: string, sentiment: string | null) => {
    const res = await fetch('/api/opportunities/annotations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, comment, sentiment }),
    })
    if (res.ok) {
      const updated = await res.json()
      setAnnotations(prev => prev.map(a => a.id === id ? updated : a))
    }
  }, [])

  const deleteAnnotation = useCallback(async (id: string) => {
    const res = await fetch('/api/opportunities/annotations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setAnnotations(prev => prev.filter(a => a.id !== id))
    }
  }, [])

  return (
    <AnnotationContext.Provider value={{
      annotations,
      mode,
      opportunityTitle,
      submissionRowId,
      addAnnotation,
      updateAnnotation,
      deleteAnnotation,
    }}>
      {children}
    </AnnotationContext.Provider>
  )
}

// ─── Section Annotations ────────────────────────────────────────────
// Drop this into any report section to show existing annotations and
// the "+" add button in reviewer mode.

interface SectionAnnotationsProps {
  anchor: string
}

export function SectionAnnotations({ anchor }: SectionAnnotationsProps) {
  const { annotations, mode, opportunityTitle, addAnnotation, updateAnnotation, deleteAnnotation } = useAnnotations()
  const [adding, setAdding] = useState(false)
  const [comment, setComment] = useState('')
  const [sentiment, setSentiment] = useState<string | null>('context')
  const [saving, setSaving] = useState(false)

  const sectionAnnotations = annotations.filter(a => a.anchor === anchor)

  async function handleAdd() {
    if (!comment.trim()) return
    setSaving(true)
    await addAnnotation(anchor, comment.trim(), sentiment)
    setComment('')
    setSentiment('context')
    setAdding(false)
    setSaving(false)
  }

  if (mode === 'none') return null

  return (
    <div className="mt-1">
      {/* Existing annotations */}
      {sectionAnnotations.map(ann => (
        <AnnotationCard
          key={ann.id}
          annotation={ann}
          opportunityTitle={mode === 'writer' ? (opportunityTitle ?? undefined) : undefined}
          editable={mode === 'reviewer'}
          onUpdate={mode === 'reviewer' ? updateAnnotation : undefined}
          onDelete={mode === 'reviewer' ? deleteAnnotation : undefined}
        />
      ))}

      {/* Add button (reviewer only) */}
      {mode === 'reviewer' && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1 text-[12px] text-gray-400 hover:text-purple-600 transition-colors"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 hover:border-purple-400 text-[13px] leading-none">+</span>
          <span>Add annotation</span>
        </button>
      )}

      {/* Add form (reviewer only) */}
      {mode === 'reviewer' && adding && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 mb-2">
            {(['strength', 'concern', 'context'] as const).map(s => {
              const styles: Record<string, { pill: string; text: string; border: string }> = {
                strength: { pill: '#9FE1CB', text: '#04342C', border: '#5DCAA5' },
                concern: { pill: '#FAC775', text: '#412402', border: '#EF9F27' },
                context: { pill: '#CECBF6', text: '#26215C', border: '#AFA9EC' },
              }
              const st = styles[s]
              return (
                <button
                  key={s}
                  onClick={() => setSentiment(s)}
                  className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
                  style={{
                    background: sentiment === s ? st.pill : 'transparent',
                    color: sentiment === s ? st.text : '#888',
                    borderColor: sentiment === s ? st.border : '#ddd',
                  }}
                >
                  {s}
                </button>
              )
            })}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add your annotation for this section..."
            rows={3}
            autoFocus
            className="w-full text-[13px] leading-[1.55] border border-gray-200 rounded-md px-2.5 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-purple-200 placeholder:text-gray-300"
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAdd() }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleAdd}
              disabled={saving || !comment.trim()}
              className="text-[12px] font-semibold text-white px-3 py-1 rounded-md disabled:opacity-50"
              style={{ background: '#534AB7' }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setComment(''); setAdding(false) }}
              className="text-[12px] text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
            <span className="text-[11px] text-gray-300 ml-auto">Cmd+Enter to save</span>
          </div>
        </div>
      )}
    </div>
  )
}
