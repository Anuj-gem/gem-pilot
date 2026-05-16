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
  /** Whether the writer is a Pro subscriber. */
  isPro?: boolean
  /** Number of free applications remaining (for non-Pro users). */
  freeRemaining?: number
  /** Called after a successful submit — parent can update its count */
  onSubmitted?: () => void
  /** Called after a successful withdraw — parent can update its count */
  onWithdrawn?: () => void
  /** Days until monthly limit resets */
  resetDaysLeft?: number
  /** The prompt version this eval was scored on — if stale, gate submission */
  promptVersion?: string | null
  /** The evaluation ID — used to redirect to report after rerun */
  evaluationId?: string
}

/** Current prompt version — must match evaluation-prompt.ts */
const CURRENT_PROMPT_VERSION = "3.9"

export function SubmitForConsideration({ opportunityId, submissionId, scriptTitle, existing, atLimit, isPro = true, freeRemaining = 2, onSubmitted, onWithdrawn, resetDaysLeft, promptVersion, evaluationId }: SubmitButtonProps) {
  const [state, setState] = useState<SubmissionState | null>(existing ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)
  const router = useRouter()

  const isStale = promptVersion !== CURRENT_PROMPT_VERSION

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

  async function handleRerun() {
    setRerunning(true)
    setError(null)
    try {
      const res = await fetch("/api/rerun-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Rerun failed")
      // Redirect to the new report so they can review before applying
      router.push(`/report/${data.evaluation_id}`)
    } catch (err: any) {
      setError(err?.message ?? "Rerun failed")
      setRerunning(false)
    }
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

  // Not submitted (or withdrawn) — free users with 0 remaining see locked state
  if (!isPro && freeRemaining <= 0) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-gray-200">
        <span className="text-[13.5px] font-semibold text-gray-800 truncate">{scriptTitle}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-400">0 free remaining</span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white px-4 py-1.5 rounded-lg transition-all hover:brightness-110"
            style={{ background: '#7c3aed' }}
          >
            Apply <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </button>
        </div>
      </div>
    )
  }

  // Stale eval — must update before submitting
  if (isStale) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex-1 min-w-0">
          <span className="text-[13.5px] font-semibold text-gray-800 block truncate">{scriptTitle}</span>
          <span className="text-[11.5px] text-amber-700 mt-0.5 block">
            Report needs to be updated before you can apply.
          </span>
        </div>
        <button
          onClick={handleRerun}
          disabled={rerunning}
          className="text-[12px] font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ml-3"
        >
          {rerunning ? 'Updating…' : 'Update report'}
        </button>
        {error && <span className="text-[11px] text-red-500 ml-2">{error}</span>}
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
      <div className="flex items-center gap-2 shrink-0">
        {!isPro && freeRemaining > 0 && (
          <span className="text-[11px] text-gray-400">{freeRemaining} free remaining</span>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || atLimit}
          className="text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors"
        >
          {loading ? 'Submitting…' : atLimit ? 'No submissions left' : 'Apply'}
        </button>
      </div>
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
