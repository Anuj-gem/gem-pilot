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

// Heat points by stage bonus
const STAGE_HEAT: Record<string, number> = {
  shortlisted: 2,
  partner_match: 3,
}

function calcHeatPreview(currentStage: string, heartedCount: number): number {
  const stageHeat = STAGE_HEAT[currentStage] || 0
  return heartedCount + stageHeat
}

interface ScriptItem {
  script_submission_id: string
  title: string
  hearted: boolean
}

interface TagFeedbackFormProps {
  considerationId: string
  currentFeedbackTags?: string[]
  currentNextStepsTags?: string[]
  currentFeedback?: string
  allUsedFeedbackTags?: string[]
  allUsedNextStepsTags?: string[]
  currentReviewStage?: string
  currentHeatEarned?: number
  scripts?: ScriptItem[]
}

export function TagFeedbackForm({
  considerationId,
  currentFeedbackTags = [],
  currentNextStepsTags = [],
  currentFeedback = '',
  allUsedFeedbackTags = [],
  allUsedNextStepsTags = [],
  currentReviewStage = 'pending',
  currentHeatEarned = 0,
  scripts = [],
}: TagFeedbackFormProps) {
  const [feedbackTags, setFeedbackTags] = useState<string[]>(currentFeedbackTags)
  const [nextStepsTags, setNextStepsTags] = useState<string[]>(currentNextStepsTags)
  const [note, setNote] = useState(currentFeedback)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stage, setStage] = useState(currentReviewStage)
  const [stageSaving, setStageSaving] = useState(false)
  const [heartedScripts, setHeartedScripts] = useState<Record<string, boolean>>(
    Object.fromEntries(scripts.map(s => [s.script_submission_id, s.hearted]))
  )
  const router = useRouter()

  const isAlreadyComplete = currentReviewStage === 'complete'
  const heartedCount = Object.values(heartedScripts).filter(Boolean).length
  const heatPreview = calcHeatPreview(stage, heartedCount)

  async function handleHeartToggle(scriptId: string) {
    const newVal = !heartedScripts[scriptId]
    setHeartedScripts(prev => ({ ...prev, [scriptId]: newVal }))
    setSaved(false)
    await fetch('/api/consideration/heart-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consideration_id: considerationId, script_submission_id: scriptId, hearted: newVal }),
    })
  }

  async function handleStageChange(newStage: string) {
    if (newStage === stage) return
    // Shortlist/partner match requires at least one hearted script
    if ((newStage === 'shortlisted' || newStage === 'partner_match') && heartedCount === 0) {
      return
    }
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

      {/* Note — the primary feedback vehicle */}
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

      {/* Script hearts — inline heart next to each script */}
      {scripts.length > 0 && (
        <div>
          <label className="text-[13px] font-bold text-gray-900 block mb-2">
            Scripts <span className="text-[11px] font-normal text-gray-400">(heart to award heat)</span>
          </label>
          <div className="space-y-1">
            {scripts.map(s => {
              const isHearted = heartedScripts[s.script_submission_id]
              return (
                <div key={s.script_submission_id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !isAlreadyComplete && handleHeartToggle(s.script_submission_id)}
                    disabled={isAlreadyComplete}
                    className="shrink-0 disabled:opacity-60 hover:scale-110 transition-transform"
                    title={isHearted ? 'Remove heart' : 'Heart this script'}
                  >
                    <span className="text-[14px]">{isHearted ? '❤️' : '🩶'}</span>
                  </button>
                  <span className="text-[12px] font-medium text-gray-700 truncate">{s.title || 'Untitled'}</span>
                </div>
              )
            })}
          </div>
          {heartedCount > 0 && (
            <p className="text-[11px] text-gray-400 mt-1.5 m-0">
              🔥 {heatPreview} heat
              ({heartedCount} script{heartedCount > 1 ? 's' : ''}
              {STAGE_HEAT[stage] ? ` + ${STAGE_HEAT[stage]} ${stage === 'shortlisted' ? 'shortlist' : 'partner match'} bonus` : ''})
            </p>
          )}
          {heartedCount === 0 && !isAlreadyComplete && (
            <p className="text-[11px] text-orange-500 mt-1.5 m-0">
              Heart at least one script to shortlist or complete
            </p>
          )}
        </div>
      )}

      {/* Already completed — show heat awarded */}
      {isAlreadyComplete && currentHeatEarned > 0 && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <span className="text-[12px] text-gray-500">
            <span className="font-bold" style={{ color: '#f97316' }}>🔥 {currentHeatEarned} heat awarded</span>
          </span>
        </div>
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
