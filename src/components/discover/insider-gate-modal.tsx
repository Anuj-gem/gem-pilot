'use client'

// InsiderGateModal — shown when non-insider clicks "Insiders only" on
// Discover cards. Explains what GEM Insiders is and links to the
// producer onboarding form to request access.

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function InsiderGateModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler() { setOpen(true) }
    window.addEventListener('gem:open-insider-gate', handler)
    return () => window.removeEventListener('gem:open-insider-gate', handler)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(124,58,237,0.1)' }}
        >
          <svg width="22" height="22" viewBox="0 0 16 16" fill="#7c3aed">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
          </svg>
        </div>

        <h2
          className="text-[22px] font-bold text-gray-900 m-0 mb-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          This is for GEM Insiders
        </h2>
        <p className="text-[14px] text-gray-600 leading-relaxed m-0 mb-1">
          Insiders are industry professionals — producers, lit reps, and
          financiers — who use GEM to discover new scripts and connect
          with writers directly.
        </p>
        <p className="text-[14px] text-gray-600 leading-relaxed m-0 mb-6">
          If you work in the industry, request access below. We review
          applications within 48 hours.
        </p>

        <Link
          href="/onboarding/producer"
          className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg text-[14px] font-bold text-white transition-colors hover:brightness-110"
          style={{ background: '#7c3aed' }}
          onClick={() => setOpen(false)}
        >
          Request Insider access
        </Link>

        <p className="text-[12px] text-gray-400 text-center m-0 mt-3">
          Are you a writer?{' '}
          <Link href="/signup" className="text-purple-600 hover:underline font-semibold" onClick={() => setOpen(false)}>
            Create a free account
          </Link>{' '}
          to get your script evaluated.
        </p>
      </div>
    </div>
  )
}
