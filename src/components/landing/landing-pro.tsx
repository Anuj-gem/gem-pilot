// LandingPro — single centered pricing card.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

const FEATURES = [
  'Unlimited script evaluations',
  'Unlimited opportunity applications',
  'Portfolio reviews by our development team',
  'Direct partner matching',
  'Priority in opportunity matching',
  'Publish to Discover',
]

export function LandingPro() {
  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
    >
      <div className="mx-auto text-center" style={{ maxWidth: 560 }}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          Membership
        </p>
        <h2
          className="font-bold tracking-tight leading-[1.15] m-0 mb-3"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(28px, 5vw, 40px)',
          }}
        >
          $20/month.
        </h2>
        <p className="text-[15px] text-[var(--gem-gray-400)] m-0 mb-9">
          Value that has never existed for writers, at a fraction of what you&apos;d pay anywhere else. Cancel anytime.
        </p>

        {/* Pricing card */}
        <div
          className="rounded-2xl p-8 text-left mb-7"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(124,58,237,0.2)',
            boxShadow: '0 4px 20px rgba(124,58,237,0.06)',
          }}
        >
          <div className="mb-1">
            <span className="text-[36px] font-extrabold text-[var(--gem-gray-50)]">$20</span>
            <span className="text-[15px] font-medium text-[var(--gem-gray-400)]">/month</span>
          </div>
          <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-6">
            Everything. Unlimited. No per-script fees, no hidden costs.
          </p>
          <ul className="list-none m-0 p-0">
            {FEATURES.map((feature, i) => (
              <li
                key={feature}
                className="flex gap-2.5 py-2"
                style={{
                  borderBottom: i < FEATURES.length - 1 ? '1px solid var(--gem-gray-700)' : 'none',
                }}
              >
                <span className="text-[16px] font-bold shrink-0" style={{ color: '#16a34a' }}>
                  &#10003;
                </span>
                <span className="text-[14px] text-[var(--gem-gray-300)]">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-[var(--gem-gray-400)] m-0 mb-7">
          Want to try it first? Sign up free &mdash; you get 2 evaluations and 2 opportunity applications, no card required.
        </p>

        <Link
          href="/get-started"
          className="inline-block rounded-xl px-10 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
          }}
          onClick={() => {
            try { trackEvent('cta_clicked', { location: 'membership_section', label: 'Get started' }) } catch {}
          }}
        >
          Get started
        </Link>
      </div>
    </section>
  )
}
