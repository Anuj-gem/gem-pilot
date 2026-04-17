'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Info } from 'lucide-react'

interface Props {
  rank: number
  total: number
}

export function GemRankCard({ rank, total }: Props) {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div
      className="relative border border-[var(--gem-gray-700)] rounded-2xl p-6 sm:p-7 mb-8"
      style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent 60%)' }}
    >
      <div
        aria-hidden
        className="absolute left-0 top-5 bottom-5 rounded-r"
        style={{ width: 3, background: 'var(--gem-gold)' }}
      />
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)]">
          GEM Rank
        </div>
        <button
          type="button"
          onClick={() => setShowInfo((s) => !s)}
          aria-label="What is GEM Rank?"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[var(--gem-gray-500)] hover:text-[var(--gem-white)] hover:bg-[var(--gem-gray-800)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--gem-gold)]"
        >
          <Info size={13} />
        </button>
      </div>

      {showInfo && (
        <div
          className="mb-4 p-3 rounded-lg border border-[var(--gem-gray-700)] text-[12px] text-[var(--gem-gray-300)] leading-relaxed"
          style={{ background: 'rgba(212,175,55,0.04)' }}
        >
          This ranks this script against <span className="text-[var(--gem-white)] font-medium">your own scripts only</span>{' '}
          — not all scripts on the platform. Submit more scripts to build up your personal portfolio.
        </div>
      )}

      <p className="text-xl sm:text-[22px] text-[var(--gem-white)] leading-snug font-medium">
        GEM ranks this the <span className="text-[var(--gem-gold)]">#{rank}</span> script in your portfolio{' '}
        <span className="text-[var(--gem-gray-400)] font-normal">(Out of {total})</span>
      </p>

      <p className="text-xs text-[var(--gem-gray-500)] mt-3 leading-relaxed">
        <Link
          href="/submit"
          className="text-[var(--gem-gray-300)] underline underline-offset-2 decoration-[var(--gem-gray-600)] hover:decoration-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
        >
          Submit another script
        </Link>{' '}
        to see how it compares.
      </p>
    </div>
  )
}
