// LandingHero — v18.
// Full-bleed purple gradient. Bigger headline, high-contrast cards, more breathing room.
// Script card: title + format + genre + score + GEM Report hint.
// Producer card: message from Meridian Productions.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

export function LandingHero() {

  return (
    <section
      className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-24 pb-20 sm:pb-28"
      style={{
        background: 'linear-gradient(160deg, #0f0a1a 0%, #1a1035 30%, #2d1b4e 60%, #4c1d95 100%)',
      }}
    >
      {/* Star dots */}
      <div className="absolute inset-0 opacity-15" style={{
        backgroundImage: 'radial-gradient(1.5px 1.5px at 15% 25%, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 65% 15%, rgba(255,255,255,0.6), transparent), radial-gradient(1.5px 1.5px at 35% 65%, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 85% 55%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 8% 75%, rgba(255,255,255,0.6), transparent), radial-gradient(1.5px 1.5px at 92% 35%, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 50% 8%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 25% 45%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 75% 80%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 45% 90%, rgba(255,255,255,0.6), transparent)',
      }} />

      {/* Subtle radial glow behind cards */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 600px 400px at 50% 65%, rgba(124,58,237,0.15), transparent)',
      }} />

      <div className="relative max-w-3xl mx-auto text-center">
        {/* Headline */}
        <h1 className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-white leading-[1.1] tracking-tight m-0 mb-4 sm:mb-5">
          Get your screenplay in front of the right people
        </h1>
        <p className="text-[16px] sm:text-[18px] m-0 mb-12 sm:mb-16 max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Upload your script. Get scored. Let the industry come to you.
        </p>

        {/* Journey cards */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 mb-12 sm:mb-16">

          {/* Card 1: Script with score + GEM Report */}
          <div
            className="rounded-2xl p-5 lg:p-6 w-full max-w-[280px] lg:max-w-none lg:w-[260px] text-left"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Title + meta */}
            <p className="text-[15px] font-semibold text-white m-0 mb-1">Nightfall</p>
            <p className="text-[13px] m-0 mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Feature Film &middot; Drama
            </p>

            {/* Score badge */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3"
              style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="#a855f7" opacity="0.4" />
                <path d="M12 2L4 9L12 14L20 9L12 2Z" fill="#a855f7" />
              </svg>
              <span className="text-[13px] font-bold" style={{ color: '#d8b4fe' }}>Score 82</span>
            </div>

            {/* GEM Report indicator */}
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke="rgba(168,85,247,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 2v7h7" stroke="rgba(168,85,247,0.7)" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>GEM Report</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0 ml-auto">
                <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Arrow */}
          <svg
            width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"
            className="shrink-0 rotate-90 lg:rotate-0"
          >
            <path d="M5 12h14m-6-6l6 6-6 6" />
          </svg>

          {/* Card 2: Producer message */}
          <div
            className="rounded-2xl p-5 lg:p-6 w-full max-w-[280px] lg:max-w-none lg:w-[300px] text-left"
            style={{
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.45)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(124,58,237,0.5))' }}
              >
                <span className="text-[12px] text-white font-bold">M</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white m-0">Meridian Productions</p>
                <p className="text-[11px] m-0" style={{ color: 'rgba(255,255,255,0.4)' }}>2 min ago</p>
              </div>
            </div>
            <p className="text-[14px] m-0 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              &ldquo;We love this. We&apos;d like to explore developing it with you.&rdquo;
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          onClick={() => { try { trackEvent('cta_clicked', { location: 'hero', label: 'Get started' }) } catch {} }}
          className="inline-block px-12 py-4 rounded-full text-[17px] font-semibold text-white no-underline cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            boxShadow: '0 4px 20px rgba(124,58,237,0.45)',
          }}
        >
          Get started
        </Link>
      </div>
    </section>
  )
}
