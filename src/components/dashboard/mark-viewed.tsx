'use client'

import { useEffect } from 'react'

/** Fires POST /api/opportunities/mark-viewed on mount for the given IDs. */
export function MarkViewed({ submissionIds }: { submissionIds: string[] }) {
  useEffect(() => {
    if (submissionIds.length === 0) return
    fetch('/api/opportunities/mark-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_ids: submissionIds }),
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
