'use client'

import { Lock } from 'lucide-react'

interface ApplyUpgradeButtonProps {
  /** Number of free applications remaining (for non-Pro users). */
  freeRemaining?: number
  /** Link to apply page when user can apply */
  applyHref?: string
}

export function ApplyUpgradeButton({ freeRemaining = 0, applyHref }: ApplyUpgradeButtonProps) {
  // Free user with remaining applications — show working Apply button with counter
  if (freeRemaining > 0 && applyHref) {
    return (
      <div>
        <a
          href={applyHref}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110"
          style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}
        >
          Apply now
        </a>
        <p className="text-[12px] text-gray-400 m-0 mt-1.5">{freeRemaining} free remaining</p>
      </div>
    )
  }

  // No remaining — locked state
  return (
    <div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110 cursor-pointer border-0"
        style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}
      >
        Apply now <Lock size={15} />
      </button>
      <p className="text-[12px] text-gray-400 m-0 mt-1.5">0 free remaining</p>
    </div>
  )
}
