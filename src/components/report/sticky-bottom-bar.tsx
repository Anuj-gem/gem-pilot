'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface StickyBottomBarProps {
  evaluationId: string
  isLoggedIn: boolean
}

/**
 * Persistent bottom bar shown on all blurred reports. Non-dismissable.
 * Mirrors UpgradeCard's checkout logic — anonymous goes to Stripe with
 * anonymous: true, logged-in free goes to regular Stripe checkout.
 */
export function StickyBottomBar({ evaluationId, isLoggedIn }: StickyBottomBarProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    trackSubscribeClick('sticky_bottom_bar')
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-[var(--gem-white)]">Your score is ready</span>
          <span className="text-xs sm:text-sm text-[var(--gem-gray-400)]">
            {' '}— <span className="hidden sm:inline">unlock it + publish to the leaderboard</span><span className="sm:hidden">unlock + publish</span>
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? 'Redirecting...' : '$20/mo'}
          {!loading && <ArrowRight size={13} />}
        </button>
      </div>
    </div>
  )
}
