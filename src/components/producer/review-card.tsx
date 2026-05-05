'use client'

// ProducerReviewCard — inline review UI for a single submission.
// Feedback = synthesized comment + structured outcome.
// opportunities-v2 (2026-05-04).

import { useState } from 'react'
import Link from 'next/link'

const OUTCOME_OPTIONS = [
  {
    value: 'pass',
    label: 'Pass',
    hint: 'Not the right fit for this opportunity.',
    color: 'border-gray-300 bg-gray-50 text-gray-600',
    selectedColor: 'border-gray-400 bg-gray-100 text-gray-800',
  },
  {
    value: 'developing',
    label: 'Keep developing',
    hint: 'Promising concept but not ready yet. Grants the writer a bonus submission.',
    color: 'border-gray-200 bg-white text-gray-500',
    selectedColor: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  {
    value: 'advancing',
    label: 'Advancing',
    hint: 'We\'ll be in touch — this writer is moving forward.',
    color: 'border-gray-200 bg-white text-gray-500',
    selectedColor: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  },
] as const

type Outcome = typeof OUTCOME_OPTIONS[number]['value'] | null

export interface ReviewItem {
  submissionRowId: string
  scriptId: string
  evaluationId: string | null
  title: string
  format: string | null
  genre: string | null
  logline: string | null
  score: number | null
  writerName: string | null
  writerHandle: string | null
  status: string
  feedback: string | null
  nextSteps: string | null
  outcome: string | null
  submittedAt: string
  reviewedAt: string | null
  oppTitle?: string
  oppSlug?: string | null
  aiDecision?: string | null
  aiReasoning?: string | null
  aiNextSteps?: string | null
}

export function ProducerReviewCard({ item }: { item: ReviewItem }) {
  // AI prefill: if no human feedback/outcome yet, use AI draft
  const initialFeedback = item.feedback ?? (item.aiReasoning && item.aiNextSteps ? `${item.aiReasoning}\n\n${item.aiNextSteps}` : item.aiReasoning ?? '')
  const initialOutcome = (item.outcome ?? item.aiDecision ?? null) as Outcome
  const hasAiDraft = !item.feedback && !item.outcome && (item.aiDecision || item.aiReasoning)

  const [feedback, setFeedback] = useState(initialFeedback)
  const [outcome, setOutcome] = useState<Outcome>(initialOutcome)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviewed, setReviewed] = useState(item.status === 'reviewed')
  const [expanded, setExpanded] = useState(item.status === 'pending')

  async function handleSend() {
    if (!feedback.trim() || !outcome) return
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/opportunities/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: item.submissionRowId,
        status: 'reviewed',
        feedback: feedback.trim(),
        outcome,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setReviewed(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const daysAgo = Math.floor((Date.now() - new Date(item.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
  const selectedOutcome = OUTCOME_OPTIONS.find(o => o.value === outcome)

  return (
    <div className="px-5 py-4">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14.5px] font-semibold text-gray-900 truncate">{item.title}</span>
            {item.score != null && (
              <span className="flex-shrink-0 text-[12px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                {item.score.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-gray-400">
            {item.writerName && <span>{item.writerName}</span>}
            {item.format && <span>· {item.format}</span>}
            {item.genre && <span>· {item.genre}</span>}
            <span>· {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
          </div>
          {item.oppTitle && (
            <Link
              href={`/opportunities/${item.oppSlug || ''}`}
              className="text-[11px] text-purple-500 hover:text-purple-700 mt-0.5 inline-block"
              onClick={e => e.stopPropagation()}
            >
              {item.oppTitle}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[12px] font-semibold ${reviewed ? 'text-emerald-600' : 'text-amber-600'}`}>
            {reviewed ? 'Reviewed' : 'In consideration'}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Expanded review panel */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* Logline */}
          {item.logline && (
            <p className="text-[13px] text-gray-600 leading-[1.55] m-0 italic">
              &ldquo;{item.logline}&rdquo;
            </p>
          )}

          {/* Read report link */}
          {item.evaluationId && (
            <Link
              href={`/report/${item.evaluationId}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-purple-600 hover:text-purple-800"
            >
              View report →
            </Link>
          )}

          {/* Outcome picker */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1.5">
              Outcome <span className="text-red-400">*</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {OUTCOME_OPTIONS.map(opt => {
                const isSelected = outcome === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(outcome === opt.value ? null : opt.value)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      isSelected ? opt.selectedColor : opt.color
                    } hover:border-gray-300`}
                  >
                    <span className="text-[12px] font-bold block">{opt.label}</span>
                    <span className="text-[10.5px] opacity-70 block mt-0.5 leading-snug">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* AI draft indicator */}
          {hasAiDraft && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-purple-50 border border-purple-100">
              <span className="text-[11px] font-semibold text-purple-600">AI draft</span>
              <span className="text-[11px] text-purple-400">— edit before sending</span>
            </div>
          )}

          {/* Feedback textarea */}
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder={
              outcome === 'pass' ? "Brief note on why this isn't the right fit..."
              : outcome === 'developing' ? "What's working, what needs more work, and what would make this ready..."
              : outcome === 'advancing' ? "What excited you about this and next steps..."
              : "Write your feedback — what works, what doesn't, and why..."
            }
            rows={4}
            className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
          />

          {/* Send button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={saving || !feedback.trim() || !outcome}
              className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-md transition-colors"
            >
              {saving ? 'Sending…' : reviewed ? 'Update feedback' : 'Send feedback'}
            </button>
            {!outcome && feedback.trim() && (
              <span className="text-[11px] text-amber-600">Pick an outcome</span>
            )}
            {saved && (
              <span className="text-[12px] text-emerald-600 font-medium">Sent</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
