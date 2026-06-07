'use client'

// LandingPageV21 — mission-first landing (gem-refresh).
// Sections: Hero → Who We Are → What We Do → Funding Opportunities (live) → The Math → Straight With You → Final CTA
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
          We&apos;re creators who love great stories. We built GEM to find the next great filmmakers and help get their work made — and it&apos;s free for everyone.
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
            Browse opportunities
          </Link>
        </div>

        <div className="mt-[18px]" style={{ color: FAINT, fontSize: 14, fontWeight: 500, letterSpacing: '0.3px' }}>
          No subscription. No fees. No gatekeepers.
        </div>
      </div>
    </section>
  )
}

// ─── Section 2: WHO WE ARE ──────────────────────────────────────────

function WhoWeAreSection() {
  return (
    <SectionWrapper>
      <div className="mb-3.5" style={eyebrowStyle}>Who we are</div>
      <h2 className="m-0 mb-4" style={h2Style}>We come from the creator world</h2>
      <p className="m-0 mb-4" style={{ ...leadStyle, maxWidth: 720 }}>
        We&apos;re creators ourselves — we&apos;ve spent years making entertainment and building our social channels, and we love this stuff. We built GEM as a resource for writers and for filmmakers far more talented than us: a way to use our reach, our tools, and what we&apos;ve learned to help the next generation of filmmakers get their work made.
      </p>
      <p className="m-0" style={{ ...leadStyle, maxWidth: 720 }}>
        <a href="https://www.tiktok.com/@YOUR_TIKTOK" style={{ color: '#c4b5fd', fontWeight: 600 }}>TikTok</a>
        {' · '}
        <a href="https://www.instagram.com/YOUR_INSTAGRAM" style={{ color: '#c4b5fd', fontWeight: 600 }}>Instagram</a>
        {' · '}
        <span style={{ color: GOLD, fontWeight: 600 }}>500K+ followers · nearly a billion views</span>
      </p>
    </SectionWrapper>
  )
}

// ─── Section 3: WHAT WE DO ──────────────────────────────────────────

function WhatWeDoCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '24px 22px' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <GemDiamond size={10} />
        <span style={{ fontSize: 17, fontWeight: 700, color: '#ffffff' }}>{title}</span>
      </div>
      <p className="m-0" style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55 }}>{body}</p>
    </div>
  )
}

function WhatWeDoSection() {
  return (
    <SectionWrapper>
      <div className="mb-3.5" style={eyebrowStyle}>Here&apos;s what we do</div>
      <h2 className="m-0 mb-2" style={h2Style}>Everything we offer, free</h2>
      <p className="m-0 mb-8" style={{ ...leadStyle, maxWidth: 680 }}>
        Use as much or as little as you want. No subscription, no catch.
      </p>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <WhatWeDoCard
          title="Free screenplay analysis"
          body="Upload your script and get a real read — a GEM score and a breakdown of what's working and what's not, built on our own in-house technology and a ton of research on what actually gets made."
        />
        <WhatWeDoCard
          title="Perks & discounts"
          body="We've aggregated discounts and benefits from tools and partners across the industry — yours to use as a GEM creator, at no cost."
        />
        <WhatWeDoCard
          title="Get featured on our channels"
          body="Apply to have your work shared to our audience, with full credit. Free exposure for you — and it helps us see what lands before anything goes further."
        />
        <WhatWeDoCard
          title="Help getting it made"
          body="We connect you to our network of partners to raise financing. And in select cases — when the work is excellent and you've shown real proof of concept — we'll back development and production ourselves, and bring the talent, distribution, and every other piece it takes to get made."
        />
      </div>
    </SectionWrapper>
  )
}

// ─── Section 4: FUNDING OPPORTUNITIES (live data) ────────────────────

function OpportunitiesSection({ opportunities }: { opportunities: OpportunityCardProps[] }) {
  if (opportunities.length === 0) return null
  return (
    <SectionWrapper>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="mb-3.5" style={eyebrowStyle}>Open right now</div>
          <h2 className="m-0" style={h2Style}>Opportunities</h2>
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

// ─── Section 5: THE MATH ─────────────────────────────────────────────

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

        <div style={{ borderRadius: 16, padding: '24px 22px', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.35)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, color: GOLD }}>
            Develop 10 projects on GEM
          </div>
          <CompareRow mark="✓" gold label="A real read on every one" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Featured to our audience" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Perks &amp; discounts" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Real backing when we partner" price="Free" priceFree />
          <div style={{ color: GOLD, fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>
            Everything they charge for, and a real company in your corner. <span style={{ fontWeight: 700 }}>$0.</span>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 6: STRAIGHT WITH YOU ────────────────────────────────────

function StraightWithYouSection() {
  return (
    <SectionWrapper>
      <div className="mb-3.5" style={eyebrowStyle}>Straight with you</div>
      <h2 className="m-0 mb-4" style={h2Style}>
        We&apos;re not here
        <br />
        to sell you anything
      </h2>
      <p className="m-0" style={{ ...leadStyle, maxWidth: 720 }}>
        Other places charge you hundreds for coverage and do nothing with it. We won&apos;t promise you a deal — honestly, most people won&apos;t qualify for the production help, and we&apos;ll tell you straight. But everything else is free: the read, the perks, the exposure. The only way we ever make money from you is if we partner to produce your work — case by case, only when we both believe in it. That&apos;s it. You&apos;ve got a company in your corner, not one trying to squeeze you.
      </p>
    </SectionWrapper>
  )
}

// ─── Section 7: FINAL CTA ────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="px-6" style={{ borderTop: DIVIDER, padding: '78px 24px' }}>
      <div className="max-w-2xl mx-auto text-center">
        <h2
          className="m-0"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 'clamp(30px, 5vw, 48px)', letterSpacing: '-1px', lineHeight: 1.15, color: '#ffffff', marginBottom: 18 }}
        >
          Your project deserves
          <br />
          to <span style={{ color: GOLD }}>be made.</span>
        </h2>
        <p className="m-0 mx-auto" style={{ ...leadStyle, marginBottom: 30 }}>
          Start with us — completely free.
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
      <WhoWeAreSection />
      <WhatWeDoSection />
      <OpportunitiesSection opportunities={opportunities} />
      <TheMathSection />
      <StraightWithYouSection />
      <FinalCTASection />
    </>
  )
}
