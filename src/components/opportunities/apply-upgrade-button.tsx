'use client'

import { Lock } from 'lucide-react'

export function ApplyUpgradeButton() {
  return (
    <div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110 cursor-pointer border-0"
        style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}
      >
        Apply now <Lock size={15} />
      </button>
      <p className="text-[12px] text-gray-400 m-0 mt-1.5">Members only</p>
    </div>
  )
}
