// AnnotationCard — displays a single annotation inline on a report section.
// Used in both reviewer mode (with edit/delete) and writer mode (read-only).

'use client'

import { useState } from 'react'

export type Annotation = {
  id: string
  anchor: string
  comment: string
  sentiment: 'strength' | 'concern' | 'context' | null
  created_at: string
}

const SENTIMENT_STYLES: Record<string, { bg: string; pill: string; text: string; border: string }> = {
  strength: { bg: '#E1F5EE', pill: '#9FE1CB', text: '#04342C', border: '#5DCAA5' },
  concern: { bg: '#FAEEDA', pill: '#FAC775', text: '#412402', border: '#EF9F27' },
  context: { bg: '#EEEDFE', pill: '#CECBF6', text: '#26215C', border: '#AFA9EC' },
}
const DEFAULT_STYLE = SENTIMENT_STYLES.context

interface AnnotationCardProps {
  annotation: Annotation
  opportunityTitle?: string
  editable?: boolean
  onUpdate?: (id: string, comment: string, sentiment: string | null) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function AnnotationCard({ annotation, opportunityTitle, editable, onUpdate, onDelete }: AnnotationCardProps) {
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState(annotation.comment)
  const [sentiment, setSentiment] = useState(annotation.sentiment)
  const [saving, setSaving] = useState(false)

  const style = SENTIMENT_STYLES[annotation.sentiment ?? ''] ?? DEFAULT_STYLE
  const editStyle = SENTIMENT_STYLES[sentiment ?? ''] ?? DEFAULT_STYLE

  async function handleSave() {
    if (!comment.trim() || !onUpdate) return
    setSaving(true)
    await onUpdate(annotation.id, comment.trim(), sentiment)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!onDelete) return
    setSaving(true)
    await onDelete(annotation.id)
    setSaving(false)
  }

  if (editing && editable) {
    return (
      <div
        className="rounded-lg p-3 mt-2"
        style={{ background: editStyle.bg, borderLeft: `2.5px solid ${editStyle.border}` }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          {(['strength', 'concern', 'context'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSentiment(s)}
              className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
              style={{
                background: sentiment === s ? SENTIMENT_STYLES[s].pill : 'transparent',
                color: sentiment === s ? SENTIMENT_STYLES[s].text : '#888',
                borderColor: sentiment === s ? SENTIMENT_STYLES[s].border : '#ddd',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="w-full text-[13px] leading-[1.55] border border-gray-200 rounded-md px-2.5 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-purple-200"
          style={{ background: 'white' }}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSave() }}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSave}
            disabled={saving || !comment.trim()}
            className="text-[12px] font-semibold text-white px-3 py-1 rounded-md disabled:opacity-50"
            style={{ background: '#534AB7' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setComment(annotation.comment); setSentiment(annotation.sentiment); setEditing(false) }}
            className="text-[12px] text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-none p-3 mt-2"
      style={{ background: style.bg, borderLeft: `2.5px solid ${style.border}` }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {annotation.sentiment && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: style.pill, color: style.text }}
          >
            {annotation.sentiment}
          </span>
        )}
        {opportunityTitle && (
          <span className="text-[11px] text-gray-400">{opportunityTitle}</span>
        )}
      </div>
      <p className="text-[13px] leading-[1.55] m-0" style={{ color: style.text }}>
        {annotation.comment}
      </p>
      {editable && (
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] text-gray-400 hover:text-gray-600"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-[11px] text-gray-400 hover:text-red-500"
          >
            {saving ? '...' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  )
}
