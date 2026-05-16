'use client'

// PaywallModal — visual upgrade prompt with three benefit cards.
// Uses the same emoji icons as the dashboard stat cards for consistency.
// Triggered by gem:open-upgrade-modal event or "Become a member" button.

import { useState } from 'react'

interface PaywallModalProps {
  onClose: () => void
  evalsUsed?: number
  appsUsed?: number
  /** Optional context message shown at top, e.g. "You've used your 2 free evaluations" */
  contextMessage?: string
}

const FREE_EVAL_LIMIT = 2
const FREE_APP_LIMIT = 2

export function PaywallModal({ onClose, evalsUsed = 0, appsUsed = 0, contextMessage }: PaywallModalProps) {
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10 bg-transparent border-0 cursor-pointer"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <div className="px-6 pt-8 pb-2 text-center">
          {/* Context message — why this appeared */}
          {contextMessage && (
            <div className="mb-4 px-3 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: '#fef3c7', color: '#92400e' }}>
              {contextMessage}
            </div>
          )}

          {/* Headline */}
          <h2 className="text-[22px] font-bold text-gray-900 mb-1">
            One membership for your writing career
          </h2>
          <p className="text-[14px] text-gray-500 mb-6">
            Everything you need to get your work seen — $20/mo
          </p>

          {/* Three benefit cards */}
          <div className="space-y-3 text-left mb-5">
            <BenefitCard
              emoji="📄"
              bgColor="#ecfdf5"
              borderColor="#d1fae5"
              title="Unlimited evaluations"
              description="Get scored reports on every script you write"
              usage={evalsUsed > 0 ? `${evalsUsed} of ${FREE_EVAL_LIMIT} free used` : undefined}
            />
            <BenefitCard
              emoji="💰"
              bgColor="#fefce8"
              borderColor="#fef08a"
              title="Unlimited opportunities"
              description="Apply to every opportunity that drops"
              usage={appsUsed > 0 ? `${appsUsed} of ${FREE_APP_LIMIT} free used` : undefined}
            />
            <BenefitCard
              emoji="🔥"
              bgColor="#fff7ed"
              borderColor="#fed7aa"
              title="Build heat"
              description="Get discovered as industry finds top-scoring work"
            />
          </div>
        </div>

        {/* CTA footer */}
        <div className="px-6 pb-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white text-[15px] font-semibold disabled:opacity-50 transition-all hover:brightness-110 border-0 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            {loading ? 'Redirecting…' : 'Become a member'}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-2.5">
            7 days free, then $20/mo · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

function BenefitCard({
  emoji,
  bgColor,
  borderColor,
  title,
  description,
  usage,
}: {
  emoji: string
  bgColor: string
  borderColor: string
  title: string
  description: string
  usage?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <span className="text-[22px] leading-none mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-gray-900">{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5">{description}</div>
        {usage && (
          <div className="text-[11px] font-medium mt-1.5 px-2 py-0.5 rounded-full inline-block"
            style={{ background: 'rgba(0,0,0,0.06)', color: '#6b7280' }}>
            {usage}
          </div>
        )}
      </div>
    </div>
  )
}
