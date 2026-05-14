// LandingFinalCTA — v15c.
// "Ready to get your work out there?"
'use client'

import { ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

export function LandingFinalCTA() {
  function handleClick() {
    try {
      trackEvent('cta_clicked', { location: 'final_cta', label: 'Get started' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="px-5 sm:px-8 py-20 sm:py-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2
          className="text-[32px] sm:text-[42px] font-bold tracking-tight leading-[1.1] m-0 mb-4"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Ready to get your work out there?
        </h2>
        <p className="text-[15.5px] sm:text-[17px] text-[var(--gem-gray-300)] leading-relaxed m-0 mb-8 max-w-[480px] mx-auto">
          Upload your screenplay. 7 days free.
        </p>
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-4 text-[16px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
          }}
        >
          Get started <ArrowRight size={16} />
        </button>
      </div>
    </section>
  )
}
