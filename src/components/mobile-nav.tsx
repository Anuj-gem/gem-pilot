'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)] shadow-lg z-50">
          <div className="px-4 py-3 flex flex-col gap-1">
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="block w-full text-center px-4 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors rounded-lg hover:bg-[var(--gem-gray-800)]"
            >
              Log In
            </Link>
            <Link
              href="/discover"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors rounded-lg hover:bg-[var(--gem-gray-800)]"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
