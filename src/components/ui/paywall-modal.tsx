'use client'

// PaywallModal — two-column Guest vs Member comparison.
// Shows dynamic usage counters. Works on mobile (stacked).
// Triggered by gem:open-upgrade-modal event or "Become a member" button.

import { useState } from 'react'

interface PaywallModalProps {
  onClose: () => void
  evalsUsed?: number
  appsUsed?: number
  /** Optional context message shown at top, e.g. "You've used all your free evaluations" */
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

  const evalsRemaining = Math.max(0, FREE_EVAL_LIMIT - evalsUsed)
  const appsRemaining = Math.max(0, FREE_APP_LIMIT - appsUsed)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10 bg-transparent border-0 cursor-pointer"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <div className="px-6 pt-6 pb-2">
          {/* Context message */}
          {contextMessage && (
            <div className="mb-4 px-3 py-2 rounded-lg text-[13px] font-medium text-center"
              style={{ background: '#fef3c7', color: '#92400e' }}>
              {contextMessage}
            </div>
          )}

          <h2 className="text-[18px] font-bold text-gray-900 text-center mb-1">
            Upgrade your plan
          </h2>
          <p className="text-[13px] text-gray-500 text-center mb-5">
            Get unlimited access to everything on GEM.
          </p>

          {/* Two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* Guest column */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Guest</div>
              <div className="text-[20px] font-bold text-gray-900 mb-3">Free</div>
              <ul className="space-y-2.5">
                <PlanRow label="Script evaluations" value={`${evalsUsed} of ${FREE_EVAL_LIMIT} used`} remaining={evalsRemaining} />
                <PlanRow label="Opportunity applications" value={`${appsUsed} of ${FREE_APP_LIMIT} used`} remaining={appsRemaining} />
                <PlanRow label="Post to Discover" value="Unlimited" check />
                <PlanRow label="View your reports" value="Unlimited" check />
              </ul>
            </div>

            {/* Member column */}
            <div className="rounded-xl border-2 p-4 relative"
              style={{ borderColor: '#7c3aed', background: '#faf5ff' }}>
              <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: '#7c3aed' }}>
                RECOMMENDED
              </div>
              <div className="text-[11px] uppercase tracking-wider font-bold mt-0.5 mb-1" style={{ color: '#7c3aed' }}>Member</div>
              <div className="text-[20px] font-bold text-gray-900 mb-3">
                $20<span className="text-[13px] font-normal text-gray-400">/mo</span>
              </div>
              <ul className="space-y-2.5">
                <PlanRow label="Script evaluations" value="Unlimited" check accent />
                <PlanRow label="Opportunity applications" value="Unlimited" check accent />
                <PlanRow label="Post to Discover" value="Unlimited" check accent />
                <PlanRow label="Priority access to new drops" value="" check accent />
                <PlanRow label="Matched to industry partners" value="" check accent />
              </ul>
            </div>
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
            className="w-full py-3 rounded-xl text-white text-[15px] font-semibold disabled:opacity-50 transition-all hover:brightness-110 border-0 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            {loading ? 'Redirecting…' : 'Start free trial'}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-2">
            7 days free, then $20/mo · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

function PlanRow({ label, value, remaining, check, accent }: {
  label: string
  value: string
  remaining?: number
  check?: boolean
  accent?: boolean
}) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] leading-snug" style={{ listStyle: 'none' }}>
      {check ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
          <path d="M3 8.5l3 3 7-7" stroke={accent ? '#7c3aed' : '#059669'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <span className="w-[14px] shrink-0" />
      )}
      <div>
        <span className="text-gray-700 font-medium">{label}</span>
        {value && (
          <div className="text-gray-400 text-[11px] mt-0.5">
            {value}
            {remaining !== undefined && remaining <= 0 && (
              <span className="ml-1 text-amber-600 font-semibold">· Limit reached</span>
            )}
            {remaining !== undefined && remaining > 0 && remaining < FREE_EVAL_LIMIT && (
              <span className="ml-1 text-amber-600 font-medium">· {remaining} left</span>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
