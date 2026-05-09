// Landing hero — client component.
//
// v10 — "Get your work in front of the right people."
// Portfolio-first framing. Primary CTA → /submit. Drop zone secondary.
'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

export function LandingHero() {
  const router = useRouter()

  function handleJoinClick() {
    try {
      trackEvent('cta_clicked', { location: 'hero', label: 'Get started' })
    } catch {}
    router.push('/start')
  }

  return (
    <section
      className="relative px-6 sm:px-8 pt-16 pb-16 sm:pt-24 sm:pb-20"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.10) 0%, transparent 65%)',
      }}
    >
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
          Get your work in front
          <br className="hidden sm:block" />
          of the right people.
        </h1>

        <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-300)] leading-relaxed mb-10 max-w-[640px] mx-auto">
          Build your profile, upload your scripts, and let GEM do the
          rest — from scoring to partner matching.
        </p>

        {/* Primary CTA */}
        <div className="max-w-[360px] mx-auto mb-3">
          <button
            id="landing-hero-cta-anchor"
            type="button"
            onClick={handleJoinClick}
            className="w-full rounded-xl px-4 py-4 text-[16px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
            }}
          >
            Get started <ArrowRight size={16} />
          </button>
        </div>
        <p className="text-[12px] text-[var(--gem-gray-500)] m-0">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  )
}
