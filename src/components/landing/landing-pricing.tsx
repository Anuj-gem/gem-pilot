// LandingPricing — two-column Free vs Pro card.
// v11 — aligned with evaluation → review → matching pillars.

import { ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'

export function LandingPricing() {
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
            className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-3"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Simple pricing.
          </h2>
          <p className="text-[15px] text-[var(--gem-gray-300)] m-0">
            Your first evaluation is free. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[820px] mx-auto mb-6">
          <PriceCard
            tier="Free"
            price="$0"
            period="forever"
            blurb="Get a full evaluation on your first script."
            features={[
              '1 script evaluated',
              'Full detailed report',
              'Comparable projects',
              'Development notes',
            ]}
            cta="Get started free"
            href="/start"
            primary={false}
          />
          <PriceCard
            tier="Pro"
            price="$20"
            period="/ month"
            blurb="Unlimited evaluations, a GEM Review, and partner matching."
            features={[
              'Unlimited scripts evaluated',
              'GEM Review by our team',
              'Matched to partners',
              'Priority consideration',
            ]}
            cta="Start free trial"
            href="/start"
            primary={true}
          />
        </div>

        <p className="text-[13px] text-[var(--gem-gray-400)] text-center m-0 max-w-[480px] mx-auto leading-relaxed">
          Cancel anytime. No contracts, no hidden fees.
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
  href,
  primary,
}: {
  tier: string
  price: string
  period: string
  blurb: string
  features: string[]
  cta: string
  href: string
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
      <Link
        href={href}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
        style={{
          background: primary ? 'var(--gem-accent)' : 'var(--gem-gray-900)',
          color: primary ? '#fff' : 'var(--gem-gray-50)',
          border: primary ? 'none' : '1px solid var(--gem-gray-700)',
        }}
      >
        {cta} <ArrowRight size={14} />
      </Link>
    </div>
  )
}
