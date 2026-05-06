'use client'

// ConsiderationReviewCard — producer review UI for a writer's consideration.
// Per-writer review: see full portfolio, provide feedback + next steps.

import { useState } from 'react'
import Link from 'next/link'

export function ConsiderationReviewCard({
  considerationId,
  writerName,
  writerHandle,
  submittedAt,
  scripts,
  status,
  feedback: initialFeedback,
  nextSteps: initialNextSteps,
}: {
  considerationId: string
  writerName: string
  writerHandle: string | null
  submittedAt: string
  scripts: { title: string; score: number | null; evaluationId: string | null; format: string | null }[]
  status: string
  feedback: string | null
  nextSteps: string | null
}) {
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [nextSteps, setNextSteps] = useState(initialNextSteps ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviewed, setReviewed] = useState(status === 'reviewed')
  const [expanded, setExpanded] = useState(status === 'pending')

  const daysAgo = Math.floor((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24))
  const avgScore = scripts.length > 0
    ? scripts.reduce((sum, s) => sum + (s.score ?? 0), 0) / scripts.filter(s => s.score != null).length
    : null

  async function handleSend() {
    if (!feedback.trim()) return
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: considerationId,
        feedback: feedback.trim(),
        next_steps: nextSteps.trim() || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setReviewed(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14.5px] font-semibold text-gray-900">{writerName}</span>
            {writerHandle && (
              <span className="text-[12px] text-gray-400">@{writerHandle}</span>
            )}
            {avgScore != null && (
              <span className="text-[12px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                avg {avgScore.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-gray-400">
            <span>{scripts.length} {scripts.length === 1 ? 'script' : 'scripts'}</span>
            <span>· {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[12px] font-semibold ${reviewed ? 'text-emerald-600' : 'text-amber-600'}`}>
            {reviewed ? 'Reviewed' : 'Pending'}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* Portfolio */}
          <div>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-2">Portfolio</p>
            <div className="space-y-1.5">
              {scripts.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.score != null && (
                      <span className="text-[13px] font-bold shrink-0" style={{
                        color: s.score >= 75 ? '#7c3aed' : '#6b7280',
                      }}>
                        {Math.round(s.score)}
                      </span>
                    )}
                    <span className="text-[13px] text-gray-700 truncate">{s.title}</span>
                    {s.format && <span className="text-[12px] text-gray-400 shrink-0">{s.format}</span>}
                  </div>
                  {s.evaluationId && (
                    <Link
                      href={`/report/${s.evaluationId}`}
                      target="_blank"
                      className="text-[12px] font-bold text-purple-600 hover:text-purple-800 shrink-0"
                    >
                      Report →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feedback textarea */}
          <div>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1.5">
              Overall assessment
            </p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Strengths across their portfolio, positioning, where they're placeable..."
              rows={4}
              className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
            />
          </div>

          {/* Next steps */}
          <div>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1.5">
              Next steps for writer
            </p>
            <textarea
              value={nextSteps}
              onChange={e => setNextSteps(e.target.value)}
              placeholder="What to write or submit next, what would strengthen their portfolio..."
              rows={2}
              className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
            />
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
