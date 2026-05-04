'use client'

// SubmissionList — wraps all SubmitForConsideration buttons for an opportunity
// and tracks the pending count client-side so the limit is enforced instantly
// without waiting for a server refresh.
// opportunities-v1.

import { useState } from 'react'
import { SubmitForConsideration, type SubmissionState } from './submit-button'

const MONTHLY_LIMIT = 3

interface SubmissionListProps {
  opportunityId: string
  scripts: { id: string; title: string }[]
  existingSubmissions: Record<string, SubmissionState>
  /** Current monthly submission count (from server) */
  pendingCount: number
  /** Whether the writer is a Pro subscriber */
  isPro?: boolean
}

export function SubmissionList({ opportunityId, scripts, existingSubmissions, pendingCount, isPro = true }: SubmissionListProps) {
  const [currentPending, setCurrentPending] = useState(pendingCount)

  const atLimit = !isPro || currentPending >= MONTHLY_LIMIT

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
        />
      ))}
      {isPro && atLimit && (
        <p className="text-[12.5px] text-gray-400 mt-1 m-0">
          {currentPending} of {MONTHLY_LIMIT} submissions used this month.
        </p>
      )}
      {!isPro && (
        <p className="text-[12.5px] text-purple-600 font-medium mt-1 m-0">
          Upgrade to Pro to submit to opportunities.
        </p>
      )}
    </div>
  )
}
