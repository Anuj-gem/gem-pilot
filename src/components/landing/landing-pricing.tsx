// LandingPricing — two-column Free vs Pro card. Pro is the
// conversion driver, Free is the on-ramp.
//
// Anuj 2026-04-30 v0.11.0 — community-first relaunch. Free now
// means you can post publicly + get peer reviews. Pro unlocks
// multiple scripts/drafts and direct industry contact, which are
// the two things conversion is currently driven on.

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
            className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Free to start. One plan when you're ready.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[820px] mx-auto mb-6">
          <PriceCard
            tier="Free"
            price="$0"
            period="forever"
            blurb="See what your script is worth."
            features={[
              'One full evaluation — no blur, no paywall',
              'Sharable report URL',
              'See which opportunities your script qualifies for',
            ]}
            cta="Get your free evaluation"
            href="/submit"
            primary={false}
          />
          <PriceCard
            tier="Pro"
            price="$20"
            period="/ month"
            blurb="Unlimited evaluations. Unlimited submissions."
            features={[
              'Unlimited script evaluations',
              'Submit to every opportunity you qualify for',
              'Revise and rescore any script',
              'Full writer profile visible to industry',
              'Priority in opportunity matching',
            ]}
            cta="Go Pro"
            href="/submit"
            primary={true}
          />
        </div>

        <p className="text-[13px] text-[var(--gem-gray-400)] text-center m-0 max-w-[580px] mx-auto leading-relaxed">
          Other platforms charge $75-150 per evaluation. Competitions charge
          $50-80 per entry. GEM Pro is $20/mo for everything, unlimited.
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
