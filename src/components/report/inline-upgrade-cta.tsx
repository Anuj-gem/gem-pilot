'use client'
// Inline upgrade CTA — slim single-line banner placed inside report sections
// so the upgrade path is visible without scrolling. When `submissionCount` is
// passed, the label automatically reframes around the writer's portfolio.
import { ArrowRight } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface Props {
  evaluationId: string
  /** Override the default label entirely. */
  label?: string
  /** Number of completed scripts the owner has — drives the default headline. */
  submissionCount?: number
  cta?: string
}

export function InlineUpgradeCTA({
  evaluationId,
  label,
  submissionCount,
  cta = 'Go Pro — $20/mo',
}: Props) {
  const handleClick = () => {
    trackSubscribeClick('inline_upgrade_cta')
    trackSubscribeFromReport({ evaluationId })
    gtagSubscribeClicked()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  // Portfolio-aware default — "You have X scripts which should be seen by
  // the industry." Falls back to a generic line if we don't know the count.
  const computedLabel =
    label ??
    (submissionCount && submissionCount > 0
      ? `You have ${submissionCount} script${submissionCount === 1 ? '' : 's'} ready to submit to industry opportunities`
      : 'Upgrade to submit your scripts to industry opportunities')

  return (
    <div
      className="flex items-center justify-between gap-3 mb-4 px-3.5 py-2.5 rounded-lg border"
      style={{
        background: 'rgba(124,58,237,0.04)',
        borderColor: 'rgba(124,58,237,0.22)',
      }}
    >
      <p className="text-[13px] sm:text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 leading-snug min-w-0">
        {computedLabel}
      </p>
      <button
        onClick={handleClick}
        className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] sm:text-[13px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
        style={{ background: 'var(--gem-accent)' }}
      >
        {cta}
        <ArrowRight size={12} />
      </button>
    </div>
  )
}
