'use client'

import { useState } from 'react'
import { CheckCircle, X, Clock } from 'lucide-react'

interface PaywallModalProps {
  onClose: () => void
  trialExpired?: boolean
}

export function PaywallModal({ onClose, trialExpired = true }: PaywallModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[var(--gem-gray-800)] rounded-2xl border border-[var(--gem-gray-700)] p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <p className="text-xs uppercase tracking-widest text-[var(--gem-accent)] mb-2 flex items-center gap-1.5">
          <Clock size={12} />
          Get matched
        </p>
        <h2 className="text-xl font-bold text-[var(--gem-white)] mb-2">
          Get producers and reps in front of your script.
        </h2>
        <p className="text-sm text-[var(--gem-gray-400)] mb-2 leading-relaxed">
          Your first evaluation is yours forever — share the link with anyone. Pro is what puts your script in front of the producers and reps actively scouting your lane.
        </p>
        <p className="text-sm text-[var(--gem-gray-400)] mb-6 leading-relaxed">
          Industry matching, intro routing, unlimited evaluations, and privacy controls — for the price of one coffee a week.
        </p>

        <div className="rounded-xl border border-[var(--gem-gray-600)] bg-[var(--gem-gray-900)] px-6 py-5 mb-6">
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold text-[var(--gem-white)]">$20</span>
            <span className="text-sm text-[var(--gem-gray-400)]">/ month · cancel anytime</span>
          </div>
          <ul className="space-y-2 mt-3">
            {[
              'Industry matching — producers and reps scouting your lane',
              'Producer intros routed straight to your inbox',
              'Unlimited script evaluations',
              'Submit revisions and rescore old reports',
              'Per-section privacy + score-eye toggles',
              'Branded PDF download of every report',
            ].map(item => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-[var(--gem-gray-300)]"
              >
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Redirecting to checkout...' : 'Subscribe — $20 / mo'}
        </button>

        <p className="text-xs text-[var(--gem-gray-500)] text-center mt-3">
          Secure checkout via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
