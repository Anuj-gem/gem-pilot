'use client'

// ConsiderationReviewCard — producer review UI for a writer's consideration.
// Shows: stage dropdown, portfolio, feedback textareas, message input, event timeline.

import { useState } from 'react'
import Link from 'next/link'

// Producers only interact with reviews from pending onward.
// Draft is writer-only (not yet submitted).
const STAGES = [
  { value: 'pending', label: 'Pending', color: '#d97706' },
  { value: 'in_review', label: 'In review', color: '#7c3aed' },
  { value: 'partner_match', label: 'Partner match', color: '#059669' },
  { value: 'complete', label: 'Pass', color: '#16a34a' },
] as const

export function ConsiderationReviewCard({
  considerationId,
  writerName,
  writerHandle,
  isPro = false,
  submittedAt,
  scripts,
  status,
  reviewStage: initialStage,
  feedback: initialFeedback,
  nextSteps: initialNextSteps,
  aiFeedback,
  aiNextSteps,
  events: initialEvents,
  reviewNumber = 1,
  pastReviews = [],
}: {
  considerationId: string
  writerName: string
  writerHandle: string | null
  isPro?: boolean
  submittedAt: string
  scripts: { title: string; score: number | null; evaluationId: string | null; format: string | null }[]
  status: string
  reviewStage: string
  feedback: string | null
  nextSteps: string | null
  aiFeedback?: string | null
  aiNextSteps?: string | null
  events: { id: string; event_type: string; message: string | null; new_stage: string | null; created_at: string }[]
  reviewNumber?: number
  pastReviews?: { id: string; submittedAt: string; feedback: string | null; nextSteps: string | null }[]
}) {
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [nextSteps, setNextSteps] = useState(initialNextSteps ?? '')
  const [stage, setStage] = useState(initialStage || 'submitted')
  const [messageText, setMessageText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviewed, setReviewed] = useState(status === 'reviewed')
  const [expanded, setExpanded] = useState(false)
  const [events, setEvents] = useState(initialEvents)
  const [pastOpen, setPastOpen] = useState(false)

  const daysAgo = Math.floor((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24))
  const avgScore = scripts.length > 0
    ? scripts.reduce((sum, s) => sum + (s.score ?? 0), 0) / scripts.filter(s => s.score != null).length
    : null

  const stageInfo = STAGES.find(s => s.value === stage) || STAGES[0]

  async function handleStageChange(newStage: string) {
    setStage(newStage)
    const res = await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consideration_id: considerationId, review_stage: newStage }),
    })
    if (res.ok) {
      const stageLabel = STAGES.find(s => s.value === newStage)?.label || newStage
      setEvents(prev => [{
        id: `temp-${Date.now()}`,
        event_type: 'status_change',
        message: `Status changed to ${stageLabel}`,
        new_stage: newStage,
        created_at: new Date().toISOString(),
      }, ...prev])
      if (newStage === 'complete') setReviewed(true)
    }
  }

  async function handleSendFeedback() {
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
      setEvents(prev => [{
        id: `temp-${Date.now()}`,
        event_type: 'feedback',
        message: feedback.trim(),
        new_stage: null,
        created_at: new Date().toISOString(),
      }, ...prev])
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return
    setSaving(true)
    const res = await fetch('/api/consideration/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: considerationId,
        message: messageText.trim(),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setEvents(prev => [{
        id: `temp-${Date.now()}`,
        event_type: 'message',
        message: messageText.trim(),
        new_stage: null,
        created_at: new Date().toISOString(),
      }, ...prev])
      setMessageText('')
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
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[14.5px] font-semibold text-gray-900">{writerName}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{
                background: isPro ? '#7c3aed15' : '#f3f4f6',
                color: isPro ? '#7c3aed' : '#9ca3af',
              }}
            >
              {isPro ? 'Pro' : 'Free'}
            </span>
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              Review #{reviewNumber}
            </span>
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
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${stageInfo.color}15`, color: stageInfo.color }}
          >
            {stageInfo.label}
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

          {/* Stage selector */}
          <div>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1.5">Review stage</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STAGES.map(s => (
                <button
                  key={s.value}
                  onClick={(e) => { e.stopPropagation(); handleStageChange(s.value) }}
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-full border transition-colors"
                  style={{
                    background: stage === s.value ? `${s.color}15` : 'transparent',
                    borderColor: stage === s.value ? s.color : '#e5e7eb',
                    color: stage === s.value ? s.color : '#9ca3af',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

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

          {/* Past reviews dropdown */}
          {pastReviews.length > 0 && (
            <div>
              <button
                onClick={() => setPastOpen(!pastOpen)}
                className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] hover:text-gray-600 transition-colors"
              >
                <span>Past reviews ({pastReviews.length})</span>
                <svg
                  width="12" height="12" viewBox="0 0 16 16" fill="none"
                  className={`transition-transform ${pastOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {pastOpen && (
                <div className="mt-2 space-y-2">
                  {pastReviews.map((pr, i) => (
                    <div key={pr.id} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-gray-400 font-medium m-0 mb-1">
                        Review #{i + 1} · {new Date(pr.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {pr.feedback && (
                        <p className="text-[12px] text-gray-600 m-0 leading-relaxed">{pr.feedback}</p>
                      )}
                      {pr.nextSteps && (
                        <p className="text-[12px] text-purple-600 m-0 mt-1 leading-relaxed">Next steps: {pr.nextSteps}</p>
                      )}
                      {!pr.feedback && !pr.nextSteps && (
                        <p className="text-[12px] text-gray-300 italic m-0">No feedback recorded</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI prefill — show if available and feedback is empty */}
          {aiFeedback && !feedback.trim() && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-bold text-purple-500 uppercase tracking-[0.06em] m-0">AI draft</p>
                <button
                  onClick={() => {
                    setFeedback(aiFeedback)
                    if (aiNextSteps) setNextSteps(aiNextSteps)
                  }}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-colors"
                >
                  Use as starting point →
                </button>
              </div>
              <p className="text-[12px] text-purple-700 m-0 leading-relaxed line-clamp-3">{aiFeedback}</p>
            </div>
          )}

          {/* Feedback / message — unified send box */}
          <div>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1.5">
              Send feedback
            </p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Portfolio notes, strengths, questions for the writer..."
              rows={3}
              className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSendFeedback}
                disabled={saving || !feedback.trim()}
                className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-md transition-colors"
              >
                {saving ? 'Sending…' : 'Send'}
              </button>
              {saved && (
                <span className="text-[12px] text-emerald-600 font-medium">Sent</span>
              )}
            </div>
          </div>

          {/* Next steps — only visible when stage is complete */}
          {stage === 'complete' && (
            <div className="pt-2 border-t border-gray-100">
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
              <button
                onClick={async () => {
                  setSaving(true)
                  const res = await fetch('/api/consideration/review', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      consideration_id: considerationId,
                      next_steps: nextSteps.trim() || null,
                    }),
                  })
                  setSaving(false)
                  if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
                }}
                disabled={saving}
                className="text-[12px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 px-3 py-1.5 rounded-md mt-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save next steps'}
              </button>
            </div>
          )}

          {/* Event timeline */}
          {events.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-2">Timeline</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <div className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{
                      background: ev.event_type === 'status_change' ? '#7c3aed'
                        : ev.event_type === 'feedback' ? '#059669'
                        : '#6b7280',
                    }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-gray-600 m-0 leading-snug">
                        {ev.event_type === 'status_change'
                          ? ev.message
                          : ev.event_type === 'feedback'
                          ? 'Feedback sent'
                          : ev.message
                        }
                      </p>
                      <p className="text-[11px] text-gray-300 m-0 mt-0.5">
                        {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
