'use client'

import { useState } from 'react'

interface ReviewerNotesFormProps {
  considerationId: string
  initialStrengths?: string
  initialConcerns?: string
}

export function ReviewerNotesForm({
  considerationId,
  initialStrengths = '',
  initialConcerns = '',
}: ReviewerNotesFormProps) {
  const [strengths, setStrengths] = useState(initialStrengths)
  const [concerns, setConcerns] = useState(initialConcerns)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: considerationId,
        reviewer_strengths: strengths.trim() || null,
        reviewer_concerns: concerns.trim() || null,
      }),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <section>
      <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-3">Reviewer notes</h2>
      <div className="space-y-3">
        <div>
          <label className="text-[13px] font-bold text-gray-900 block mb-1.5">Strengths</label>
          <textarea
            value={strengths}
            onChange={(e) => { setStrengths(e.target.value); setSaved(false) }}
            placeholder="What works about this script..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
            rows={3}
          />
        </div>
        <div>
          <label className="text-[13px] font-bold text-gray-900 block mb-1.5">Concerns</label>
          <textarea
            value={concerns}
            onChange={(e) => { setConcerns(e.target.value); setSaved(false) }}
            placeholder="What gives you pause..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
            rows={3}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center text-[13px] font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save notes'}
          </button>
          {saved && <span className="text-[12px] text-green-600 font-medium">Saved</span>}
        </div>
      </div>
    </section>
  )
}
