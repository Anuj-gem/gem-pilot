'use client'
import { useState } from 'react'
import { Info } from 'lucide-react'

export function GemRankHeader() {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div className="relative mb-2 flex items-center gap-2 pl-1">
      <div className="w-14 sm:w-16 text-center">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)]">
          Score
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowInfo((s) => !s)}
        aria-label="What does the Score mean?"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[var(--gem-gray-500)] hover:text-[var(--gem-white)] hover:bg-[var(--gem-gray-800)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--gem-gold)]"
      >
        <Info size={13} />
      </button>
      {showInfo && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-2rem))] p-3 rounded-lg border border-gray-300 bg-white text-[12px] leading-relaxed shadow-xl"
          style={{ color: '#1f2937' }}
        >
          Your{' '}
          <span className="font-semibold" style={{ color: '#0a0a0a' }}>Commercial Potential Score</span>
          {' '}(0–100). Open the{' '}
          <span className="font-semibold" style={{ color: '#0a0a0a' }}>Development tab</span>
          {' '}of any report to see what each craft dimension scored.
        </div>
      )}
    </div>
  )
}
