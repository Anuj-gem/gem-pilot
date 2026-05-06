'use client'

// OpenCallsDropdown — shows open call match count with expandable list.

import { useState } from 'react'
import Link from 'next/link'

export function OpenCallsDropdown({
  count,
  matches,
}: {
  count: number
  matches: { title: string; slug: string }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
      >
        Open calls ({count}) {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5">
          {matches.map((m) => (
            <Link
              key={m.slug}
              href={`/opportunities/${m.slug}`}
              className="block px-3 py-1.5 text-[12px] text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors truncate"
            >
              {m.title}
            </Link>
          ))}
        </div>
      )}
    </span>
  )
}
