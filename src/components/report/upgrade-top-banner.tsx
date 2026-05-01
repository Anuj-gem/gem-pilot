'use client'

// UpgradeTopBanner — slim hovering banner at the top of the report page
// for free-tier owners. Replaces the heavier mid-page InlineUpgradeCTA
// ("Get your scripts in front of the industry" card). Single message,
// single action: get them to submit another script.
//
// Anuj 2026-04-30 v0.10.12 — "we just want them to submit another post."

import { ArrowRight } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface Props {
  evaluationId: string
}

export function UpgradeTopBanner({ evaluationId }: Props) {
  function handleClick() {
    trackSubscribeClick('upgrade_top_banner')
    trackSubscribeFromReport({ evaluationId })
    gtagSubscribeClicked()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  return (
    <div className="gem-no-print w-full mb-4">
      <div
        className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2 border"
        style={{
          background: 'rgba(124,58,237,0.08)',
          borderColor: 'rgba(124,58,237,0.28)',
        }}
      >
        <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--gem-gray-100)] m-0 leading-snug">
          Upgrade to GEM Pro to submit new drafts.
        </p>
        <button
          type="button"
          onClick={handleClick}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{ background: 'var(--gem-accent)' }}
        >
          Upgrade
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}
