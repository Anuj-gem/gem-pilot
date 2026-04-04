'use client'

import { useState } from 'react'
import { CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface SubscribeGateProps {
  evaluationId: string
  isLoggedIn: boolean
}

export function SubscribeGate({ evaluationId, isLoggedIn }: SubscribeGateProps) {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    trackSubscribeClick('blurred_report')
    trackSubscribeFromReport({ evaluationId })
    gtagSubscribeClicked()
    setLoading(true)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_report: evaluationId,
          // If not logged in, tell checkout API to run the anonymous flow
          ...(isLoggedIn ? {} : { anonymous: true }),
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="sticky bottom-0 z-40 border-t border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]/95 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 py-5 sm:py-6">
        <div className="sm:flex sm:items-center sm:justify-between gap-6">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-base font-bold text-[var(--gem-white)] mb-1">
              Unlock the full producer read
            </h3>
            <p className="text-sm text-[var(--gem-gray-400)]">
              Your score is free. Subscribe to see what a development exec would actually say about your script.
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {['Full development reads', 'Production analysis', 'Publish to leaderboard'].map(item => (
                <li key={item} className="flex items-center gap-1.5 text-xs text-[var(--gem-gray-300)]">
                  <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:shrink-0 sm:text-right">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Redirecting...' : 'Subscribe — $20/mo'}
              {!loading && <ArrowRight size={16} />}
            </button>
            <p className="text-xs text-[var(--gem-gray-500)] mt-2">
              Cancel anytime. Secure checkout via Stripe.
            </p>
            <Link
              href="/discover"
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
            >
              Or browse the leaderboard to see full reports <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
