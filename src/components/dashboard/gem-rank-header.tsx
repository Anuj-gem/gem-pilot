'use client'
import { useState } from 'react'
import { Info } from 'lucide-react'

export function GemRankHeader() {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div className="relative mb-2 flex items-center gap-2 pl-1">
      <div className="w-10 sm:w-12 text-center">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)]">
          GEM Rank
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowInfo((s) => !s)}
        aria-label="What is GEM Rank?"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[var(--gem-gray-500)] hover:text-[var(--gem-white)] hover:bg-[var(--gem-gray-800)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--gem-gold)]"
      >
        <Info size={13} />
      </button>
      {showInfo && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-2rem))] p-3 rounded-lg border border-[var(--gem-gray-300)] bg-white text-[12px] text-[var(--gem-gray-700)] leading-relaxed shadow-xl"
        >
          This ranks your scripts against{' '}
          <span className="text-[var(--gem-gray-900)] font-semibold">your own portfolio only</span>{' '}
          — not all scripts on the platform. Submit more scripts to build it up.
        </div>
      )}
    </div>
  )
}
