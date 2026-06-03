'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// All tag presets — single merged list
const TAG_PRESETS = [
  'Interesting idea',
  'Strong voice',
  'Producible',
  'Unoriginal idea',
  'Hard to produce',
  'Hard to develop',
  'Budget concerns',
  'Hard to market',
  'Bad story',
  'Needs director attached',
  'Needs talent attached',
  'Needs production plan',
  'Needs budget breakdown',
  'Needs showrunner',
  'Needs network/platform interest',
  'Needs revised pilot',
  'Needs series bible',
  'Needs proof of concept',
  'Want to see more work from this writer',
]

// Combo tag input — type to add custom, presets as suggestions
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
  accentColor: 'purple' | 'gray' | 'amber'
}) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const colorMap = {
    purple: { pill: 'border-purple-300 bg-purple-50 text-purple-700', suggestion: 'hover:bg-purple-50', ring: 'focus-within:border-purple-300' },
    gray: { pill: 'border-gray-300 bg-gray-100 text-gray-600', suggestion: 'hover:bg-gray-50', ring: 'focus-within:border-gray-300' },
    amber: { pill: 'border-amber-300 bg-amber-50 text-amber-700', suggestion: 'hover:bg-amber-50', ring: 'focus-within:border-amber-300' },
  }
  const colors = colorMap[accentColor]

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map(tag => (
            <span key={tag} className={`inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full border font-semibold ${colors.pill}`}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addTag(input) }
            if (e.key === 'Backspace' && !input && tags.length > 0) { removeTag(tags[tags.length - 1]) }
          }}
          placeholder={tags.length === 0 ? placeholder : 'Add another...'}
          className={`w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none ${colors.ring}`}
        />
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

type BackingStatus = 'pass' | 'following' | 'attached'

interface TagFeedbackFormProps {
  considerationId: string
  currentFeedbackTags?: string[]
  currentNextStepsTags?: string[]
  currentFeedback?: string
  allUsedFeedbackTags?: string[]
  allUsedNextStepsTags?: string[]
  currentReviewStage?: string
  currentBackingStatus?: BackingStatus | null
  currentBackingAmount?: number
  currentBackingConditions?: string[]
  currentBackingNote?: string
}

export function TagFeedbackForm({
  considerationId,
  currentFeedbackTags = [],
  currentNextStepsTags = [],
  currentFeedback = '',
  allUsedFeedbackTags = [],
  allUsedNextStepsTags = [],
  currentReviewStage = 'pending',
  currentBackingStatus = null,
  currentBackingAmount = 0,
  currentBackingConditions = [],
  currentBackingNote = '',
}: TagFeedbackFormProps) {
  const [outcome, setOutcome] = useState<BackingStatus | null>(currentBackingStatus)
  // Merge all existing tags into a single flat list
  const [tags, setTags] = useState<string[]>([...new Set([...currentFeedbackTags, ...currentNextStepsTags, ...currentBackingConditions])])
  const [amount, setAmount] = useState(currentBackingAmount > 0 ? String(currentBackingAmount) : '')
  const [note, setNote] = useState(currentFeedback || currentBackingNote || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const router = useRouter()
  const allUsedTags = [...new Set([...allUsedFeedbackTags, ...allUsedNextStepsTags])]

  const isAlreadyComplete = currentReviewStage === 'complete'
  const showAmountAndConditions = outcome === 'following' || outcome === 'attached'

  async function handleComplete() {
    if (!outcome) {
      setValidationError('Select an outcome: Pass, Follow, or Back.')
      return
    }
    // Pass requires some form of feedback
    if (outcome === 'pass' && tags.length === 0 && !note.trim()) {
      setValidationError('Add at least one tag or a note before passing.')
      return
    }
    setValidationError(null)
    setSaving(true)

    const res = await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: considerationId,
        backing_status: outcome,
        backing_amount: showAmountAndConditions ? (parseFloat(amount) || 0) : 0,
        backing_conditions: showAmountAndConditions ? tags : [],
        backing_note: note.trim() || undefined,
        feedback_tags: tags,
        next_steps_tags: [],
        feedback: note.trim() || undefined,
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
        feedback_tags: tags,
        next_steps_tags: [],
        backing_conditions: tags,
        backing_amount: parseFloat(amount) || 0,
        backing_note: note.trim() || undefined,
        feedback: note.trim() || undefined,
      }),
    })
    setSaving(false)
    setSaved(true)
  }

  // Completed state
  if (isAlreadyComplete) {
    const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
      pass: { label: 'Passed', color: '#6b7280', bg: '#f3f4f6' },
      following: { label: 'Following', color: '#d97706', bg: '#fffbeb' },
      attached: { label: 'Attached as backer', color: '#059669', bg: '#ecfdf5' },
    }
    const display = currentBackingStatus ? statusLabel[currentBackingStatus] : { label: 'Reviewed', color: '#6b7280', bg: '#f3f4f6' }
    const fmtAmount = currentBackingAmount > 0
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(currentBackingAmount)
      : null

    return (
      <div className="space-y-3">
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: display.color + '40', background: display.bg }}>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: display.color }}>{display.label}</span>
            {fmtAmount && (
              <span className="text-[13px] font-bold" style={{ color: display.color }}>&middot; {fmtAmount}</span>
            )}
          </div>
          {currentBackingConditions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {currentBackingConditions.map(c => (
                <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{c}</span>
              ))}
            </div>
          )}
        </div>
        {(currentFeedback || currentBackingNote) && (
          <p className="text-[13px] text-gray-600 m-0">{currentFeedback || currentBackingNote}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Outcome selector — three big buttons */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-2">Decision</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'pass' as const, label: 'Pass', icon: '✕', color: '#6b7280', bg: '#f9fafb', activeBg: '#f3f4f6', border: '#d1d5db' },
            { value: 'following' as const, label: 'Follow', icon: '👁', color: '#d97706', bg: '#fffbeb', activeBg: '#fef3c7', border: '#fbbf24' },
            { value: 'attached' as const, label: 'Back', icon: '✓', color: '#059669', bg: '#ecfdf5', activeBg: '#d1fae5', border: '#34d399' },
          ]).map(opt => {
            const isActive = outcome === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => { setOutcome(opt.value); setValidationError(null); setSaved(false) }}
                className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-center"
                style={{
                  borderColor: isActive ? opt.border : '#e5e7eb',
                  background: isActive ? opt.activeBg : 'white',
                }}
              >
                <span className="text-[18px]">{opt.icon}</span>
                <span className="text-[13px] font-bold" style={{ color: isActive ? opt.color : '#9ca3af' }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount — only for Follow / Back */}
      {showAmountAndConditions && (
        <div>
          <label className="text-[13px] font-bold text-gray-900 block mb-1.5">
            {outcome === 'attached' ? 'Committed amount' : 'Potential amount'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-400 font-medium">$</span>
            <input
              type="text"
              value={amount}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                setAmount(v)
                setSaved(false)
              }}
              placeholder="0"
              className="w-full text-[14px] pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200 font-medium"
            />
          </div>
          {amount && (
            <p className="text-[11px] text-gray-500 mt-1 m-0">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(amount) || 0)}
            </p>
          )}
        </div>
      )}

      {/* Tags — single merged group */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-1.5">Tags</label>
        <TagComboInput
          tags={tags}
          setTags={(t) => { setTags(t); setSaved(false) }}
          presets={TAG_PRESETS}
          allUsed={allUsedTags}
          placeholder="Select or type tags..."
          accentColor="purple"
        />
      </div>

      {/* Note */}
      <div>
        <label className="text-[13px] font-bold text-gray-900 block mb-1.5">
          Note <span className="text-[11px] font-normal text-gray-500">(visible to writer)</span>
        </label>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); setSaved(false) }}
          placeholder="Add a personal note (optional)"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
          rows={3}
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-[12px] text-red-600 font-medium m-0">{validationError}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleComplete}
          disabled={saving || !outcome}
          className="inline-flex items-center text-[13px] font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Complete review'}
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="inline-flex items-center text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg transition-colors"
        >
          Save draft
        </button>
        {saved && <span className="text-[12px] text-green-600 font-medium">Saved</span>}
      </div>
    </div>
  )
}
