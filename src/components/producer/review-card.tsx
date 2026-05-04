'use client'

// ProducerReviewCard — inline review UI for a single submission.
// Feedback = synthesized comment + next-steps tag.
// opportunities-v1 (2026-05-03).

import { useState } from 'react'
import Link from 'next/link'

const NEXT_STEPS_OPTIONS = [
  { value: 'revise_resubmit', label: 'Revise & resubmit' },
  { value: 'new_concept', label: 'Send a different concept' },
  { value: 'in_touch', label: "We'll be in touch" },
] as const

type NextSteps = typeof NEXT_STEPS_OPTIONS[number]['value'] | null

interface ReviewItem {
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
  submittedAt: string
  reviewedAt: string | null
}

export function ProducerReviewCard({ item }: { item: ReviewItem }) {
  const [feedback, setFeedback] = useState(item.feedback ?? '')
  const [nextSteps, setNextSteps] = useState<NextSteps>((item.nextSteps as NextSteps) ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviewed, setReviewed] = useState(item.status === 'reviewed')
  const [expanded, setExpanded] = useState(item.status === 'pending')

  async function handleSend() {
    if (!feedback.trim()) return
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/opportunities/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: item.submissionRowId,
        status: 'reviewed',
        feedback: feedback.trim(),
        next_steps: nextSteps,
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

          {/* Feedback textarea */}
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Write your feedback — what works, what doesn't, and why this may or may not fit this call..."
            rows={4}
            className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
          />

          {/* Next steps tag */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1.5">
              Suggested next steps
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NEXT_STEPS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNextSteps(nextSteps === opt.value ? null : opt.value)}
                  className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    nextSteps === opt.value
                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Send button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={saving || !feedback.trim()}
              className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-md transition-colors"
            >
              {saving ? 'Sending…' : reviewed ? 'Update feedback' : 'Send feedback'}
            </button>
            {saved && (
              <span className="text-[12px] text-emerald-600 font-medium">Sent</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
