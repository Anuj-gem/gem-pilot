'use client'

// SubmissionList — wraps all SubmitForConsideration buttons for an opportunity
// and tracks the pending count client-side so the limit is enforced instantly
// without waiting for a server refresh.
// opportunities-v1.

import { useState } from 'react'
import { SubmitForConsideration, type SubmissionState } from './submit-button'

interface SubmissionListProps {
  opportunityId: string
  scripts: { id: string; title: string; promptVersion?: string | null; evaluationId?: string }[]
  existingSubmissions: Record<string, SubmissionState>
  /** Current monthly submission count (from server) */
  pendingCount: number
  /** Monthly submission limit (3 + bonus) */
  monthlyLimit?: number
  /** Whether the writer is a Pro subscriber */
  isPro?: boolean
}

export function SubmissionList({ opportunityId, scripts, existingSubmissions, pendingCount, monthlyLimit = 3, isPro = true }: SubmissionListProps) {
  const [currentPending, setCurrentPending] = useState(pendingCount)

  const atLimit = !isPro || currentPending >= monthlyLimit

  function onSubmitted() {
    setCurrentPending(prev => prev + 1)
  }

  function onWithdrawn() {
    setCurrentPending(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="flex flex-col gap-2">
      {scripts.map(s => (
        <SubmitForConsideration
          key={s.id}
          opportunityId={opportunityId}
          submissionId={s.id}
          scriptTitle={s.title}
          existing={existingSubmissions[s.id] ?? null}
          atLimit={atLimit && !existingSubmissions[s.id]}
          isPro={isPro}
          onSubmitted={onSubmitted}
          onWithdrawn={onWithdrawn}
          promptVersion={s.promptVersion}
          evaluationId={s.evaluationId}
        />
      ))}
      {isPro && atLimit && (
        <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
          <p className="text-[12.5px] font-semibold text-gray-700 m-0">
            You&apos;ve used all your submissions this month.
          </p>
          <p className="text-[11.5px] text-gray-400 m-0 mt-1">
            Your 3 monthly submissions reset at the start of next month.
          </p>
          <button
            type="button"
            onClick={() => {
              const el = document.querySelector('[aria-label="Open profile menu"]') as HTMLElement | null
              el?.click()
            }}
            className="text-[12px] text-purple-600 font-semibold mt-1.5 bg-transparent border-none p-0 cursor-pointer hover:underline"
          >
            Earn 2 bonus submissions by referring a friend →
          </button>
        </div>
      )}
      {!isPro && (
        <p className="text-[12.5px] text-purple-600 font-medium mt-1 m-0">
          Upgrade to Pro to submit to opportunities.
        </p>
      )}
    </div>
  )
}
