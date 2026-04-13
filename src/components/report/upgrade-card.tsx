'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface UpgradeCardProps {
  evaluationId: string
  isLoggedIn: boolean
  /** How many free evals the owner has used (0, 1, or 2). Tunes the headline copy. */
  evalsUsed?: number
}

/**
 * Non-dismissable upgrade card shown at the top of blurred reports for ALL
 * free viewers (anonymous and logged-in). Replaces InlineSignup (anonymous)
 * and SubscribeGate modal (logged-in free).
 *
 * CTA goes straight to Stripe Checkout. For anonymous users, the success_url
 * routes to /complete-signup where they create their account post-payment.
 */
export function UpgradeCard({ evaluationId, isLoggedIn, evalsUsed = 0 }: UpgradeCardProps) {
  const [loading, setLoading] = useState(false)

  const usedBoth = evalsUsed >= 2
  const headline = usedBoth ? "You've used your 2 free evaluations" : 'Want unlimited evaluations?'
  const body = usedBoth
    ? 'Upgrade to GEM Pro to evaluate unlimited drafts — and compare scores across every revision.'
    : 'Upgrade to GEM Pro for unlimited evaluations on every draft. Track progress across revisions.'

  const handleUpgrade = async () => {
    trackSubscribeClick('upgrade_card')
    trackSubscribeFromReport({ evaluationId })
    gtagSubscribeClicked()
    setLoading(true)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_report: evaluationId,
          ...(isLoggedIn ? {} : { anonymous: true }),
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border-2 border-[var(--gem-gold)]/30 bg-white p-5 sm:p-6 mb-6 text-center">
      <h3 className="text-[17px] sm:text-[19px] font-bold text-[var(--gem-white)] mb-2 leading-tight">
        {headline}
      </h3>

      <p className="text-[13px] text-[var(--gem-gray-400)] mb-5 leading-relaxed max-w-md mx-auto">
        {body}
      </p>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-lg bg-[var(--gem-gold)] text-white text-[13px] sm:text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
      >
        {loading ? 'Redirecting to checkout…' : 'Upgrade to GEM Pro — $20/mo'}
        {!loading && <ArrowRight size={14} />}
      </button>

      <p className="text-[10px] text-[var(--gem-gray-500)] text-center mt-2">
        Cancel anytime · Secure checkout via Stripe
      </p>
    </div>
  )
}
