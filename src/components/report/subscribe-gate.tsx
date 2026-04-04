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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md rounded-2xl border border-[var(--gem-gray-600)] bg-[var(--gem-black)] shadow-2xl shadow-black/60 p-6 sm:p-8 pointer-events-auto">
        <h3 className="text-lg font-bold text-[var(--gem-white)] mb-2">
          Unlock the full producer read
        </h3>
        <p className="text-sm text-[var(--gem-gray-400)] mb-5">
          Your score is free. Subscribe to see what a development exec would actually say about your script.
        </p>

        <ul className="space-y-2 mb-6">
          {['Full development reads', 'Production analysis', 'Publish to leaderboard'].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-[var(--gem-gray-300)]">
              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Redirecting...' : 'Subscribe — $20/mo'}
          {!loading && <ArrowRight size={16} />}
        </button>

        <p className="text-xs text-[var(--gem-gray-500)] mt-3 text-center">
          Cancel anytime. Secure checkout via Stripe.
        </p>

        <Link
          href="/discover"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
        >
          Or browse the leaderboard to see full reports <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  )
}
