'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
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

  const reviseHref = `/submit?title=${encodeURIComponent(title)}`

  return (
    <div className="flex flex-col gap-4 pt-5 mt-5 border-t border-[var(--gem-gray-800)]">
      {/* Primary action — Revise */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={reviseHref}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          <RefreshCw size={14} />
          Revise this script
        </Link>
        <span className="text-xs text-[var(--gem-gray-500)]">
          Upload a new draft and watch your score move
        </span>
      </div>

      {/* Share buttons — only after hydration (need window.location) */}
      {mounted && evaluationId && (
        <ShareButtons
          evaluationId={evaluationId}
          title={title}
          score={score ?? null}
          tier={tier ?? null}
        />
      )}
    </div>
  )
}
