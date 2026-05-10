'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FEEDBACK_TAGS = [
  'Strong writing voice',
  'Compelling characters',
  'Marketable concept',
  'Needs tighter structure',
  'Dialogue needs work',
  'Concept not differentiated',
  'Tone inconsistent',
  'Too similar to existing IP',
  'Budget concerns',
  'Great pilot potential',
  'Pacing issues',
  'Underdeveloped world',
]

const NEXT_STEPS_TAGS = [
  'Rewrite and resubmit',
  'Submit to another opportunity',
  'Consider a writing partner',
  'Develop a series bible',
  'Tighten the first 10 pages',
  'Clarify the hook',
  'Explore different format',
  'Ready for meetings',
  'Attach to producer',
  'Keep writing — almost there',
]

interface TagFeedbackFormProps {
  considerationId: string
  currentFeedbackTags?: string[]
  currentNextStepsTags?: string[]
  currentFeedback?: string
}

export function TagFeedbackForm({
  considerationId,
  currentFeedbackTags = [],
  currentNextStepsTags = [],
  currentFeedback = '',
}: TagFeedbackFormProps) {
  const [feedbackTags, setFeedbackTags] = useState<string[]>(currentFeedbackTags)
  const [nextStepsTags, setNextStepsTags] = useState<string[]>(currentNextStepsTags)
  const [note, setNote] = useState(currentFeedback)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  function toggleTag(tag: string, list: string[], setter: (v: string[]) => void) {
    if (list.includes(tag)) {
      setter(list.filter(t => t !== tag))
    } else {
      setter([...list, tag])
    }
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: considerationId,
        feedback_tags: feedbackTags,
        next_steps_tags: nextStepsTags,
        feedback: note.trim() || undefined,
        review_stage: 'complete',
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: considerationId,
        feedback_tags: feedbackTags,
        next_steps_tags: nextStepsTags,
        feedback: note.trim() || undefined,
      }),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="space-y-5">
      {/* Feedback tags */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-2">Reason tags</label>
        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag, feedbackTags, setFeedbackTags)}
              className={`text-[12px] px-2.5 py-1 rounded-full border transition-colors ${
                feedbackTags.includes(tag)
                  ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Next steps tags */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-2">Next steps</label>
        <div className="flex flex-wrap gap-1.5">
          {NEXT_STEPS_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag, nextStepsTags, setNextStepsTags)}
              className={`text-[12px] px-2.5 py-1 rounded-full border transition-colors ${
                nextStepsTags.includes(tag)
                  ? 'border-green-400 bg-green-50 text-green-700 font-semibold'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Optional note */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-1.5">
          Note <span className="text-[11px] font-normal text-gray-400">(optional, visible to writer)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setSaved(false) }}
          placeholder="Any additional context or encouragement..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || (feedbackTags.length === 0 && nextStepsTags.length === 0)}
          className="inline-flex items-center text-[13px] font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Complete review'}
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="inline-flex items-center text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
        >
          Save draft
        </button>
        {saved && <span className="text-[12px] text-green-600 font-medium">Saved</span>}
      </div>
    </div>
  )
}
