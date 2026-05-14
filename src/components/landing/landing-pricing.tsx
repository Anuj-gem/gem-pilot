// LandingPricing — simplified Free vs Pro.
// v13 — Free = unlimited evaluations (CORRECT). Pro = active matching.
'use client'

import { ArrowRight, Check } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

export function LandingPricing() {
  function handleCTA(label: string) {
    try {
      trackEvent('cta_clicked', { location: 'pricing', label })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-[600px] mx-auto mb-10">
          <p
            className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
            style={{ color: 'var(--gem-gold)' }}
          >
            Pricing
          </p>
          <h2
            className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Simple pricing.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[820px] mx-auto mb-6">
          <PriceCard
            tier="Free"
            price="$0"
            period="forever"
            blurb="Unlimited evaluations. Full reports. No strings attached."
            features={[
              'Unlimited script evaluations',
              'Full detailed reports',
              'Comparable projects',
              'Development notes',
              'Work visible to partner network',
            ]}
            cta="Get started"
            onCTA={() => handleCTA('Get started free')}
            primary={false}
          />
          <PriceCard
            tier="Pro"
            price="7 days free"
            period="then $20/mo"
            blurb="Everything free, plus active matching and team advocacy."
            features={[
              'Everything in Free',
              'Portfolio review by our team',
              'Active matching with partners',
              'Team pitches your work directly',
              'Priority consideration',
            ]}
            cta="Start free trial"
            onCTA={() => handleCTA('Start free trial')}
            primary={true}
          />
        </div>

        <p className="text-[13px] text-[var(--gem-gray-400)] text-center m-0 max-w-[480px] mx-auto leading-relaxed">
          7 days free, then $20/mo. Cancel anytime.
        </p>
      </div>
    </section>
  )
}

function PriceCard({
  tier,
  price,
  period,
  blurb,
  features,
  cta,
  onCTA,
  primary,
}: {
  tier: string
  price: string
  period: string
  blurb: string
  features: string[]
  cta: string
  onCTA: () => void
  primary: boolean
}) {
  return (
    <div
      className="rounded-2xl p-6 sm:p-7 flex flex-col"
      style={{
        background: '#fff',
        border: primary
          ? '2px solid var(--gem-accent)'
          : '1px solid var(--gem-gray-700)',
        boxShadow: primary
          ? '0 18px 40px rgba(124,58,237,0.15), 0 4px 12px rgba(0,0,0,0.05)'
          : '0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0">
          {tier}
        </p>
        {primary && (
          <span
            className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded text-white"
            style={{ background: 'var(--gem-accent)' }}
          >
            Most popular
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1 mb-2">
        <span
          className="text-[36px] font-bold leading-none text-[var(--gem-gray-50)]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {price}
        </span>
        <span className="text-[13px] text-[var(--gem-gray-500)] font-medium">{period}</span>
      </div>
      <p className="text-[13.5px] text-[var(--gem-gray-300)] m-0 mb-4 leading-snug">
        {blurb}
      </p>
      <ul className="list-none p-0 m-0 space-y-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13.5px] text-[var(--gem-gray-100)] leading-snug">
            <span
              className="shrink-0 w-4 h-4 rounded-full grid place-items-center mt-0.5 text-white"
              style={{ background: primary ? 'var(--gem-accent)' : '#16a34a' }}
            >
              <Check size={10} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onCTA}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
        style={{
          background: primary ? 'var(--gem-accent)' : 'var(--gem-gray-900)',
          color: primary ? '#fff' : 'var(--gem-gray-50)',
          border: primary ? 'none' : '1px solid var(--gem-gray-700)',
        }}
      >
        {cta} <ArrowRight size={14} />
      </button>
    </div>
  )
}
