'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Presets — "What stood out" (positive signals, each = heat)
const POSITIVE_PRESETS = [
  'Strong voice',
  'Compelling lead',
  'Fresh concept',
  'Great dialogue',
  'Clear market',
  'Timely concept',
  'Castable roles',
  'Low budget friendly',
  'Strong ensemble',
  'Visual storytelling',
]

// Presets — "Why passing" (pass reasons)
const PASS_REASON_PRESETS = [
  'Conflicting project',
  'Similar to something in development',
  'Crowded space',
  'Budget concerns',
  'Slate full',
  'Not our genre',
  'Casting difficult',
  'Needs development',
  'Pacing issues',
  'Concept unclear',
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
  accentColor: 'purple' | 'gray'
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
    : { pill: 'border-gray-300 bg-gray-100 text-gray-600', suggestion: 'hover:bg-gray-50', ring: 'focus-within:border-gray-300' }

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

function calcHeatPreview(currentStage: string, hasFeedbackTags: boolean): number {
  const stageHeat = STAGE_HEAT[currentStage] || 0
  const positiveHeat = hasFeedbackTags ? 1 : 0
  return stageHeat + positiveHeat
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
  const [passReasonTags, setPassReasonTags] = useState<string[]>(currentNextStepsTags)
  const [note, setNote] = useState(currentFeedback)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stage, setStage] = useState(currentReviewStage)
  const [stageSaving, setStageSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const router = useRouter()

  const isAlreadyComplete = currentReviewStage === 'complete'
  const heatPreview = calcHeatPreview(stage, feedbackTags.length > 0)

  // Shortlisted or partner_match requires at least one positive tag
  const requiresPositiveTag = stage === 'shortlisted' || stage === 'partner_match'

  async function handleStageChange(newStage: string) {
    if (newStage === stage) return
    // If moving to shortlisted/partner_match, require positive tags
    if ((newStage === 'shortlisted' || newStage === 'partner_match') && feedbackTags.length === 0) {
      setValidationError('Add at least one "What stood out" tag before shortlisting.')
      return
    }
    setValidationError(null)
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

  function updateFeedbackTags(tags: string[]) {
    setFeedbackTags(tags)
    setSaved(false)
    if (tags.length > 0) setValidationError(null)
  }
  function updatePassReasonTags(tags: string[]) { setPassReasonTags(tags); setSaved(false) }

  async function handlePass() {
    // Require some form of feedback
    if (feedbackTags.length === 0 && passReasonTags.length === 0 && !note.trim()) {
      setValidationError('Add at least one tag or a note before completing the review.')
      return
    }
    // If shortlisted/partner_match, require positive tags
    if (requiresPositiveTag && feedbackTags.length === 0) {
      setValidationError('Add at least one "What stood out" tag before shortlisting.')
      return
    }
    setValidationError(null)
    setSaving(true)
    // Derive sentiment from positive tags for backward compat
    const derivedSentiment = feedbackTags.length > 0 ? 'positive' : 'negative'
    const res = await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: considerationId,
        feedback_tags: feedbackTags,
        next_steps_tags: passReasonTags,
        feedback: note.trim() || undefined,
        review_stage: 'complete',
        sentiment: derivedSentiment,
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
        next_steps_tags: passReasonTags,
        feedback: note.trim() || undefined,
      }),
    })
    setSaving(false)
    setSaved(true)
  }

  // Build heat explanation string
  const heatParts: string[] = []
  if (feedbackTags.length > 0) heatParts.push('+1 positive signals')
  if (STAGE_HEAT[stage]) heatParts.push(`+${STAGE_HEAT[stage]} ${stage === 'shortlisted' ? 'shortlisted' : 'partner match'}`)

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

      {/* What stood out — positive tags */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[13px] font-bold text-gray-900">What stood out</label>
          <span className="text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
            Tags = positive signal &middot; Writer earns 🔥 +1
          </span>
        </div>
        <TagComboInput
          tags={feedbackTags}
          setTags={updateFeedbackTags}
          presets={POSITIVE_PRESETS}
          allUsed={allUsedFeedbackTags}
          placeholder="Select or type what stood out..."
          accentColor="purple"
        />
        {feedbackTags.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-1 m-0">{feedbackTags.length} selected</p>
        )}
      </div>

      {/* Why passing — pass reason tags */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-1.5">
          Why passing <span className="text-[11px] font-normal text-gray-400">(if applicable)</span>
        </label>
        <TagComboInput
          tags={passReasonTags}
          setTags={updatePassReasonTags}
          presets={PASS_REASON_PRESETS}
          allUsed={allUsedNextStepsTags}
          placeholder="Select or type reason..."
          accentColor="gray"
        />
      </div>

      {/* Note */}
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

      {/* Heat preview */}
      {!isAlreadyComplete && (
        <div className="rounded-lg px-3 py-2" style={{ background: heatPreview > 0 ? '#fff7ed' : '#f9fafb' }}>
          <div className="flex items-center gap-2">
            <span className="text-[14px]">🔥</span>
            <span className="text-[14px] font-bold" style={{ color: heatPreview > 0 ? '#ea580c' : '#9ca3af' }}>
              {heatPreview} heat
            </span>
            {heatParts.length > 0 && (
              <span className="text-[11px] text-gray-400 ml-1">
                ({heatParts.join(' + ')})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Already completed — show what was recorded */}
      {isAlreadyComplete && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <span className="text-[12px] text-gray-500">
            Review complete
            {currentHeatEarned > 0 && (
              <span className="ml-2 font-bold" style={{ color: '#f97316' }}>🔥 {currentHeatEarned} heat awarded</span>
            )}
          </span>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <p className="text-[12px] text-red-600 font-medium m-0">{validationError}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!isAlreadyComplete ? (
          <>
            <button
              onClick={handlePass}
              disabled={saving}
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
          </>
        ) : (
          <span className="text-[12px] text-gray-400 font-medium">Review complete</span>
        )}
        {saved && <span className="text-[12px] text-green-600 font-medium">Saved</span>}
      </div>
    </div>
  )
}
