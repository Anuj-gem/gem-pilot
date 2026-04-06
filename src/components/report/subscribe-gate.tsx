'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

const STORAGE_KEY = 'gem_upgrade_dismissed_date'

function todayString() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

interface SubscribeGateProps {
  evaluationId: string
  isLoggedIn: boolean
}

export function SubscribeGate({ evaluationId, isLoggedIn }: SubscribeGateProps) {
  const [loading, setLoading] = useState(false)
  // Start as not dismissed; useEffect will correct it after mount
  const [dismissed, setDismissed] = useState(false)

  // On mount: if user already dismissed the modal today, start in banner mode
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === todayString()) setDismissed(true)
    } catch {
      // localStorage blocked — leave as modal
    }
  }, [])

  const handleSubscribe = async () => {
    trackSubscribeClick(dismissed ? 'bottom_banner' : 'blurred_report')
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

  // ── Sticky bottom banner (after modal is dismissed) ──
  if (dismissed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--gem-gray-300)]">
            <span className="font-medium text-[var(--gem-white)]">Unlock your notes</span>
            <span className="hidden sm:inline"> — then rewrite and watch your score climb</span>
          </p>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Redirecting...' : '$20/mo'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    )
  }

  // ── Center modal (default state on page load) ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--gem-gray-600)] bg-[var(--gem-black)] shadow-2xl shadow-black/60 p-6 sm:p-8 pointer-events-auto">
        {/* Close button */}
        <button
          onClick={() => {
            try { localStorage.setItem(STORAGE_KEY, todayString()) } catch { /* blocked */ }
            setDismissed(true)
          }}
          className="absolute top-4 right-4 text-[var(--gem-gray-500)] hover:text-[var(--gem-white)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 className="text-lg font-bold text-[var(--gem-white)] mb-2">
          Unlock your notes — then rewrite and watch your score climb.
        </h3>
        <p className="text-sm text-[var(--gem-gray-400)] mb-5">
          Your score is free. Subscribe to see exactly what to change, upload your next draft, and track the score with every revision.
        </p>

        <ul className="space-y-2 mb-6">
          {['Full development notes', 'Unlimited revisions, tracked', 'Publish to leaderboard'].map(item => (
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
