'use client'

import { useState } from 'react'
import { CheckCircle, X } from 'lucide-react'

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

      <div className="relative w-full max-w-md bg-[var(--gem-gray-800)] rounded-2xl border border-[var(--gem-gray-700)] p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-[20px] font-bold text-[var(--gem-white)] mb-1.5 pr-6">
          Become a Member
        </h2>
        <p className="text-[13.5px] text-[var(--gem-gray-400)] mb-5 leading-relaxed">
          Start your 7-day free trial — unlimited evaluations, apply to opportunities, and get connected to industry partners.
        </p>

        <ul className="space-y-2.5 mb-5">
          {[
            'Unlimited script evaluations',
            'Apply to all live opportunities',
            'Get matched directly to industry partners',
            'Shareable writer portfolio',
          ].map(item => (
            <li
              key={item}
              className="flex items-center gap-2 text-[13.5px] text-[var(--gem-gray-300)]"
            >
              <CheckCircle size={14} className="text-emerald-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[var(--gem-accent)] text-white text-[15px] font-semibold hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {loading ? 'Redirecting…' : 'Start free trial'}
        </button>

        <p className="text-[11px] text-[var(--gem-gray-500)] text-center mt-2.5">
          7 days free, then $20/mo · Cancel anytime
        </p>
      </div>
    </div>
  )
}
