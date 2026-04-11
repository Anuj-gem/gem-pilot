'use client'

import { useState } from 'react'
import { ArrowRight, Sparkles, Users, FileText, RefreshCw } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface UpgradeCardProps {
  evaluationId: string
  isLoggedIn: boolean
}

/**
 * Non-dismissable upgrade card shown at the top of blurred reports for ALL
 * free viewers (anonymous and logged-in). Replaces InlineSignup (anonymous)
 * and SubscribeGate modal (logged-in free).
 *
 * CTA goes straight to Stripe Checkout. For anonymous users, the success_url
 * routes to /complete-signup where they create their account post-payment.
 */
export function UpgradeCard({ evaluationId, isLoggedIn }: UpgradeCardProps) {
  const [loading, setLoading] = useState(false)

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
    <div className="rounded-xl bg-[var(--gem-gray-50)] text-white p-4 sm:p-5 mb-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={15} className="text-[var(--gem-gold)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gem-gold)]">
          GEM Pro
        </span>
      </div>

      <h3 className="text-[17px] sm:text-[19px] font-bold mb-2 leading-tight">
        See your score. Get matched with producers.
      </h3>

      <p className="text-[13px] text-white/60 mb-4 leading-relaxed">
        Your evaluation is complete. Subscribe to unlock your full score, detailed development notes, and get your script circulated to our production partners.
      </p>

      <div className="flex flex-col gap-2 mb-4">
        {[
          { icon: Users, color: 'text-emerald-400', label: 'Matched with producers looking for your genre' },
          { icon: FileText, color: 'text-violet-400', label: 'Full score, verdict, and development notes' },
          { icon: RefreshCw, color: 'text-amber-400', label: 'Unlimited evaluations on every draft' },
        ].map(({ icon: Icon, color, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className="w-[26px] h-[26px] rounded-md bg-white/10 flex items-center justify-center shrink-0">
              <Icon size={14} className={color} />
            </div>
            <span className="text-[13px] sm:text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-lg bg-[var(--gem-accent)] text-white text-[13px] sm:text-sm font-semibold hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading ? 'Redirecting to checkout…' : 'Start your membership — $20/mo'}
        {!loading && <ArrowRight size={14} />}
      </button>

      <p className="text-[10px] text-white/40 text-center mt-1.5">
        Cancel anytime · Secure checkout via Stripe
      </p>
    </div>
  )
}
