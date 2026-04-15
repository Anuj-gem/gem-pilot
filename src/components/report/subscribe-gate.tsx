'use client'
// Upgrade modal — only opens when an upgrade CTA in the app dispatches
// 'gem:open-upgrade-modal'. No longer auto-opens on page load (the report
// already has inline upgrade CTAs + the Contact/Commercial Potential teases).
// Copy leans into what Pro unlocks most immediately: getting featured on Discover.
import { useState, useEffect } from 'react'
import { CheckCircle, ArrowRight, X, Sparkles } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface SubscribeGateProps {
  evaluationId: string
  isLoggedIn: boolean
}

export function SubscribeGate({ evaluationId, isLoggedIn }: SubscribeGateProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Only opens on event — no auto-open on mount.
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('gem:open-upgrade-modal', handler)
    return () => window.removeEventListener('gem:open-upgrade-modal', handler)
  }, [])

  const handleSubscribe = async () => {
    trackSubscribeClick('upgrade_modal')
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

  if (!open) return null

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-[var(--gem-gray-600)] bg-[var(--gem-black)] shadow-2xl shadow-black/60 p-6"
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 text-[var(--gem-gray-500)] hover:text-[var(--gem-white)] transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.14em] font-bold mb-3"
          style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--gem-accent)' }}
        >
          <Sparkles size={11} />
          GEM Pro
        </div>

        <h3 className="text-base font-bold text-[var(--gem-white)] mb-1 leading-snug">
          Get your scripts in front of producers and reps — $20/mo
        </h3>
        <p className="text-[13px] text-[var(--gem-gray-400)] mb-4 leading-snug">
          Pro writers get featured on Discover, where our industry network searches for promising scripts.
        </p>

        <ul className="space-y-1.5 mb-5">
          {[
            'Feature unlimited scripts on Discover',
            'Producers + reps can contact you directly',
            'Your Commercial Potential score, unblurred',
            'Full Details tab: production, dimensions, notes',
            'Unlimited evaluations on every draft',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-[13px] text-[var(--gem-gray-300)]">
              <CheckCircle size={13} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-semibold hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Redirecting…' : 'Upgrade to Pro — $20/mo'}
          {!loading && <ArrowRight size={14} />}
        </button>

        <p className="text-[11px] text-[var(--gem-gray-500)] mt-2.5 text-center">
          Cancel anytime. Secure checkout via Stripe.
        </p>
      </div>
    </div>
  )
}
