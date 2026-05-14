'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, ArrowRight, X, Clock } from 'lucide-react'
import { trackUpgradePromptShown, trackSubscribeClick } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface UpgradeBannerProps {
  delayMs?: number
  trialExpired?: boolean
}

export function UpgradeBanner({ delayMs = 60000, trialExpired = true }: UpgradeBannerProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
      trackUpgradePromptShown('report_banner')
    }, delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  const handleSubscribe = async () => {
    trackSubscribeClick('report_banner')
    gtagSubscribeClicked()
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom">
      <div className="max-w-2xl mx-auto rounded-2xl border border-[var(--gem-gray-600)] bg-[var(--gem-gray-800)] shadow-2xl shadow-black/40 p-6 sm:p-8">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-[var(--gem-gray-500)] hover:text-[var(--gem-white)] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="sm:flex sm:items-start sm:gap-6">
          <div className="flex-1 mb-5 sm:mb-0">
            <p className="text-xs uppercase tracking-widest text-[var(--gem-accent)] mb-2 flex items-center gap-1.5">
              <Clock size={12} />
              {trialExpired ? 'Try membership free' : 'Try membership free'}
            </p>
            <h3 className="text-lg font-bold text-[var(--gem-white)] mb-2">
              Get the full GEM experience — free for 7 days.
            </h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed mb-4">
              Unlimited evaluations, producer matching, and your scripts featured on Discover. Try it free, then $20/mo.
            </p>
            <ul className="space-y-1.5 text-sm text-[var(--gem-gray-300)]">
              {[
                'Unlimited script evaluations',
                'Unlimited scripts featured on Discover',
                'All formats — features, pilots, shorts',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:flex sm:flex-col sm:items-end sm:shrink-0">
            <div className="text-right mb-3 hidden sm:block">
              <span className="text-2xl font-bold text-[var(--gem-white)]">$20</span>
              <span className="text-sm text-[var(--gem-gray-400)]"> / mo</span>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Redirecting...' : 'Start free trial'}
              {!loading && <ArrowRight size={16} />}
            </button>
            <p className="text-xs text-[var(--gem-gray-500)] mt-2 text-center sm:text-right">
              7 days free, then $20/mo · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
