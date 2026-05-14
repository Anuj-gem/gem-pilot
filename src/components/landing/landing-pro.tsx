// LandingPro — v16.
// Simple membership pricing — $20/mo, everything included.
'use client'

import { trackEvent } from '@/lib/posthog'

export function LandingPro() {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'membership_section', label: 'Get started' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Left: Pricing */}
          <div className="flex-1">
            <p
              className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
              style={{ color: 'var(--gem-gold)' }}
            >
              Members only
            </p>
            <h2
              className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              $20/month.
            </h2>
            <p className="text-[15px] text-[var(--gem-gray-400)] m-0 mb-6">
              7 days free. Cancel anytime.
            </p>

            <p className="text-[14px] text-[var(--gem-gray-300)] m-0 mb-8 leading-relaxed max-w-[440px]">
              GEM is a membership network. Your subscription gets you
              full access to evaluations, opportunities, partner feedback,
              and direct matching — everything you need to get your work
              in front of the right people. Way cheaper than a single
              coverage read anywhere else, and it actually leads somewhere.
            </p>

            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
              style={{
                background: 'var(--gem-accent)',
                boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
              }}
            >
              Get started
            </button>
          </div>

          {/* Right: What's included */}
          <div
            className="w-full md:w-[340px] shrink-0 rounded-2xl p-5"
            style={{
              background: 'var(--gem-gray-800)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            <p className="text-[12px] font-semibold text-[var(--gem-gray-400)] uppercase tracking-wider mb-4 m-0">
              What&apos;s included
            </p>
            {[
              'Unlimited script evaluations',
              'Apply to all live opportunities',
              'Get your heat score',
              'Get matched directly to industry partners',
            ].map(item => (
              <div
                key={item}
                className="flex items-start gap-2.5 py-2.5"
                style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
              >
                <span className="text-[14px] font-bold mt-0.5" style={{ color: 'var(--gem-accent)' }}>
                  &#10003;
                </span>
                <span className="text-[14px] text-[var(--gem-gray-200)]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
