// LandingPro — GEM Pro section.
// v13c — simple box. $20/mo. Apply for specific opportunities. Get feedback.
// No Free vs Pro comparison. Everything else is free; this is the one paid thing.
'use client'

import { ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

export function LandingPro() {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'pro_section', label: 'Get started' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'rgba(124,58,237,0.03)',
            border: '1.5px solid rgba(124,58,237,0.20)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-2 m-0"
                style={{ color: 'var(--gem-accent)' }}
              >
                GEM Pro
              </p>
              <h2
                className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-[1.15] m-0"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Apply for opportunities.
              </h2>
            </div>
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span
                className="text-[24px] font-bold leading-none text-[var(--gem-gray-50)]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                7 days free
              </span>
            </div>
          </div>

          <p className="text-[15px] text-[var(--gem-gray-300)] leading-relaxed m-0 mb-6 max-w-[52ch]">
            When partners are looking for something specific, they post it on
            GEM. Pro members can apply directly — and get real feedback on
            their work.
          </p>

          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
            }}
          >
            Start free trial <ArrowRight size={14} />
          </button>
          <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-3">
            7 days free, then $20/mo. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  )
}
