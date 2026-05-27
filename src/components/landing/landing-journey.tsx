// LandingJourney — v2. Three feature cards on dark bg.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

const cards = [
  {
    icon: '◇',
    iconBg: 'rgba(168,85,247,0.2)',
    title: 'Instant coverage',
    description: 'Full producer-style evaluation. Score, comparables, development notes. Ready in 60 seconds.',
    badge: '◇ Score 78 · 5 dimensions',
    badgeBg: 'rgba(168,85,247,0.15)',
    badgeBorder: 'rgba(168,85,247,0.3)',
    badgeColor: '#d8b4fe',
  },
  {
    icon: '🔥',
    iconBg: 'rgba(251,146,60,0.15)',
    title: 'Build your heat',
    description: 'As industry partners read your work, you build heat — real signal that your writing is getting noticed.',
    badge: '🔥 Heat 14 — partners reading',
    badgeBg: 'rgba(251,146,60,0.12)',
    badgeBorder: 'rgba(251,146,60,0.25)',
    badgeColor: '#fdba74',
  },
  {
    icon: '💰',
    iconBg: 'rgba(52,211,153,0.15)',
    title: 'Get matched',
    description: 'Reps and producers post open opportunities. When your work fits, you connect directly.',
    badge: '3 opportunities matched',
    badgeBg: 'rgba(52,211,153,0.1)',
    badgeBorder: 'rgba(52,211,153,0.2)',
    badgeColor: '#6ee7b7',
  },
]

export function LandingJourney() {
  return (
    <section className="px-6 sm:px-10 py-20 sm:py-28" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-[13px] font-semibold uppercase tracking-wider m-0 mb-3" style={{ color: '#d4a843' }}>
            How GEM works for you
          </p>
          <h2 className="text-[28px] sm:text-[36px] font-bold leading-tight m-0 mb-4" style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}>
            Your partner at every step.
          </h2>
          <p className="text-[16px] sm:text-[18px] m-0 max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            From first draft to first meeting. One platform.
          </p>
        </div>

        {/* Three cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                className="flex items-center justify-center mb-3"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: card.iconBg,
                  fontSize: 18,
                }}
              >
                {card.icon}
              </div>
              <h3 className="text-[16px] font-bold mb-2" style={{ color: '#ffffff' }}>
                {card.title}
              </h3>
              <p className="text-[13px] m-0 mb-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {card.description}
              </p>
              <span
                className="inline-block text-[11px] font-medium rounded-full px-3 py-1.5"
                style={{
                  background: card.badgeBg,
                  border: `1px solid ${card.badgeBorder}`,
                  color: card.badgeColor,
                }}
              >
                {card.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            href="/get-started"
            onClick={() => { try { trackEvent('cta_clicked', { location: 'journey', label: 'Get started free' }) } catch {} }}
            className="text-[16px] font-semibold no-underline hover:underline"
            style={{ color: '#c4b5fd' }}
          >
            Get started free →
          </Link>
        </div>
      </div>
    </section>
  )
}
