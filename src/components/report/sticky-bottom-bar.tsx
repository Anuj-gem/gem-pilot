'use client'

import { ArrowRight } from 'lucide-react'

interface StickyBottomBarProps {
  evaluationId: string
  isLoggedIn: boolean
}

/**
 * Persistent bottom bar shown on reports for non-subscribers.
 * Pushes toward Pro for unlimited evaluations.
 */
export function StickyBottomBar({ evaluationId, isLoggedIn }: StickyBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-[var(--gem-white)]">Got more scripts?</span>
          <span className="text-xs sm:text-sm text-[var(--gem-gray-400)]">
            {' '}— <span className="hidden sm:inline">go Pro for unlimited evaluations</span><span className="sm:hidden">unlimited with Pro</span>
          </span>
        </div>
        <a
          href="/submit"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          Submit a script
          <ArrowRight size={13} />
        </a>
      </div>
    </div>
  )
}
