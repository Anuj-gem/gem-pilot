'use client'

// SubmissionList — wraps all SubmitForConsideration buttons for an opportunity
// and tracks the pending count client-side so the limit is enforced instantly
// without waiting for a server refresh.
// opportunities-v1.

import { useState } from 'react'
import { SubmitForConsideration, type SubmissionState } from './submit-button'

interface SubmissionListProps {
  opportunityId: string
  scripts: { id: string; title: string }[]
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
        />
      ))}
      {isPro && atLimit && (
        <div className="mt-1">
          <p className="text-[12.5px] text-gray-400 m-0">
            {currentPending} of {monthlyLimit} submissions used this month.
          </p>
          <p className="text-[11.5px] text-purple-500 m-0 mt-1">
            Refer a friend to earn 2 more — check your profile menu for your code.
          </p>
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
