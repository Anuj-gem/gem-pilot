// Shared header for the guided submit flow. Renders:
//  - GEM mark + back arrow (steps 2 and 3)
//  - "Step N of 3" label
//  - 3-bar progress indicator below the divider
// Sits inside Nav-less pages so we don't double-stack chrome.
import { ArrowLeft } from 'lucide-react'

export function ProgressHeader({
  step,
  total = 3,
  onBack,
  badge,
}: {
  step: number
  total?: number
  onBack?: () => void
  /** Optional small modifier shown next to "Step N of total", e.g. "draft only" */
  badge?: string
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[var(--gem-gray-700)]">
        <div className="flex items-center gap-3">
          {onBack && step > 1 && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] transition-colors -ml-1"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 rotate-45"
              style={{
                background:
                  'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span className="text-[14px] font-bold tracking-tight text-[var(--gem-gray-50)]">
              GEM
            </span>
          </div>
        </div>
        <span className="text-[11px] sm:text-[12px] text-[var(--gem-gray-500)]">
          Step {step} of {total}
          {badge ? <span className="ml-2 text-[var(--gem-gray-500)]">· {badge}</span> : null}
        </span>
      </div>
      {/* Progress bar lives in the body so the max-width matches the step content */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-7">
        <div className="max-w-[520px] mx-auto flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-[3px] rounded-full transition-colors"
              style={{
                background:
                  i < step ? 'var(--gem-accent)' : 'var(--gem-gray-700)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
