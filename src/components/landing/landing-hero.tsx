// LandingHero — v17.
// Journey: script with score → producer message. Single "Get started" CTA.
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
    <section className="relative px-4 sm:px-8 pt-8 sm:pt-16 pb-10 sm:pb-16">
      <div className="max-w-[700px] mx-auto">

        {/* Purple gradient container — same style as dashboard hero */}
        <div
          className="relative overflow-hidden rounded-2xl px-6 lg:px-8 py-12 lg:py-16 text-center flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a1025 0%, #2d1b4e 40%, #4c1d95 100%)',
          }}
        >
          {/* Star dots */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 70% 20%, white, transparent), radial-gradient(1px 1px at 40% 70%, white, transparent), radial-gradient(1px 1px at 80% 60%, white, transparent), radial-gradient(1px 1px at 10% 80%, white, transparent), radial-gradient(1px 1px at 90% 40%, white, transparent), radial-gradient(1px 1px at 55% 10%, white, transparent), radial-gradient(1px 1px at 30% 50%, white, transparent)',
          }} />

          <div className="relative w-full max-w-xl">
            {/* Headline */}
            <h1 className="text-[24px] lg:text-[30px] font-bold text-white m-0 mb-2 lg:mb-3 leading-tight">
              Get your screenplay in front of the right people
            </h1>
            <p className="text-[14px] lg:text-[15px] m-0 mb-8 lg:mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Upload your script. Build your profile. Let the industry come to you.
            </p>

            {/* Journey cards */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-4 mb-8 lg:mb-10">

              {/* Card 1: Script with score */}
              <div
                className="rounded-xl px-4 py-3 lg:px-5 lg:py-4 w-full lg:w-auto lg:min-w-[170px] text-left"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div
                    className="w-6 h-7 rounded flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                  >
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>PDF</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-white m-0">Nightfall</p>
                    <p className="text-[10px] m-0" style={{ color: 'rgba(255,255,255,0.45)' }}>Feature film</p>
                  </div>
                </div>
                <div
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="#a855f7" opacity="0.4" />
                    <path d="M12 2L4 9L12 14L20 9L12 2Z" fill="#a855f7" />
                  </svg>
                  <span className="text-[11px] font-semibold" style={{ color: '#d8b4fe' }}>Score 82</span>
                </div>
              </div>

              {/* Arrow — vertical on mobile, horizontal on desktop */}
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"
                className="shrink-0 rotate-90 lg:rotate-0"
              >
                <path d="M5 12h14m-6-6l6 6-6 6" />
              </svg>

              {/* Card 2: Producer message */}
              <div
                className="rounded-xl px-4 py-3 lg:px-5 lg:py-4 w-full lg:w-auto lg:min-w-[210px] text-left"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(168,85,247,0.5)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <span className="text-[9px] text-white font-semibold">M</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white m-0">Meridian Productions</p>
                    <p className="text-[9px] m-0" style={{ color: 'rgba(255,255,255,0.4)' }}>2 min ago</p>
                  </div>
                </div>
                <p className="text-[12px] m-0 leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  &ldquo;We love this. We&apos;d like to explore developing it with you.&rdquo;
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={handleCTA}
              className="px-10 py-4 rounded-full text-[17px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
