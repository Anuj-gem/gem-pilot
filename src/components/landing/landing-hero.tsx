// LandingHero — v18.
// Full-viewport cinematic hero with 4-step journey graphic.
// Dark band fills ~95vh so "How it works" peeks at the bottom.
// White cards with dark text to match the app theme.
'use client'

import { CSSProperties } from 'react'
import { trackEvent } from '@/lib/posthog'

/* ── Shared inline styles ── */

const card: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e4e4e7',
  borderRadius: 12,
  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
}

const innerCard: CSSProperties = {
  background: '#f4f4f5',
  border: '1px solid #e4e4e7',
  borderRadius: 8,
}

const stepBadge = (color = '#7c3aed'): CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: 11,
  background: color,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: 'white',
  flexShrink: 0,
})

const stepLabel = (color = '#7c3aed'): CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  color,
  letterSpacing: 0.5,
})

const divider: CSSProperties = {
  height: 1,
  background: '#e4e4e7',
  margin: '10px 0',
}

const tag: CSSProperties = {
  ...innerCard,
  padding: '3px 10px',
  fontSize: 10,
  color: '#71717a',
  display: 'inline-block',
  borderRadius: 6,
}

export function LandingHero({ onStart }: { onStart?: () => void } = {}) {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'hero', label: 'Get started' })
    } catch {}
    if (onStart) {
      onStart()
    } else {
      window.location.href = '/onboarding'
    }
  }

  return (
    <section
      className="relative"
      style={{
        // Fill viewport minus nav height, so "How it works" just peeks
        minHeight: 'calc(100vh - 56px)',
        background: 'linear-gradient(180deg, #1a1025 0%, #0f0a18 50%, #0a0a0f 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Subtle film-strip accents */}
      <FilmStrip side="left" />
      <FilmStrip side="right" />

      {/* Gold shimmer line under nav */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent 10%, rgba(212,168,83,0.08) 30%, rgba(245,208,138,0.05) 50%, rgba(212,168,83,0.08) 70%, transparent 90%)',
        }}
      />

      {/* ── Title area ── */}
      <div className="text-center pt-12 sm:pt-16 pb-10 sm:pb-12 px-4">
        <h1
          className="font-semibold leading-[1.08] tracking-tight mb-5"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(34px, 5vw, 52px)',
            color: '#ffffff',
          }}
        >
          Where writers get discovered.
        </h1>

        <p
          className="m-0 mb-8 max-w-[520px] mx-auto leading-relaxed"
          style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#d4d4d8' }}
        >
          Upload your script. Get evaluated. Get in front of the right people.
        </p>

        <button
          type="button"
          onClick={handleCTA}
          className="inline-flex items-center gap-2 rounded-xl px-8 py-4 font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{
            fontSize: 'clamp(15px, 1.5vw, 17px)',
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
          }}
        >
          Get started
        </button>
      </div>

      {/* ── Journey cards ── */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12 sm:pb-16">
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-4 lg:gap-0 max-w-[940px] w-full">
          {/* Step 1 — Your Report */}
          <div className="w-full lg:w-[248px] shrink-0" style={card}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span style={stepBadge()}>1</span>
                <span style={stepLabel()}>YOUR REPORT</span>
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[14px] font-bold m-0" style={{ fontFamily: 'Georgia, serif', color: '#18181b' }}>
                    The Last Witness
                  </p>
                  <p className="text-[10px] m-0 mt-0.5" style={{ color: '#71717a' }}>TV Pilot · Thriller</p>
                </div>
                <div
                  className="shrink-0 grid place-items-center"
                  style={{ ...innerCard, width: 44, height: 38, borderRadius: 8 }}
                >
                  <span className="text-[18px] font-extrabold" style={{ color: '#16a34a', lineHeight: 1 }}>82</span>
                  <span className="text-[6px] font-semibold tracking-wider" style={{ color: '#a1a1aa', marginTop: -2 }}>SCORE</span>
                </div>
              </div>

              <div style={divider} />

              <p className="text-[9px] font-semibold tracking-wider m-0 mb-2" style={{ color: '#7c3aed' }}>WHY THIS CAN BE A HIT</p>
              <p className="text-[11px] m-0 leading-snug" style={{ color: '#3f3f46' }}>
                Strong protagonist with clear internal conflict. High-tension hook locks viewers in fast.
              </p>

              <div style={divider} />

              <div className="flex gap-1.5 flex-wrap">
                <span style={tag}>12 Locations</span>
                <span style={tag}>Cable/Stream</span>
              </div>
            </div>
          </div>

          {/* Arrow 1→2 */}
          <Arrow />

          {/* Step 2 — Opportunities */}
          <div className="w-full lg:w-[224px] shrink-0 self-center" style={card}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span style={stepBadge()}>2</span>
                <span style={stepLabel()}>OPPORTUNITIES</span>
              </div>

              <div className="space-y-2">
                <div style={{ ...innerCard, padding: '8px 10px' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#16a34a' }} />
                    <span className="text-[11px] font-semibold" style={{ color: '#18181b' }}>Seeking: Thrillers</span>
                  </div>
                  <p className="text-[9px] m-0 pl-4" style={{ color: '#71717a' }}>Indie prod co · Sub-$5M</p>
                </div>

                <div style={{ ...innerCard, padding: '8px 10px' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#16a34a' }} />
                    <span className="text-[11px] font-semibold" style={{ color: '#18181b' }}>Open Call: Drama Pilots</span>
                  </div>
                  <p className="text-[9px] m-0 pl-4" style={{ color: '#71717a' }}>Lit rep · Accepting queries</p>
                </div>
              </div>

              <p className="text-[10px] font-semibold m-0 mt-3" style={{ color: '#7c3aed' }}>Your script qualifies for 3 →</p>
            </div>
          </div>

          {/* Arrow 2→3 */}
          <Arrow />

          {/* Step 3 — Getting Noticed */}
          <div className="w-full lg:w-[224px] shrink-0 self-center" style={card}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span style={stepBadge()}>3</span>
                <span style={stepLabel()}>GETTING NOTICED</span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[22px] font-extrabold" style={{ color: '#f97316' }}>🔥 3</span>
                <span className="text-[11px]" style={{ color: '#3f3f46' }}>Heat earned</span>
              </div>

              <div className="rounded-full overflow-hidden mb-4" style={{ height: 6, background: '#e4e4e7' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '65%',
                    background: 'linear-gradient(90deg, #f97316, #ef4444)',
                  }}
                />
              </div>

              <div
                className="rounded-lg p-3"
                style={{
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid rgba(124,58,237,0.18)',
                }}
              >
                <p className="text-[9px] font-bold tracking-wide m-0 mb-1" style={{ color: '#7c3aed' }}>STATUS UPDATE</p>
                <p className="text-[12px] font-semibold m-0" style={{ color: '#18181b' }}>Shortlisted for review</p>
              </div>
            </div>
          </div>

          {/* Arrow 3→4 */}
          <Arrow />

          {/* Step 4 — Partner Match */}
          <div
            className="w-full lg:w-[214px] shrink-0"
            style={{ ...card, borderColor: 'rgba(22,163,106,0.4)', borderWidth: 1.5 }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span style={stepBadge('#16a34a')}>4</span>
                <span style={stepLabel('#16a34a')}>PARTNER MATCH</span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className="shrink-0 w-8 h-8 rounded-full grid place-items-center text-[11px]"
                  style={{ background: '#f4f4f5', color: '#71717a' }}
                >
                  JR
                </div>
                <div>
                  <p className="text-[11px] font-semibold m-0" style={{ color: '#18181b' }}>Jordan Rivera</p>
                  <p className="text-[9.5px] m-0" style={{ color: '#71717a' }}>Lit Rep · Verve</p>
                </div>
              </div>

              <div style={divider} />

              <p className="text-[11px] m-0 leading-snug" style={{ fontStyle: 'italic', color: '#3f3f46' }}>
                &ldquo;We loved The Last Witness. Would love to set up a call.&rdquo;
              </p>

              <div
                className="mt-3 rounded-lg py-2 text-center"
                style={{
                  background: 'rgba(22,163,106,0.08)',
                  border: '1px solid rgba(22,163,106,0.25)',
                }}
              >
                <span className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>Schedule a call →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Arrow connector (horizontal on desktop, vertical on mobile) ── */
function Arrow() {
  return (
    <div className="flex items-center justify-center lg:px-2 py-2 lg:py-0">
      {/* Desktop: horizontal */}
      <svg
        className="hidden lg:block"
        width="24"
        height="16"
        viewBox="0 0 24 16"
        fill="none"
      >
        <path d="M0 8h20m0 0l-5-5m5 5l-5 5" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Mobile: vertical */}
      <svg
        className="lg:hidden"
        width="16"
        height="24"
        viewBox="0 0 16 24"
        fill="none"
      >
        <path d="M8 0v20m0 0l-5-5m5 5l5-5" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/* ── Film-strip accent (very subtle Hollywood motif) ── */
function FilmStrip({ side }: { side: 'left' | 'right' }) {
  const perfs = Array.from({ length: 12 }, (_, i) => i)
  return (
    <div
      className="hidden xl:block absolute top-4 bottom-4"
      style={{
        [side]: 8,
        width: 22,
        opacity: 0.05,
        border: '1px solid #d4a853',
        borderRadius: 3,
      }}
    >
      {perfs.map(i => (
        <div
          key={i}
          style={{
            position: 'absolute',
            [i < 6 ? 'top' : 'bottom']: i < 6 ? 12 + i * 18 : (i - 6) * 18 + 12,
            left: 4,
            width: 12,
            height: 10,
            borderRadius: 1,
            background: '#d4a853',
          }}
        />
      ))}
    </div>
  )
}
