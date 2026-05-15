// LandingHero — v16.
// "Where writers get discovered" + clear value prop + single CTA.
'use client'

import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/posthog'

export function LandingHero() {
  const router = useRouter()

  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'hero', label: 'Get started' })
    } catch {}
    router.push('/dashboard')
  }

  return (
    <section className="relative px-6 sm:px-8 pt-16 pb-14 sm:pt-24 sm:pb-20 hero-backdrop">
      <div className="max-w-3xl mx-auto text-center">
        <p
          className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-5"
          style={{ color: 'var(--gem-gold)' }}
        >
          For screenwriters
        </p>

        <h1
          className="font-semibold leading-[1.08] tracking-tight mb-5 text-[var(--gem-gray-50)]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(34px, 5.5vw, 52px)',
          }}
        >
          Where writers get discovered.
        </h1>

        <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-400)] leading-relaxed m-0 mb-8 max-w-[520px] mx-auto">
          We use technology to help writers find real opportunities
          to get their work produced. Free script evaluations. Direct
          access to our partner network. Real feedback from real people.
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
      </div>
    </section>
  )
}
