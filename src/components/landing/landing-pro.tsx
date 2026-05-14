// LandingPro — v15c.
// "GEM Membership" — $20/mo, 7 days free, bullet list, single CTA.
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
      <div className="max-w-[420px] mx-auto text-center">
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3 m-0"
          style={{ color: 'var(--gem-gold)' }}
        >
          GEM Membership
        </p>
        <h2
          className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-[1.1] m-0 mb-1.5"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          $20/month
        </h2>
        <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-6">
          7 days free. Cancel anytime.
        </p>

        <div className="text-left mb-6">
          {[
            'Unlimited script evaluations',
            'Apply to all live opportunities',
            'Dashboard with heat score and partner feedback',
            "Portfolio review by GEM’s development team",
          ].map(item => (
            <div
              key={item}
              className="flex items-center gap-2.5 py-2.5"
              style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
            >
              <span className="text-[14px] font-bold" style={{ color: 'var(--gem-accent)' }}>
                ✓
              </span>
              <span className="text-[14px] text-[var(--gem-gray-200)]">
                {item}
              </span>
            </div>
          ))}
        </div>

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
    </section>
  )
}
