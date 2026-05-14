'use client'

import { ArrowRight } from 'lucide-react'
import { trackSubscribeClick } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

export function DashboardUpgradeBanner() {
  function handleClick() {
    trackSubscribeClick('dashboard_banner')
    gtagSubscribeClicked()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 border"
      style={{
        background: 'rgba(124,58,237,0.06)',
        borderColor: 'rgba(124,58,237,0.22)',
      }}
    >
      <p className="text-[12.5px] sm:text-[13px] font-semibold text-gray-700 m-0 leading-snug">
        Become a member to apply to opportunities and get matched with industry partners.
      </p>
      <button
        type="button"
        onClick={handleClick}
        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97] cursor-pointer border-0"
        style={{ background: '#7c3aed' }}
      >
        Become a Member
        <ArrowRight size={11} />
      </button>
    </div>
  )
}
