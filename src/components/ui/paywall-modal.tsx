'use client'

// PaywallModal — journey-first upgrade prompt.
// Leads with narrative ("continue your journey"), keeps usage context small.
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

  // Show usage line only if they've actually used something
  const hasUsage = evalsUsed > 0 || appsUsed > 0

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

          {/* Headline — the journey pitch */}
          <h2 className="text-[22px] font-bold text-gray-900 mb-2">
            Keep building. Keep getting seen.
          </h2>
          <p className="text-[14px] text-gray-600 leading-relaxed mb-6 max-w-sm mx-auto">
            Members post unlimited scripts, apply to every opportunity, and build heat as industry partners discover their work.
          </p>

          {/* What membership unlocks — simple, not a comparison grid */}
          <div className="text-left rounded-xl p-4 mb-5" style={{ background: '#faf5ff', border: '1px solid #ede9fe' }}>
            <div className="text-[12px] uppercase tracking-wider font-bold mb-3" style={{ color: '#7c3aed' }}>
              $20/mo membership
            </div>
            <div className="space-y-2.5">
              <JourneyRow text="Unlimited script evaluations" />
              <JourneyRow text="Unlimited opportunity applications" />
              <JourneyRow text="Build heat and get matched to industry" />
              <JourneyRow text="Early access to new opportunity drops" />
            </div>
          </div>

          {/* Small usage context — not the headline, just grounding */}
          {hasUsage && (
            <div className="text-[12px] text-gray-400 mb-4">
              Guest plan: {evalsUsed}/{FREE_EVAL_LIMIT} evaluations · {appsUsed}/{FREE_APP_LIMIT} applications used
            </div>
          )}
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

function JourneyRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-gray-700 font-medium">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M3 8.5l3 3 7-7" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {text}
    </div>
  )
}
