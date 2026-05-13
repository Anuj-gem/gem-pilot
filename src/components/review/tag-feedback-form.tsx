'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Presets — shown as quick-fill suggestions
const FEEDBACK_PRESETS = [
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

const NEXT_STEPS_PRESETS = [
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

// Combo tag input — type to add custom, presets as suggestions, search previously used
function TagComboInput({
  tags,
  setTags,
  presets,
  allUsed,
  placeholder,
  accentColor,
}: {
  tags: string[]
  setTags: (t: string[]) => void
  presets: string[]
  allUsed: string[]
  placeholder: string
  accentColor: 'purple' | 'green'
}) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Merge presets + previously used, deduplicate, exclude already-selected
  const allSuggestions = [...new Set([...presets, ...allUsed])]
  const filtered = input.trim()
    ? allSuggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s))
    : allSuggestions.filter(s => !tags.includes(s))

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  const colors = accentColor === 'purple'
    ? { pill: 'border-purple-300 bg-purple-50 text-purple-700', suggestion: 'hover:bg-purple-50', ring: 'focus-within:border-purple-300' }
    : { pill: 'border-green-300 bg-green-50 text-green-700', suggestion: 'hover:bg-green-50', ring: 'focus-within:border-green-300' }

  return (
    <div>
      {/* Selected tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map(tag => (
            <span key={tag} className={`inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full border font-semibold ${colors.pill}`}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="opacity-60 hover:opacity-100 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault()
              addTag(input)
            }
            if (e.key === 'Backspace' && !input && tags.length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          placeholder={tags.length === 0 ? placeholder : 'Add another...'}
          className={`w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none ${colors.ring}`}
        />

        {/* Suggestions dropdown */}
        {focused && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full border border-gray-200 rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
            {filtered.slice(0, 12).map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(s); inputRef.current?.focus() }}
                className={`w-full text-left px-3 py-2 text-[12px] text-gray-700 ${colors.suggestion} border-b border-gray-50 last:border-b-0`}
              >
                {s}
              </button>
            ))}
            {input.trim() && !allSuggestions.some(s => s.toLowerCase() === input.trim().toLowerCase()) && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(input); inputRef.current?.focus() }}
                className={`w-full text-left px-3 py-2 text-[12px] font-medium text-gray-500 ${colors.suggestion} border-t border-gray-100`}
              >
                Add &ldquo;{input.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const REVIEW_STAGES = [
  { value: 'pending', label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  { value: 'in_consideration', label: 'In consideration', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'shortlisted', label: 'Shortlisted', color: '#2563eb', bg: '#dbeafe' },
  { value: 'partner_match', label: 'Partner match', color: '#059669', bg: '#d1fae5' },
] as const

// Heat points by stage: shortlisted earns +2 automatically
const STAGE_HEAT: Record<string, number> = {
  shortlisted: 2,
  partner_match: 3,
}

function calcHeatPreview(currentStage: string, sentiment: 'positive' | 'negative' | null): number {
  const stageHeat = STAGE_HEAT[currentStage] || 0
  const sentimentHeat = sentiment === 'positive' ? 1 : 0
  return stageHeat + sentimentHeat
}

interface TagFeedbackFormProps {
  considerationId: string
  currentFeedbackTags?: string[]
  currentNextStepsTags?: string[]
  currentFeedback?: string
  allUsedFeedbackTags?: string[]
  allUsedNextStepsTags?: string[]
  currentReviewStage?: string
  currentSentiment?: string | null
  currentHeatEarned?: number
}

export function TagFeedbackForm({
  considerationId,
  currentFeedbackTags = [],
  currentNextStepsTags = [],
  currentFeedback = '',
  allUsedFeedbackTags = [],
  allUsedNextStepsTags = [],
  currentReviewStage = 'pending',
  currentSentiment = null,
  currentHeatEarned = 0,
}: TagFeedbackFormProps) {
  const [feedbackTags, setFeedbackTags] = useState<string[]>(currentFeedbackTags)
  const [nextStepsTags, setNextStepsTags] = useState<string[]>(currentNextStepsTags)
  const [note, setNote] = useState(currentFeedback)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stage, setStage] = useState(currentReviewStage)
  const [stageSaving, setStageSaving] = useState(false)
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(
    (currentSentiment as 'positive' | 'negative' | null) || null
  )
  const router = useRouter()

  const isAlreadyComplete = currentReviewStage === 'complete'
  const heatPreview = calcHeatPreview(stage, sentiment)

  async function handleStageChange(newStage: string) {
    if (newStage === stage) return
    setStageSaving(true)
    const res = await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consideration_id: considerationId, review_stage: newStage }),
    })
    setStageSaving(false)
    if (res.ok) {
      setStage(newStage)
      router.refresh()
    }
  }

  function updateFeedbackTags(tags: string[]) { setFeedbackTags(tags); setSaved(false) }
  function updateNextStepsTags(tags: string[]) { setNextStepsTags(tags); setSaved(false) }

  async function handlePass() {
    if (!sentiment) return
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
        sentiment,
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
      {/* Stage picker */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-2">Status</label>
        <div className="flex flex-wrap gap-1.5">
          {REVIEW_STAGES.map(s => {
            const isActive = stage === s.value
            return (
              <button
                key={s.value}
                onClick={() => handleStageChange(s.value)}
                disabled={stageSaving || isAlreadyComplete}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50"
                style={{
                  background: isActive ? s.bg : 'transparent',
                  borderColor: isActive ? s.color : '#e5e7eb',
                  color: isActive ? s.color : '#9ca3af',
                }}
              >
                {s.label}
              </button>
            )
          })}
          {stageSaving && <span className="text-[11px] text-gray-400 self-center ml-1">Saving...</span>}
        </div>
      </div>

      {/* Feedback tags */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-2">Reason tags</label>
        <TagComboInput
          tags={feedbackTags}
          setTags={updateFeedbackTags}
          presets={FEEDBACK_PRESETS}
          allUsed={allUsedFeedbackTags}
          placeholder="Type to add or pick a suggestion..."
          accentColor="purple"
        />
      </div>

      {/* Next steps tags */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-2">Next steps</label>
        <TagComboInput
          tags={nextStepsTags}
          setTags={updateNextStepsTags}
          presets={NEXT_STEPS_PRESETS}
          allUsed={allUsedNextStepsTags}
          placeholder="Type to add or pick a suggestion..."
          accentColor="green"
        />
      </div>

      {/* Optional note */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-1.5">
          Note <span className="text-[11px] font-normal text-gray-400">(visible to writer)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setSaved(false) }}
          placeholder="Any additional context or encouragement..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
          rows={3}
        />
      </div>

      {/* Sentiment toggle — required to pass */}
      {!isAlreadyComplete && (
        <div>
          <label className="text-[13px] font-bold text-gray-900 block mb-2">
            Sentiment <span className="text-[11px] font-normal text-gray-400">(internal — determines heat)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSentiment('negative'); setSaved(false) }}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
              style={{
                background: sentiment === 'negative' ? '#fef2f2' : 'transparent',
                borderColor: sentiment === 'negative' ? '#ef4444' : '#e5e7eb',
                color: sentiment === 'negative' ? '#dc2626' : '#9ca3af',
              }}
            >
              Negative
            </button>
            <button
              type="button"
              onClick={() => { setSentiment('positive'); setSaved(false) }}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
              style={{
                background: sentiment === 'positive' ? '#f0fdf4' : 'transparent',
                borderColor: sentiment === 'positive' ? '#22c55e' : '#e5e7eb',
                color: sentiment === 'positive' ? '#16a34a' : '#9ca3af',
              }}
            >
              Positive
            </button>
            {sentiment && (
              <span className="text-[12px] font-bold ml-2" style={{ color: heatPreview > 0 ? '#f97316' : '#9ca3af' }}>
                🔥 {heatPreview} heat
              </span>
            )}
          </div>
          {sentiment && heatPreview > 0 && (
            <p className="text-[11px] text-gray-400 mt-1 m-0">
              {STAGE_HEAT[stage] ? `+${STAGE_HEAT[stage]} from ${stage === 'shortlisted' ? 'shortlist' : stage === 'partner_match' ? 'partner match' : stage}` : ''}
              {STAGE_HEAT[stage] && sentiment === 'positive' ? ' + ' : ''}
              {sentiment === 'positive' ? '+1 positive sentiment' : ''}
            </p>
          )}
        </div>
      )}

      {/* Already completed — show what was recorded */}
      {isAlreadyComplete && currentSentiment && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <span className="text-[12px] text-gray-500">
            Sentiment: <span className="font-semibold" style={{ color: currentSentiment === 'positive' ? '#16a34a' : '#dc2626' }}>
              {currentSentiment}
            </span>
            {currentHeatEarned > 0 && (
              <span className="ml-2 font-bold" style={{ color: '#f97316' }}>🔥 {currentHeatEarned} heat awarded</span>
            )}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!isAlreadyComplete ? (
          <>
            <button
              onClick={handlePass}
              disabled={saving || !sentiment}
              className="inline-flex items-center text-[13px] font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Pass'}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Save draft
            </button>
          </>
        ) : (
          <span className="text-[12px] text-gray-400 font-medium">Review complete</span>
        )}
        {saved && <span className="text-[12px] text-green-600 font-medium">Saved</span>}
      </div>
    </div>
  )
}
