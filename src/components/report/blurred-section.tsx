'use client'

import { Lock } from 'lucide-react'

interface BlurredSectionProps {
  children: React.ReactNode
  sectionLabel: string
}

/**
 * Wraps a report section with a CSS blur + subscribe overlay.
 * Content is rendered in the DOM (not hidden) but visually obscured.
 * This is a conversion mechanism, not a security boundary.
 */
export function BlurredSection({ children, sectionLabel }: BlurredSectionProps) {
  return (
    <div className="relative">
      {/* Blurred content */}
      <div
        className="select-none pointer-events-none"
        style={{ filter: 'blur(8px)' }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Subscribe overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--gem-gray-900)]/40 backdrop-blur-[2px] rounded-xl">
        <div className="text-center px-6">
          <Lock size={20} className="mx-auto mb-2 text-[var(--gem-gray-400)]" />
          <p className="text-sm text-[var(--gem-gray-300)] font-medium">
            {sectionLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
