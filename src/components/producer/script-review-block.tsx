'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/**
 * Per-script review block for producers. Each script in an application gets its
 * own tags + note + "Pass" — the writer sees this on their report and apply hub.
 * If it's not a pass, you reach out directly; there's no other outcome here.
 */
export function ScriptReviewBlock({
  considerationId,
  scriptId,
  title,
  score,
  evalId,
  initialOutcome,
  initialFeedback,
  initialTags,
}: {
  considerationId: string
  scriptId: string
  title: string
  score: number | null
  evalId: string | null
  initialOutcome: string | null
  initialFeedback: string | null
  initialTags: string[]
}) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [tagInput, setTagInput] = useState('')
  const [note, setNote] = useState(initialFeedback || '')
  const [saving, setSaving] = useState(false)
  const reviewed = !!initialOutcome

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const post = async (body: Record<string, unknown>) => {
    setSaving(true)
    const res = await fetch('/api/consideration/review-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consideration_id: considerationId, script_submission_id: scriptId, ...body }),
    })
    setSaving(false)
    if (res.ok) router.refresh()
  }

  const markPass = () => post({ outcome: 'pass', feedback: note, feedback_tags: tags })
  const clear = () => post({ clear: true })

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 mb-2.5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{title}</p>
          {reviewed && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ background: '#F0EDFB', color: '#534AB7' }}>
              Pass
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {score != null && <span className="text-[12px] font-bold text-purple-600">{Math.round(score)}</span>}
          {evalId && (
            <Link href={`/report/${evalId}`} target="_blank" className="text-[12px] text-purple-600 hover:text-purple-700 font-semibold">
              Report →
            </Link>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#F0EDFB', color: '#534AB7' }}>
            {t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))} className="cursor-pointer" style={{ background: 'none', border: 0, color: '#534AB7', lineHeight: 1 }}>
              ×
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTag()
            }
          }}
          onBlur={addTag}
          placeholder="Add tag…"
          className="text-[12px] text-gray-700 border border-gray-200 rounded-full px-2.5 py-0.5 focus:outline-none focus:border-purple-300"
          style={{ width: 90 }}
        />
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Feedback for this script…"
        rows={2}
        className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
      />

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={markPass}
          disabled={saving}
          className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-1.5 rounded-md transition-colors"
        >
          {saving ? 'Saving…' : reviewed ? 'Update feedback' : 'Mark as Pass'}
        </button>
        {reviewed && (
          <button onClick={clear} disabled={saving} className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-50">
            Remove review
          </button>
        )}
      </div>
    </div>
  )
}
