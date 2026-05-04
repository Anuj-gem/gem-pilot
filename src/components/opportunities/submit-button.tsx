'use client'

// SubmitForConsideration — lets a writer submit a qualifying script to an
// opportunity, withdraw a pending submission, or view feedback.
//
// States: pending (in consideration) → reviewed (feedback received)
//         pending → withdrawn (writer pulled out, frees slot)
//
// Limit: 3 pending submissions total across all opportunities.
// Reviewed/withdrawn submissions don't count toward the limit.
// opportunities-v1.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SubmissionState {
  id: string
  status: 'pending' | 'reviewed' | 'withdrawn'
  feedback: string | null
}

interface SubmitButtonProps {
  opportunityId: string
  submissionId: string
  scriptTitle: string
  /** Pre-loaded submission state (from server) */
  existing?: SubmissionState | null
  /** Whether the writer has hit the active (pending) submission limit */
  atLimit?: boolean
  /** Whether the writer is a Pro subscriber. Free users see a locked button. */
  isPro?: boolean
  /** Called after a successful submit — parent can update its count */
  onSubmitted?: () => void
  /** Called after a successful withdraw — parent can update its count */
  onWithdrawn?: () => void
  /** Days until monthly limit resets */
  resetDaysLeft?: number
}

export function SubmitForConsideration({ opportunityId, submissionId, scriptTitle, existing, atLimit, isPro = true, onSubmitted, onWithdrawn, resetDaysLeft }: SubmitButtonProps) {
  const [state, setState] = useState<SubmissionState | null>(existing ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

    // If this submission is using a bonus slot (beyond the base 3),
    // decrement bonus_submissions so it's truly one-time.
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count } = await supabase
        .from('opportunity_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('writer_id', user.id)
        .neq('status', 'withdrawn')
        .gte('submitted_at', monthStart)
      if ((count ?? 0) > 3) {
        // This submission dipped into bonus — decrement by 1
        await supabase.rpc('decrement_bonus_submissions', { p_user_id: user.id, amount: 1 })
      }
    } catch {} // non-critical — don't block the submit

    setLoading(false)
    onSubmitted?.()
    router.refresh()
  }

  async function handleWithdraw() {
    if (!state) return
    setLoading(true)
    setError(null)

    // Delete the row (RLS policy allows writers to delete their own pending submissions)
    const { error: err } = await supabase
      .from('opportunity_submissions')
      .delete()
      .eq('id', state.id)

    if (err) {
      setError('Could not withdraw')
      setLoading(false)
      return
    }
    setState(null)
    setLoading(false)
    onWithdrawn?.()
    router.refresh()
  }

  // Reviewed — show feedback, no actions needed
  if (state && state.status === 'reviewed') {
    return (
      <div className="rounded-lg bg-white border border-gray-200 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-semibold text-gray-800">{scriptTitle}</span>
          <span className="text-[12px] font-medium text-emerald-600">Feedback received</span>
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

  // Pending — show status + withdraw button
  if (state && state.status === 'pending') {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-semibold text-gray-800">{scriptTitle}</span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-amber-600">In consideration</span>
            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {loading ? '…' : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Not submitted (or withdrawn) — show submit button (or locked for free users)
  if (!isPro) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="#6b7280" opacity="0.10"/>
            <rect x="4.5" y="7" width="7" height="5" rx="1" stroke="#9ca3af" strokeWidth="1.2"/>
            <path d="M6 7V5.5a2 2 0 114 0V7" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="text-[13.5px] font-semibold text-gray-400">{scriptTitle}</span>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
          className="text-[12px] font-bold text-gray-400 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5V4a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Pro feature
        </button>
      </div>
    )
  }

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
        {loading ? 'Submitting…' : atLimit ? 'No submissions left' : 'Submit'}
      </button>
      {error && <span className="text-[11px] text-red-500 ml-2">{error}</span>}
      {atLimit && (
        <div className="w-full mt-1.5 px-1">
          <p className="text-[11px] text-gray-400 m-0">
            {resetDaysLeft ? `Your submissions reset in ${resetDaysLeft} days. ` : ''}
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector('[aria-label="Open profile menu"]') as HTMLElement | null
                el?.click()
              }}
              className="text-purple-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer text-[11px]"
            >
              Earn 2 more by referring a friend →
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
