'use client'

// LandingPageV21 — complete landing page body (v21, rebuilt to match landing-free-v8 mockup).
// Sections: Hero → The Read → Funding Opportunities (live) → Funding Band → How We Work → The Math → Why It's Free → Final CTA
// Outer page (src/app/page.tsx) provides the #2b1a55 background + Nav.

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'
import { OpportunityCard, type OpportunityCardProps } from '@/components/opportunities/opportunity-card'
import { type LeaderboardCard } from '@/components/discover/leaderboard-cards'

// ─── Shared primitives ───────────────────────────────────────────────

const GOLD = '#D4A843'
const PURPLE = '#7c3aed'
const PURPLE_GRAD = 'linear-gradient(135deg, #7c3aed, #a855f7)'
const MUTED = 'rgba(255,255,255,0.62)'
const FAINT = 'rgba(255,255,255,0.42)'
const DIVIDER = '1px solid rgba(255,255,255,0.10)'

function GemDiamond({ size = 11 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0 align-middle"
      style={{
        width: size,
        height: size,
        transform: 'rotate(45deg)',
        background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
        borderRadius: 1,
        display: 'inline-block',
      }}
    />
  )
}

function SectionWrapper({
  children,
  className = '',
  center = false,
}: {
  children: React.ReactNode
  className?: string
  center?: boolean
}) {
  return (
    <section
      className={`px-5 sm:px-8 py-14 ${center ? 'text-center' : ''} ${className}`}
      style={{ borderTop: DIVIDER }}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  )
}

const eyebrowStyle: React.CSSProperties = {
  color: GOLD,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: 2,
  textTransform: 'uppercase',
}

const h2Style: React.CSSProperties = {
  fontSize: 'clamp(25px, 3.4vw, 38px)',
  letterSpacing: '-0.8px',
  fontWeight: 800,
  lineHeight: 1.12,
  color: '#ffffff',
}

const leadStyle: React.CSSProperties = {
  fontSize: 17,
  color: MUTED,
  lineHeight: 1.6,
}

// ─── Section 1: HERO ────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="px-5 sm:px-8 pt-12 sm:pt-16 pb-12 text-center">
      <div className="mx-auto max-w-5xl">
        {/* 100% free pill */}
        <div
          className="inline-flex items-center gap-2 mb-6 rounded-full"
          style={{
            padding: '7px 16px',
            background: 'rgba(212,168,67,0.12)',
            border: '1px solid rgba(212,168,67,0.35)',
            color: GOLD,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          <GemDiamond size={8} /> 100% free
        </div>

        <h1
          className="font-extrabold m-0 mb-5 mx-auto"
          style={{ fontSize: 'clamp(34px, 6vw, 60px)', lineHeight: 1.05, letterSpacing: '-1.5px', color: '#ffffff' }}
        >
          A new kind of studio.
          <br />
          <span style={{ color: GOLD }}>Open to everyone.</span>
        </h1>

        <p className="m-0 mb-8 mx-auto" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: MUTED, maxWidth: 660, lineHeight: 1.55 }}>
          Develop your project on GEM, in the open. We find the ones we believe in and put real capital and connections behind them — and it&apos;s free for every creator.
        </p>

        <div className="flex gap-3.5 justify-center flex-wrap">
          <Link
            href="/get-started"
            onClick={() => { try { trackEvent('cta_clicked', { location: 'hero_v21', label: 'Get started' }) } catch {} }}
            className="inline-block text-white no-underline transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: PURPLE_GRAD, padding: '15px 34px', borderRadius: 12, fontWeight: 600, fontSize: 17, boxShadow: '0 6px 20px rgba(124,58,237,0.30)' }}
          >
            Get started
          </Link>
          <Link
            href="/opportunities"
            onClick={() => { try { trackEvent('cta_clicked', { location: 'hero_v21', label: 'Browse funding opportunities' }) } catch {} }}
            className="inline-block text-white no-underline transition-all hover:bg-white/10 active:scale-[0.98]"
            style={{ border: '1px solid rgba(255,255,255,0.35)', padding: '15px 34px', borderRadius: 12, fontWeight: 600, fontSize: 17 }}
          >
            Browse funding opportunities
          </Link>
        </div>

        <div className="mt-[18px]" style={{ color: FAINT, fontSize: 14, fontWeight: 500, letterSpacing: '0.3px' }}>
          No subscription. No fees. No gatekeepers.
        </div>
      </div>
    </section>
  )
}

// ─── Section 2: THE READ ────────────────────────────────────────────

function TheReadSection() {
  return (
    <SectionWrapper>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left — copy */}
        <div>
          <div className="mb-3.5" style={eyebrowStyle}>The read</div>
          <h2 className="m-0 mb-4" style={h2Style}>A real analysis of your script</h2>
          <p className="m-0" style={{ ...leadStyle, maxWidth: 680 }}>
            Upload a screenplay and GEM gives it a score, calls out its real strengths and where it needs work, and estimates the budget. The kind of read that usually costs hundreds — free, every time.
          </p>
        </div>

        {/* Right — static report card */}
        <div
          className="w-full"
          style={{ background: '#fff', color: '#1C1917', borderRadius: 18, boxShadow: '0 16px 48px rgba(0,0,0,0.34)', padding: 22 }}
        >
          <div style={{ fontSize: 21, fontWeight: 800, fontFamily: 'Georgia, serif' }}>Nightfall</div>
          <div style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 16 }}>Series · Thriller · Drama</div>

          {/* GEM Score box */}
          <div style={{ background: '#F5F3FF', border: '1px solid #e6e0ff', borderRadius: 14, padding: '15px 16px', marginBottom: 18 }}>
            <div
              className="flex items-center gap-2"
              style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: PURPLE, marginBottom: 6 }}
            >
              <GemDiamond size={9} /> GEM Score
            </div>
            <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 0.9, color: PURPLE, letterSpacing: '-1px' }}>
              88
              <span style={{ fontSize: 17, color: '#a78bfa', fontWeight: 600, marginLeft: 4 }}>/ 100</span>
            </div>
            <div style={{ height: 7, background: '#ece8ff', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
              <div style={{ display: 'block', height: 7, background: PURPLE, borderRadius: 99, width: '88%' }} />
            </div>
          </div>

          {/* Strengths */}
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#1C1917', margin: '14px 0 8px' }}>Strengths</div>
          <ul className="list-none m-0 p-0 flex flex-col" style={{ gap: 6 }}>
            {[
              'Breakout central character with a real contradiction at the core',
              'The hook lands inside the first ten pages and keeps pulling',
              'An ownable tone — you’d know this show from a single scene',
            ].map((s, i) => (
              <li key={i} className="flex" style={{ gap: 9, fontSize: 13, color: '#44403C', lineHeight: 1.4 }}>
                <span className="shrink-0" style={{ fontWeight: 800, color: '#059669' }}>+</span>
                {s}
              </li>
            ))}
          </ul>

          {/* Where it needs work */}
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#1C1917', margin: '14px 0 8px' }}>Where it needs work</div>
          <ul className="list-none m-0 p-0 flex flex-col" style={{ gap: 6 }}>
            {[
              'Momentum sags through the midpoint of the pilot',
              'The antagonist’s logic needs sharpening to match the lead',
            ].map((s, i) => (
              <li key={i} className="flex" style={{ gap: 9, fontSize: 13, color: '#44403C', lineHeight: 1.4 }}>
                <span className="shrink-0" style={{ fontWeight: 800, color: '#d97706' }}>–</span>
                {s}
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div
            className="flex justify-between"
            style={{ fontSize: 12.5, color: '#78716C', paddingTop: 14, marginTop: 16, borderTop: '1px solid #f3f4f6' }}
          >
            <span>Format · <b style={{ color: '#1C1917' }}>Series</b></span>
            <span>Budget · <span style={{ color: GOLD, textTransform: 'capitalize', fontWeight: 800 }}>Indie</span> <b style={{ color: '#1C1917' }}>$1.5M–3M / ep</b></span>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 3: FUNDING OPPORTUNITIES (live data) ────────────────────

function OpportunitiesSection({ opportunities }: { opportunities: OpportunityCardProps[] }) {
  if (opportunities.length === 0) return null
  return (
    <SectionWrapper>
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="mb-3.5" style={eyebrowStyle}>Open right now</div>
          <h2 className="m-0" style={h2Style}>Funding opportunities</h2>
        </div>
        <Link
          href="/opportunities"
          className="text-[14px] font-semibold no-underline hover:opacity-80 shrink-0 ml-4"
          style={{ color: '#c4b5fd' }}
          onClick={() => { try { trackEvent('cta_clicked', { location: 'opportunities_v21', label: 'Browse all' }) } catch {} }}
        >
          Browse all →
        </Link>
      </div>

      <div
        className="grid gap-3.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}
      >
        {opportunities.map(opp => (
          <OpportunityCard key={opp.id} {...opp} />
        ))}
      </div>
    </SectionWrapper>
  )
}

// ─── Section 4: FUNDING BAND ─────────────────────────────────────────

function FundingBandSection() {
  return (
    <section
      className="text-center px-5 sm:px-8"
      style={{ padding: '66px 24px', borderTop: DIVIDER, borderBottom: DIVIDER }}
    >
      <div className="mx-auto max-w-5xl">
        <div style={{ fontSize: 'clamp(54px, 11vw, 116px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 1, color: GOLD }}>
          $1,200,000
        </div>
        <div style={{ fontSize: 'clamp(19px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8, color: '#ffffff' }}>
          in funding, across our open opportunities
        </div>
      </div>
    </section>
  )
}

// ─── Section 5: HOW WE WORK ──────────────────────────────────────────

function HowWeWorkSection() {
  return (
    <SectionWrapper center>
      <div className="mb-3.5" style={eyebrowStyle}>How we work</div>
      <h2 className="m-0 mb-4" style={h2Style}>
        Capital and connections,
        <br />
        on your side
      </h2>
      <p className="m-0 mx-auto" style={{ ...leadStyle, maxWidth: 680 }}>
        GEM works with a network of investors, producers, financiers, and partners — a real engine of capital and relationships built to get projects funded and made. When your project&apos;s ready, we put it in front of the people who can write the check.
      </p>
    </SectionWrapper>
  )
}

// ─── Section 6: THE MATH ─────────────────────────────────────────────

function CompareRow({ mark, gold, label, price, priceFree }: { mark: '✕' | '✓'; gold?: boolean; label: string; price: string; priceFree?: boolean }) {
  return (
    <div className="flex items-center" style={{ gap: 10, padding: '9px 0', fontSize: 14.5, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <span style={{ color: gold ? GOLD : '#e87b7b', fontWeight: 800 }}>{mark}</span>
      <span style={{ color: '#ffffff' }}>{label}</span>
      <span className="ml-auto" style={{ color: priceFree ? GOLD : FAINT, fontSize: 13, fontWeight: 600 }}>{price}</span>
    </div>
  )
}

function TheMathSection() {
  return (
    <SectionWrapper>
      <div className="mb-3.5" style={eyebrowStyle}>The math</div>
      <h2 className="m-0" style={h2Style}>
        Everyone else charges.
        <br />
        We don&apos;t.
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {/* Them */}
        <div style={{ borderRadius: 16, padding: '24px 22px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, color: FAINT }}>
            Submit 10 scripts elsewhere
          </div>
          <CompareRow mark="✕" label="Pay per script for coverage" price="~$75 each" />
          <CompareRow mark="✕" label="Pay monthly just to be listed" price="$30/mo+" />
          <CompareRow mark="✕" label="Pay thousands for analysis" price="$495+" />
          <CompareRow mark="✕" label="And it connects to no real money" price="$0 backing" />
          <div style={{ color: FAINT, fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>
            10 scripts on the Black List ≈ <span style={{ color: '#e87b7b', fontWeight: 700 }}>$1,000+</span> &nbsp;·&nbsp; Black List · WeScreenplay · ISA · Slated
          </div>
        </div>

        {/* Us */}
        <div style={{ borderRadius: 16, padding: '24px 22px', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.35)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, color: GOLD }}>
            Develop 10 projects on GEM
          </div>
          <CompareRow mark="✓" gold label="A real read on every one" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Seen by real industry" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Apply for real funding" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Real capital behind the winners" price="Up to $1M" priceFree />
          <div style={{ color: GOLD, fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>
            Everything they charge for, connected to real money. <span style={{ fontWeight: 700 }}>$0.</span>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 7: WHY IT'S FREE ────────────────────────────────────────

function WhyItsFreeSection() {
  return (
    <SectionWrapper>
      <div className="mb-3.5" style={eyebrowStyle}>Why it&apos;s free</div>
      <h2 className="m-0 mb-4" style={h2Style}>
        We&apos;re not coverage
        <br />
        you pay for
      </h2>
      <p className="m-0" style={{ ...leadStyle, maxWidth: 680 }}>
        GEM is a studio built around creators owning their work. Send us what you&apos;ve got — if it&apos;s great, we&apos;ll tell you, and we&apos;ll help get it in front of the people who can make it real. We make our money finding and backing the winners, not charging you to play.
      </p>
    </SectionWrapper>
  )
}

// ─── Section 8: FINAL CTA ────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="px-6" style={{ borderTop: DIVIDER, padding: '78px 24px' }}>
      <div className="max-w-2xl mx-auto text-center">
        <h2
          className="m-0 mb-4.5"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 'clamp(30px, 5vw, 48px)', letterSpacing: '-1px', lineHeight: 1.15, color: '#ffffff', marginBottom: 18 }}
        >
          Your project deserves
          <br />
          to <span style={{ color: GOLD }}>be made.</span>
        </h2>
        <p className="m-0 mx-auto" style={{ ...leadStyle, marginBottom: 30 }}>
          Start developing it with us — completely free.
        </p>
        <Link
          href="/get-started"
          onClick={() => { try { trackEvent('cta_clicked', { location: 'final_cta_v21', label: 'Get started' }) } catch {} }}
          className="inline-block text-white no-underline transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: PURPLE_GRAD, borderRadius: 999, padding: '16px 44px', fontSize: 18, fontWeight: 600, boxShadow: '0 6px 20px rgba(124,58,237,0.30)' }}
        >
          Get started
        </Link>
      </div>
    </section>
  )
}

// ─── Root export ─────────────────────────────────────────────────────

export function LandingPageV21({
  opportunities = [],
  discoverScripts = [],
}: {
  opportunities?: OpportunityCardProps[]
  discoverScripts?: LeaderboardCard[]
}) {
  // discoverScripts intentionally unused — kept in signature for the page's prop wiring.
  void discoverScripts
  return (
    <>
      <HeroSection />
      <TheReadSection />
      <OpportunitiesSection opportunities={opportunities} />
      <FundingBandSection />
      <HowWeWorkSection />
      <TheMathSection />
      <WhyItsFreeSection />
      <FinalCTASection />
    </>
  )
}
