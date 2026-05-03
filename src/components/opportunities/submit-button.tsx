'use client'

// SubmitForConsideration — button that lets a writer submit a qualifying
// script to an opportunity. Shows submission status + feedback if reviewed.
// Two states: pending (in consideration) or reviewed (feedback received).
// opportunities-v1.

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SubmissionState {
  id: string
  status: 'pending' | 'reviewed'
  feedback: string | null
}

interface SubmitButtonProps {
  opportunityId: string
  submissionId: string
  scriptTitle: string
  /** Pre-loaded submission state (from server) */
  existing?: SubmissionState | null
  /** Whether the writer has hit the active submission limit */
  atLimit?: boolean
}

export function SubmitForConsideration({ opportunityId, submissionId, scriptTitle, existing, atLimit }: SubmitButtonProps) {
  const [state, setState] = useState<SubmissionState | null>(existing ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Please sign in'); setLoading(false); return }

    const { data, error: err } = await supabase
      .from('opportunity_submissions')
      .insert({
        opportunity_id: opportunityId,
        submission_id: submissionId,
        writer_id: user.id,
        status: 'pending',
      })
      .select('id, status, feedback')
      .single()

    if (err) {
      if (err.code === '23505') setError('Already submitted')
      else setError('Something went wrong')
      setLoading(false)
      return
    }
    setState(data as SubmissionState)
    setLoading(false)
  }

  // Already submitted — show status + feedback
  if (state) {
    const isReviewed = state.status === 'reviewed'
    return (
      <div className={`rounded-lg ${isReviewed ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-100'} border px-3 py-2.5`}>
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-semibold text-gray-800">{scriptTitle}</span>
          <span className={`text-[12px] font-medium ${isReviewed ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isReviewed ? 'Feedback received' : 'In consideration'}
          </span>
        </div>
        {state.feedback && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-100">
            <p className="text-[10.5px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-1.5">Feedback</p>
            <p className="text-[13px] text-gray-700 leading-[1.6] m-0 whitespace-pre-line">{state.feedback}</p>
          </div>
        )}
      </div>
    )
  }

  // Not yet submitted — show button
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="8" fill="#10b981" opacity="0.15"/>
          <path d="M5 8.3L7 10.2L11 6" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[13.5px] font-semibold text-emerald-800">{scriptTitle}</span>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || atLimit}
        className="text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors"
      >
        {loading ? 'Submitting…' : atLimit ? 'Limit reached' : 'Submit'}
      </button>
      {error && <span className="text-[11px] text-red-500 ml-2">{error}</span>}
    </div>
  )
}
