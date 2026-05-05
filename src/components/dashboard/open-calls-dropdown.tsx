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
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-colors"
      >
        {count} open {count === 1 ? 'call' : 'calls'} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5">
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
    </div>
  )
}
