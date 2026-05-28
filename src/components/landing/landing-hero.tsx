// LandingHero — v21. Side-by-side: text left, card right.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-24 pb-12 sm:pb-16">
      <div className="relative max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
        {/* Left — text */}
        <div className="text-center md:text-left">
          <h1 className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-white leading-[1.08] tracking-tight m-0 mb-4">
            Where screenwriters develop their scripts & get{' '}
            <span style={{ color: '#d4a843' }}>discovered.</span>
          </h1>
          <p className="text-[15px] sm:text-[16px] m-0 mb-8 max-w-md mx-auto md:mx-0 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Upload your script. Get instant coverage. Connect with the industry partners who can help get your project made.
          </p>
          <Link
            id="hero-cta"
            href="/get-started"
            onClick={() => { try { trackEvent('cta_clicked', { location: 'hero', label: 'Get started' }) } catch {} }}
            className="inline-block px-10 py-3.5 rounded-xl text-[16px] font-semibold text-white no-underline cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            }}
          >
            Get started
          </Link>
        </div>

        {/* Right — the Card */}
        <div
          className="max-w-[420px] mx-auto md:mx-0 rounded-2xl text-left overflow-hidden"
          style={{
            background: '#ffffff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          {/* OPTIONED bar */}
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: '#ecfdf5', borderBottom: '1px solid #d1fae5' }}>
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#34d399' }} />
            <span className="text-[11px] font-bold tracking-wide" style={{ color: '#059669' }}>OPTIONED</span>
            <span className="text-[11px]" style={{ color: '#34d399' }}>by Meridian Pictures</span>
          </div>

          <div className="px-5 pt-4 pb-4">
            {/* Writer byline */}
            <div className="flex items-center gap-2 mb-3">
              <svg width="22" height="22" viewBox="0 0 22 22" className="rounded-full shrink-0">
                <circle cx="11" cy="11" r="11" fill="#8b5cf6"/>
                <ellipse cx="11" cy="9" rx="4" ry="4.5" fill="#f5d0a9"/>
                <ellipse cx="9.2" cy="8.2" rx="0.7" ry="0.8" fill="#1e1e1e"/>
                <ellipse cx="12.8" cy="8.2" rx="0.7" ry="0.8" fill="#1e1e1e"/>
                <ellipse cx="11" cy="10.5" rx="1.2" ry="0.4" fill="#e8967a"/>
                <path d="M7 6.5 Q8 3, 11 3 Q14 3, 15 6.5 Q14 5, 11 5 Q8 5, 7 6.5Z" fill="#1a1a1a"/>
              </svg>
              <span className="text-[11px]" style={{ color: '#9ca3af' }}>Alex Kim · Screenwriter</span>
            </div>

            {/* Title + score/heat */}
            <div className="flex items-start justify-between mb-1">
              <p className="text-[18px] font-bold m-0 leading-snug" style={{ color: '#111827', fontFamily: 'Georgia, serif' }}>Nightfall</p>
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <span className="text-[11px]" style={{ color: '#6b7280' }}>💎 85</span>
                <span className="text-[11px]" style={{ color: '#fb923c' }}>🔥 3</span>
              </div>
            </div>

            {/* Format */}
            <p className="text-[12px] m-0 mb-3.5" style={{ color: '#9ca3af' }}>Series · Drama · Thriller</p>

            {/* Divider */}
            <div className="mb-3" style={{ height: 1, background: '#f3f4f6' }} />

            {/* GEM Score + Project Heat */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>GEM Score</span>
                <span className="text-[16px] font-extrabold" style={{ color: '#7c3aed' }}>85</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#f3f0ff', color: '#7c3aed' }}>#1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>Project Heat</span>
                <span className="text-[16px] font-extrabold" style={{ color: '#f97316' }}>75</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fff7ed', color: '#f97316' }}>#1</span>
              </div>
            </div>

            {/* Divider */}
            <div className="mb-3" style={{ height: 1, background: '#f3f4f6' }} />

            {/* ATTACHED */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-[13px]">🧑</span>
              <span className="text-[11px] font-bold" style={{ color: '#111827' }}>ATTACHED</span>
              <span className="text-[11px]" style={{ color: '#9ca3af' }}>(4)</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: '#10b981' }}>
                  <span className="text-[8px] font-extrabold text-white" style={{ letterSpacing: '-0.3px' }}>MP</span>
                </div>
                <span className="text-[12px] font-medium" style={{ color: '#374151' }}>Meridian Pictures</span>
                <span className="text-[11px]" style={{ color: '#9ca3af' }}>Producer</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 22 22" className="rounded-full shrink-0">
                  <circle cx="11" cy="11" r="11" fill="#ec4899"/>
                  <ellipse cx="11" cy="9" rx="4" ry="4.5" fill="#f5d0a9"/>
                  <ellipse cx="9.2" cy="8.2" rx="0.7" ry="0.8" fill="#1e1e1e"/>
                  <ellipse cx="12.8" cy="8.2" rx="0.7" ry="0.8" fill="#1e1e1e"/>
                  <ellipse cx="11" cy="10.5" rx="1.2" ry="0.4" fill="#e8967a"/>
                  <path d="M6.5 7 Q7.5 2.5, 11 2.5 Q14.5 2.5, 15.5 7 Q15 5.5, 13.5 5 Q12 6, 10 6 Q8 6, 7 5 Q6.5 5.5, 6.5 7Z" fill="#4a2c1a"/>
                </svg>
                <span className="text-[12px] font-medium" style={{ color: '#374151' }}>Kate Park</span>
                <span className="text-[11px]" style={{ color: '#9ca3af' }}>Director</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: '#1e293b' }}>
                  <span className="text-[7px] font-extrabold" style={{ color: '#fb923c', letterSpacing: '-0.3px' }}>GSK</span>
                </div>
                <span className="text-[12px] font-medium" style={{ color: '#374151' }}>GSK Talent</span>
                <span className="text-[11px]" style={{ color: '#9ca3af' }}>Talent Rep</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 22 22" className="rounded-full shrink-0">
                  <circle cx="11" cy="11" r="11" fill="#38bdf8"/>
                  <ellipse cx="11" cy="9" rx="4" ry="4.5" fill="#c68642"/>
                  <ellipse cx="9.2" cy="8.2" rx="0.7" ry="0.8" fill="#1e1e1e"/>
                  <ellipse cx="12.8" cy="8.2" rx="0.7" ry="0.8" fill="#1e1e1e"/>
                  <ellipse cx="11" cy="10.5" rx="1.2" ry="0.4" fill="#a0522d"/>
                  <path d="M7.5 6 Q8.5 3.5, 11 3.5 Q13.5 3.5, 14.5 6 Q13.5 5, 11 4.8 Q8.5 5, 7.5 6Z" fill="#1a1a1a"/>
                </svg>
                <span className="text-[12px] font-medium" style={{ color: '#374151' }}>James Moto</span>
                <span className="text-[11px]" style={{ color: '#9ca3af' }}>Actor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
