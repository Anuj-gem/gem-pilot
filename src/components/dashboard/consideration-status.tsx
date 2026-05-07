'use client'

// ConsiderationStatus — banner showing active consideration status.

import Link from 'next/link'

export function ConsiderationStatus({
  submittedAt,
  scriptCount,
}: {
  submittedAt: string
  scriptCount: number
}) {
  const submitted = new Date(submittedAt)
  const daysAgo = Math.floor((Date.now() - submitted.getTime()) / (1000 * 60 * 60 * 24))
  const dateLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-center gap-3">
      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-amber-900 m-0">In consideration</p>
        <p className="text-[11.5px] text-amber-700 m-0 mt-0.5">
          {scriptCount} {scriptCount === 1 ? 'script' : 'scripts'} submitted · Feedback expected soon
        </p>
      </div>
      <Link
        href="/consideration/submit"
        className="text-[11.5px] text-amber-700 font-semibold shrink-0 hover:text-amber-900 transition-colors"
      >
        Edit →
      </Link>
      <span className="text-[11px] text-amber-600 font-medium shrink-0">
        {dateLabel}
      </span>
    </div>
  )
}
