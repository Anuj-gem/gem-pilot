'use client'
// Inline upgrade CTA — thin banner placed at the top of any locked report section
// so the upgrade path is visible without scrolling or overlays covering the tease.
import { Lock, ArrowRight } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface Props {
  evaluationId: string
  label?: string
  subtext?: string
  cta?: string
}

export function InlineUpgradeCTA({
  evaluationId,
  label = 'Upgrade to see the full breakdown',
  subtext = 'Unlimited reports + direct industry contact.',
  cta = 'Upgrade — $20/mo',
}: Props) {
  const handleClick = () => {
    trackSubscribeClick('inline_upgrade_cta')
    trackSubscribeFromReport({ evaluationId })
    gtagSubscribeClicked()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  return (
    <div
      className="flex items-center justify-between gap-4 mb-4 px-4 py-3 rounded-xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02) 70%)',
        borderColor: 'rgba(124,58,237,0.28)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full grid place-items-center"
          style={{ background: 'rgba(124,58,237,0.12)' }}
        >
          <Lock size={14} style={{ color: 'var(--gem-accent)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-[var(--gem-white)] m-0">
            {label}
          </p>
          <p className="text-[11px] sm:text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5">
            {subtext}
          </p>
        </div>
      </div>
      <button
        onClick={handleClick}
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] sm:text-sm font-semibold text-white transition-colors"
        style={{ background: 'var(--gem-accent)' }}
      >
        {cta}
        <ArrowRight size={13} />
      </button>
    </div>
  )
}
