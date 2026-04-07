'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import ShareButtons from '@/components/share-buttons'

type ReportActionsProps = {
  title: string
  score?: number | null
  tier?: string | null
}

/**
 * Client-side actions bar for the report page.
 * Lives inside ReportHeader so page.tsx doesn't need changes.
 * Reads the evaluation ID from the current pathname (/report/[id]).
 *
 * NOTE: The owner-only "Revise this script" CTA lives directly inside
 * ReportHeader (under the score). It is NOT rendered here so it cannot
 * leak onto reports the viewer doesn't own.
 */
export function ReportActions({ title, score, tier }: ReportActionsProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Extract evaluation id from /report/[id]
  const match = pathname?.match(/\/report\/([^/?#]+)/)
  const evaluationId = match?.[1] ?? ''

  if (!mounted || !evaluationId) return null

  return (
    <div className="flex flex-col gap-4 pt-5 mt-5 border-t border-[var(--gem-gray-800)]">
      <ShareButtons
        evaluationId={evaluationId}
        title={title}
        score={score ?? null}
        tier={tier ?? null}
      />
    </div>
  )
}
