'use client'

import { Lock } from 'lucide-react'

interface ApplyUpgradeButtonProps {
  /** Link to apply page (unused, kept for API compatibility) */
  applyHref?: string
}

// Non-Pro users always see the upgrade modal when clicking Apply.
export function ApplyUpgradeButton({ applyHref: _ }: ApplyUpgradeButtonProps) {
  return (
    <div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal', {
          detail: { contextMessage: 'GEM Pro membership is required to apply for partner opportunities.' },
        }))}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-medium text-white w-full transition-all hover:brightness-110 cursor-pointer border-0"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
      >
        Apply <Lock size={15} />
      </button>
      <p className="text-[12px] text-white/50 text-center m-0 mt-2">GEM Pro required</p>
    </div>
  )
}
