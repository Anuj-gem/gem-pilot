'use client'

// SubmissionList — wraps all SubmitForConsideration buttons for an opportunity
// and tracks the pending count client-side so the limit is enforced instantly
// without waiting for a server refresh.
// opportunities-v1.

import { useState } from 'react'
import { SubmitForConsideration, type SubmissionState } from './submit-button'

const ACTIVE_SUBMISSION_LIMIT = 5

interface SubmissionListProps {
  opportunityId: string
  scripts: { id: string; title: string }[]
  existingSubmissions: Record<string, SubmissionState>
  /** Current pending count across ALL opportunities (from server) */
  pendingCount: number
}

export function SubmissionList({ opportunityId, scripts, existingSubmissions, pendingCount }: SubmissionListProps) {
  const [currentPending, setCurrentPending] = useState(pendingCount)

  const atLimit = currentPending >= ACTIVE_SUBMISSION_LIMIT

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
          onSubmitted={onSubmitted}
          onWithdrawn={onWithdrawn}
        />
      ))}
      {atLimit && (
        <p className="text-[12.5px] text-gray-400 mt-1 m-0">
          You have {currentPending} scripts in consideration (limit {ACTIVE_SUBMISSION_LIMIT}).
        </p>
      )}
    </div>
  )
}
