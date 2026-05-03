'use client'

// ProducerReviewCard — inline review UI for a single submission.
// Shows script info + status picker + feedback textarea.
// opportunities-v1 (2026-05-02).

import { useState } from 'react'
import Link from 'next/link'

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
  submittedAt: string
  reviewedAt: string | null
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'text-amber-700' },
  { value: 'request', label: 'Request', color: 'text-emerald-700' },
  { value: 'consider', label: 'Consider', color: 'text-blue-700' },
  { value: 'pass', label: 'Pass', color: 'text-gray-500' },
] as const

export function ProducerReviewCard({ item }: { item: ReviewItem }) {
  const [status, setStatus] = useState(item.status)
  const [feedback, setFeedback] = useState(item.feedback ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(item.status === 'pending')

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/opportunities/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: item.submissionRowId,
        status,
        feedback: feedback.trim() || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const statusColor = STATUS_OPTIONS.find(o => o.value === status)?.color ?? 'text-gray-500'
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
          <span className={`text-[12px] font-semibold ${statusColor}`}>
            {STATUS_OPTIONS.find(o => o.value === status)?.label ?? status}
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
              Read full report →
            </Link>
          )}

          {/* Status picker */}
          <div className="flex items-center gap-1.5">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-md border transition-colors ${
                  status === opt.value
                    ? opt.value === 'request' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : opt.value === 'consider' ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : opt.value === 'pass' ? 'bg-gray-100 border-gray-200 text-gray-600'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Feedback textarea */}
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Notes for the writer (optional) — why this works or doesn't for this call..."
            rows={3}
            className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
          />

          {/* Save button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-1.5 rounded-md transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saved && (
              <span className="text-[12px] text-emerald-600 font-medium">Saved ✓</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
