'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

const steps = [
  {
    dotStyle: { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' } as React.CSSProperties,
    dotIcon: 'diamond' as const,
    title: 'Detailed script coverage, instantly',
    description: 'Upload any draft and get a full producer-style evaluation — built on research from thousands of produced screenplays. See exactly how real buyers would view your work. Improve unlimited drafts, track your progress.',
    badge: '◇ Score 78 · 5 dimensions · comparables · dev notes',
    badgeStyle: {
      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      color: '#fff',
    },
  },
  {
    dotStyle: { background: '#fff7ed', border: '1.5px solid #fed7aa' } as React.CSSProperties,
    dotIcon: 'fire' as const,
    title: 'Build your portfolio. Build your heat.',
    description: 'Every script you evaluate becomes part of your portfolio on GEM. As industry partners read your work and engage with it, you build heat — real signal that your writing is getting noticed. Rise on the leaderboard. Build distinction.',
    badge: '🔥 Heat 14 — partners are reading your work',
    badgeStyle: {
      background: '#fff7ed',
      border: '1.5px solid #fed7aa',
      color: '#ea580c',
    },
  },
  {
    dotStyle: { background: '#e8f5e9', border: '1.5px solid rgba(21,128,61,0.3)' } as React.CSSProperties,
    dotIcon: 'money' as const,
    title: 'Matched to real industry opportunities.',
    description: 'Our network of reps and producers post open opportunities for writers and are constantly searching for scripts by GEM writers. When your work is a fit for what they\'re looking for, you connect with them directly.',
    badge: '3 opportunities matched — apply directly',
    badgeStyle: {
      background: 'rgba(21,128,61,0.08)',
      border: '1.5px solid rgba(21,128,61,0.2)',
      color: '#15803d',
    },
  },
]

export function LandingJourney() {
  return (
    <section className="px-6 sm:px-10 py-20 sm:py-28" style={{ background: 'var(--gem-black)' }}>
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-[13px] font-semibold uppercase tracking-wider m-0 mb-3" style={{ color: 'var(--gem-gold)' }}>
            How GEM works for you
          </p>
          <h2 className="text-[28px] sm:text-[36px] font-bold leading-tight m-0 mb-4" style={{ fontFamily: 'Georgia, serif', color: 'var(--gem-gray-50)' }}>
            Your partner at every step.
          </h2>
          <p className="text-[16px] sm:text-[18px] m-0 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--gem-gray-300)' }}>
            GEM helps you understand your work, build your portfolio, grow your reputation, and get found by the right people. One platform, from first draft to first meeting.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative pl-8 sm:pl-10">
          {/* Vertical gradient line */}
          <div
            className="absolute left-[10px] sm:left-[14px] top-3 bottom-3 w-[2px]"
            style={{
              background: 'linear-gradient(180deg, #7c3aed 0%, #a855f7 30%, #fb923c 65%, #15803d 100%)',
            }}
          />

          {steps.map((step, i) => (
            <div key={i} className="relative mb-12 last:mb-0">
              {/* Dot */}
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  left: -32,
                  top: 4,
                  width: 22,
                  height: 22,
                  ...step.dotStyle,
                }}
              >
                {step.dotIcon === 'diamond' && (
                  <span
                    className="block"
                    style={{
                      width: 8,
                      height: 8,
                      background: 'rgba(255,255,255,0.85)',
                      transform: 'rotate(45deg)',
                    }}
                  />
                )}
                {step.dotIcon === 'fire' && (
                  <span className="text-[11px] leading-none">🔥</span>
                )}
                {step.dotIcon === 'money' && (
                  <span className="text-[11px] leading-none">💰</span>
                )}
              </div>

              {/* Content */}
              <h3 className="text-[18px] sm:text-[20px] font-bold m-0 mb-2" style={{ color: 'var(--gem-gray-50)' }}>
                {step.title}
              </h3>
              <p className="text-[15px] m-0 mb-4 leading-relaxed" style={{ color: 'var(--gem-gray-300)' }}>
                {step.description}
              </p>

              {/* Motif badge */}
              <span
                className="inline-block text-[12px] font-medium rounded-full px-3 py-1.5"
                style={step.badgeStyle}
              >
                {step.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <Link
            href="/get-started"
            onClick={() => { try { trackEvent('cta_clicked', { location: 'journey', label: 'Get started free' }) } catch {} }}
            className="text-[16px] font-semibold no-underline hover:underline"
            style={{ color: 'var(--gem-accent)' }}
          >
            Get started free →
          </Link>
        </div>
      </div>
    </section>
  )
}
