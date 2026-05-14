// Landing hero — v15c.
// "Where writers get discovered" + single Get started CTA + report score card visual.
'use client'

import { trackEvent } from '@/lib/posthog'

export function LandingHero() {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'hero', label: 'Get started' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="relative px-6 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 hero-backdrop">
      <div className="max-w-3xl mx-auto text-center">
        <p
          className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-5"
          style={{ color: 'var(--gem-gold)' }}
        >
          For screenwriters
        </p>

        <h1
          className="font-semibold leading-[1.08] tracking-tight mb-4 text-[var(--gem-gray-50)]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(34px, 5.5vw, 52px)',
          }}
        >
          Where writers get discovered.
        </h1>

        <p className="text-[16px] text-[var(--gem-gray-400)] leading-relaxed m-0 mb-8 max-w-[440px] mx-auto">
          Upload your screenplay. Get a producer-level evaluation. Apply
          directly to opportunities from our partner network.
        </p>

        <button
          type="button"
          onClick={handleCTA}
          className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
          }}
        >
          Get started
        </button>

        {/* Report score card visual */}
        <div
          className="max-w-[400px] mx-auto mt-10 rounded-2xl p-5 text-left"
          style={{
            background: 'var(--gem-gray-800)',
            border: '1px solid var(--gem-gray-700)',
          }}
        >
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mb-0.5 uppercase tracking-wider font-semibold">
                Commercial potential
              </p>
              <p className="text-[36px] font-bold text-[var(--gem-gray-50)] m-0 leading-none">
                78
              </p>
            </div>
            <span
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg tracking-wide"
              style={{ background: 'rgba(22,163,74,0.08)', color: 'var(--gem-success)' }}
            >
              STRONG
            </span>
          </div>
          <div
            className="pt-3"
            style={{ borderTop: '1px solid var(--gem-gray-700)' }}
          >
            <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mb-1.5 uppercase tracking-wider font-semibold">
              What&apos;s working
            </p>
            <p className="text-[13px] text-[var(--gem-gray-200)] m-0 mb-1 leading-snug">
              Strong protagonist with clear internal conflict that drives every scene choice.
            </p>
            <p className="text-[13px] text-[var(--gem-gray-200)] m-0 leading-snug">
              High-tension pilot hook — audience is locked in within the first five pages.
            </p>
          </div>
        </div>
        <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-2.5 italic">
          From a real GEM evaluation report
        </p>
      </div>
    </section>
  )
}
