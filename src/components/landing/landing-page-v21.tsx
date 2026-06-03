'use client'

// LandingPageV21 — complete landing page body (v21, 2026-06-03).
// Sections: Hero → Position → Build Team → Find Funding → Network → Opportunities → Discover → Pro + Final CTA

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'
import { OpportunityCard, type OpportunityCardProps } from '@/components/opportunities/opportunity-card'
import { DiscoverTile, type LeaderboardCard } from '@/components/discover/leaderboard-cards'

// ─── Shared primitives ───────────────────────────────────────────────

const GOLD = '#D4A843'
const PURPLE = '#534AB7'
const PURPLE_GRAD = 'linear-gradient(135deg, #7c3aed, #a855f7)'
const GREEN = '#0F6E56'
const GREEN_BG = '#ecfdf5'
const GREEN_TEXT = '#059669'
const MUTED = 'rgba(255,255,255,0.6)'
const VERY_MUTED = 'rgba(255,255,255,0.45)'
const DIVIDER = '1px solid rgba(255,255,255,0.08)'

function GemDiamond({ size = 10 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0"
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

function SectionWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`px-5 sm:px-8 py-16 sm:py-20 ${className}`}
      style={{ borderTop: DIVIDER }}
    >
      <div className="mx-auto max-w-5xl">
        {children}
      </div>
    </section>
  )
}

// ─── Section 1: HERO ────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-5 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16">
      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
        {/* Left — text */}
        <div className="text-center md:text-left">
          <h1
            className="font-bold leading-[1.08] tracking-tight m-0 mb-4"
            style={{ fontSize: 'clamp(30px, 5vw, 48px)', color: '#ffffff' }}
          >
            Where screenwriters{' '}
            <span style={{ color: GOLD }}>develop</span>{' '}
            their projects
          </h1>
          <p
            className="text-[15px] sm:text-[16px] m-0 mb-8 max-w-md mx-auto md:mx-0 leading-relaxed"
            style={{ color: MUTED }}
          >
            GEM helps creators break through the traditional barriers of Hollywood — connect with collaborators, find funding, and take your project into your own hands.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link
              href="/get-started"
              onClick={() => { try { trackEvent('cta_clicked', { location: 'hero_v21', label: 'Create your project' }) } catch {} }}
              className="inline-block px-8 py-3.5 rounded-xl text-[15px] font-semibold text-white no-underline transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: PURPLE_GRAD, boxShadow: '0 6px 20px rgba(124,58,237,0.30)' }}
            >
              Create your project
            </Link>
            <Link
              href="/opportunities"
              onClick={() => { try { trackEvent('cta_clicked', { location: 'hero_v21', label: 'Browse opportunities' }) } catch {} }}
              className="inline-block px-8 py-3.5 rounded-xl text-[15px] font-semibold text-white no-underline transition-all hover:bg-white/10 active:scale-[0.98]"
              style={{ border: '1px solid rgba(255,255,255,0.35)' }}
            >
              Browse opportunities
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex gap-8 justify-center md:justify-start">
              {[
                { num: '147', label: 'Projects in development' },
                { num: '$1.2M', label: 'Funding available' },
                { num: '412', label: 'GEM users' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[20px] font-bold" style={{ color: GOLD }}>{s.num}</div>
                  <div className="text-[11px]" style={{ color: VERY_MUTED }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — project card */}
        <div
          className="max-w-[400px] mx-auto md:mx-0 w-full rounded-2xl overflow-hidden text-left"
          style={{ background: '#ffffff', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
        >
          {/* Status banner */}
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: GREEN_BG, borderBottom: '1px solid #d1fae5' }}>
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#34d399' }} />
            <span className="text-[11px] font-bold tracking-wide" style={{ color: GREEN_TEXT }}>IN PRODUCTION</span>
          </div>

          <div className="px-5 pt-4 pb-5">
            {/* Writer */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0" style={{ background: '#8b5cf6' }}>
                <span className="text-[9px] font-bold text-white">AK</span>
              </div>
              <div>
                <div className="text-[12px] font-semibold" style={{ color: '#111827' }}>Alex Kim</div>
                <div className="text-[11px]" style={{ color: '#9ca3af' }}>Screenwriter</div>
              </div>
            </div>

            {/* Title + format */}
            <div className="mb-1">
              <p className="text-[20px] font-bold m-0" style={{ color: '#111827', fontFamily: 'Georgia, serif' }}>Nightfall</p>
            </div>
            <p className="text-[12px] m-0 mb-4" style={{ color: '#9ca3af' }}>Series · Drama · Thriller</p>

            {/* Funding bar */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: '#f0fdf4' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold" style={{ color: '#15803d' }}>Funding</span>
                <span className="text-[12px] font-bold" style={{ color: '#15803d' }}>$3M · 100%</span>
              </div>
              <div className="h-[5px] w-full rounded-full" style={{ background: '#dcfce7' }}>
                <div className="h-[5px] rounded-full" style={{ background: '#22c55e', width: '100%' }} />
              </div>
            </div>

            {/* Crew */}
            <div className="text-[11px] font-bold mb-2 uppercase tracking-wide" style={{ color: '#6b7280' }}>Crew</div>
            <div className="flex flex-col gap-2">
              {[
                { initials: 'MP', color: '#10b981', name: 'Meridian Pictures', role: 'Producer' },
                { initials: 'KP', color: '#ec4899', name: 'Kate Park', role: 'Director' },
                { initials: 'JM', color: '#38bdf8', name: 'James Moto', role: 'Actor' },
              ].map(c => (
                <div key={c.name} className="flex items-center gap-2">
                  <div
                    className="w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0"
                    style={{ background: c.color }}
                  >
                    <span className="text-[8px] font-extrabold text-white">{c.initials}</span>
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: '#374151' }}>{c.name}</span>
                  <span className="text-[11px]" style={{ color: '#9ca3af' }}>{c.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Section 2: POSITION YOUR PROJECT ───────────────────────────────

function PositionSection() {
  return (
    <SectionWrapper>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* Left — card mockup */}
        <div
          className="max-w-[380px] mx-auto md:mx-0 w-full rounded-2xl overflow-hidden"
          style={{ background: '#ffffff', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
        >
          <div className="px-5 pt-5 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>The Pitch</div>
            <p className="text-[13px] leading-relaxed m-0 mb-4" style={{ color: '#374151' }}>
              A young detective uncovers a pattern connecting disappearances across three decades — only to realize her own family is at the center of it.
            </p>

            {/* Media strip */}
            <div className="flex gap-2 mb-4">
              {[false, true, false].map((hasPlay, i) => (
                <div
                  key={i}
                  className="flex-1 h-[52px] rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{ background: '#e5e7eb' }}
                >
                  {hasPlay && (
                    <div
                      className="w-[20px] h-[20px] rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderTop: '5px solid transparent',
                          borderBottom: '5px solid transparent',
                          borderLeft: '8px solid white',
                          marginLeft: 1,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* GEM Evaluation row */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: '#F5F3FF' }}>
              <GemDiamond size={14} />
              <span className="text-[12px] font-semibold" style={{ color: '#7c3aed' }}>GEM Evaluation</span>
              <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* Budget */}
          <div className="px-5 py-3" style={{ borderTop: '1px solid #f3f4f6' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: '#9ca3af' }}>Budget estimate</span>
              <span className="text-[13px] font-bold" style={{ color: '#374151' }}>$3M–$6M/ep</span>
            </div>
          </div>
        </div>

        {/* Right — copy */}
        <div>
          <h2
            className="font-bold leading-[1.15] tracking-tight m-0 mb-4"
            style={{ fontSize: 'clamp(26px, 4vw, 36px)', color: '#ffffff' }}
          >
            <span style={{ color: GOLD }}>Position</span> your project
          </h2>
          <p className="text-[15px] leading-relaxed m-0 mb-4" style={{ color: MUTED }}>
            Turn your script into a serious project plan. GEM helps you set your budget, map out revenue, craft your pitch, and add media — all in one place. Our technology fills in the details so you can focus on the vision.
          </p>
          <p className="text-[15px] leading-relaxed m-0 mb-4" style={{ color: MUTED }}>
            Every project also gets an objective GEM evaluation that analyzes your story and helps you refine it — think of it as a second set of eyes on your script.
          </p>
          <p className="text-[15px] leading-relaxed m-0" style={{ color: MUTED }}>
            List your project on Discover so writers, investors, and collaborators can find you.
          </p>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 3: BUILD YOUR TEAM ─────────────────────────────────────

function BuildTeamSection() {
  return (
    <SectionWrapper>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* Left — copy */}
        <div>
          <h2
            className="font-bold leading-[1.15] tracking-tight m-0 mb-4"
            style={{ fontSize: 'clamp(26px, 4vw, 36px)', color: '#ffffff' }}
          >
            Build your <span style={{ color: GOLD }}>team</span>
          </h2>
          <p className="text-[15px] leading-relaxed m-0 mb-4" style={{ color: MUTED }}>
            Invite producers, directors, actors, and reps directly to your project. They see the script, the plan, and their role — and can accept right from the page.
          </p>
          <p className="text-[15px] leading-relaxed m-0" style={{ color: MUTED }}>
            Other GEM users can discover your project and reach out to collaborate. Your project page is how people find you.
          </p>
        </div>

        {/* Right — card mockup */}
        <div
          className="max-w-[380px] mx-auto md:mx-0 w-full rounded-2xl overflow-hidden"
          style={{ background: '#ffffff', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
        >
          <div className="px-5 pt-5 pb-5">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>Crew</div>
            <div className="flex flex-col gap-3">
              {[
                { initials: 'MP', color: '#10b981', name: 'Meridian Pictures', role: 'Producer', joined: true },
                { initials: 'KP', color: '#ec4899', name: 'Kate Park', role: 'Director', joined: true },
                { initials: 'JM', color: '#38bdf8', name: 'James Moto', role: 'Actor', joined: true },
              ].map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <div
                    className="w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0"
                    style={{ background: c.color }}
                  >
                    <span className="text-[9px] font-extrabold text-white">{c.initials}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: '#111827' }}>{c.name}</div>
                    <div className="text-[11px]" style={{ color: '#9ca3af' }}>{c.role}</div>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#f0fdf4', color: '#15803d' }}
                  >
                    Joined
                  </span>
                </div>
              ))}

              {/* Open role */}
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ border: '1.5px dashed #d1d5db' }}
              >
                <div
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#f3f4f6' }}
                >
                  <span className="text-[14px]" style={{ color: '#9ca3af' }}>+</span>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold" style={{ color: '#6b7280' }}>Talent Rep</div>
                  <div className="text-[11px]" style={{ color: '#9ca3af' }}>Open role · Invite someone</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 4: FIND FUNDING ─────────────────────────────────────────

function FindFundingSection() {
  return (
    <SectionWrapper>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* Left — card mockup */}
        <div
          className="max-w-[380px] mx-auto md:mx-0 w-full rounded-2xl overflow-hidden"
          style={{ background: '#ffffff', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
        >
          <div className="px-5 pt-5 pb-5">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>Funding</div>

            {/* Big amount */}
            <div className="mb-1">
              <span className="text-[32px] font-extrabold" style={{ color: '#15803d' }}>$2.1M</span>
              <span className="text-[14px] ml-2" style={{ color: '#9ca3af' }}>of $3M</span>
            </div>

            {/* Progress bar */}
            <div className="h-[6px] w-full rounded-full mb-4" style={{ background: '#dcfce7' }}>
              <div className="h-[6px] rounded-full" style={{ background: '#22c55e', width: '70%' }} />
            </div>

            {/* Backers */}
            <div className="flex flex-col gap-3 mb-4">
              {[
                { initials: 'FG', color: '#6366f1', name: 'Forge Capital', amount: '$1.2M' },
                { initials: 'VM', color: '#f59e0b', name: 'Vertex Media', amount: '$900K' },
              ].map(b => (
                <div key={b.name} className="flex items-center gap-3">
                  <div
                    className="w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0"
                    style={{ background: b.color }}
                  >
                    <span className="text-[9px] font-extrabold text-white">{b.initials}</span>
                  </div>
                  <span className="text-[13px] font-medium flex-1" style={{ color: '#374151' }}>{b.name}</span>
                  <span className="text-[13px] font-bold" style={{ color: '#15803d' }}>{b.amount}</span>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
              <span className="text-[11px]" style={{ color: '#9ca3af' }}>Status: </span>
              <span className="text-[11px] font-semibold" style={{ color: '#7c3aed' }}>Following</span>
            </div>
          </div>
        </div>

        {/* Right — copy */}
        <div>
          <h2
            className="font-bold leading-[1.15] tracking-tight m-0 mb-4"
            style={{ fontSize: 'clamp(26px, 4vw, 36px)', color: '#ffffff' }}
          >
            Find <span style={{ color: GOLD }}>funding</span>
          </h2>
          <p className="text-[15px] leading-relaxed m-0 mb-4" style={{ color: MUTED }}>
            GEM has assembled a network of producers, financiers, and partners who are actively looking for projects to fund. Apply directly, get real feedback, and track who&apos;s interested.
          </p>
          <p className="text-[15px] leading-relaxed m-0" style={{ color: MUTED }}>
            Bring your own backers too — anyone can contribute to your funding goal. Your project page tracks it all in one place.
          </p>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 5: THE GEM NETWORK ─────────────────────────────────────

const NETWORK_COMPANIES = [
  'Meridian Pictures',
  'Park Ave Films',
  'GSK Talent',
  'Forge Capital',
  'Vertex Media',
]

function NetworkSection() {
  return (
    <SectionWrapper>
      <div className="text-center max-w-xl mx-auto">
        <h2
          className="font-bold leading-[1.15] tracking-tight m-0 mb-4"
          style={{ fontSize: 'clamp(26px, 4vw, 36px)', color: '#ffffff' }}
        >
          GEM <span style={{ color: GOLD }}>Partners</span>
        </h2>
        <p className="text-[15px] m-0 mb-4" style={{ color: MUTED }}>
          We&apos;re assembling a network of partners who are looking to support creators with funding and resources to make their projects a reality — not just from Hollywood, but from all industries. People committed to the next generation of independent creators.
        </p>
        <p className="text-[13px] m-0" style={{ color: VERY_MUTED }}>
          Our focus right now is funding, with more ways to support creators coming soon.
        </p>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 6: OPEN FUNDING OPPORTUNITIES ───────────────────────────

function OpportunitiesSection({ opportunities }: { opportunities: OpportunityCardProps[] }) {
  if (opportunities.length === 0) return null
  return (
    <SectionWrapper>
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-8">
        <h2
          className="font-bold leading-[1.15] tracking-tight m-0"
          style={{ fontSize: 'clamp(24px, 4vw, 34px)', color: '#ffffff' }}
        >
          Open funding <span style={{ color: GOLD }}>opportunities</span>
        </h2>
        <Link
          href="/opportunities"
          className="text-[13px] font-semibold no-underline hover:opacity-80 shrink-0 ml-4"
          style={{ color: '#c4b5fd' }}
          onClick={() => { try { trackEvent('cta_clicked', { location: 'opportunities_v21', label: 'View all' }) } catch {} }}
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {opportunities.map(opp => (
          <OpportunityCard key={opp.id} {...opp} />
        ))}
      </div>
    </SectionWrapper>
  )
}

// ─── Section 7: DISCOVER PROJECTS ────────────────────────────────────

function DiscoverSection({ discoverScripts }: { discoverScripts: LeaderboardCard[] }) {
  if (discoverScripts.length === 0) return null
  return (
    <SectionWrapper>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-3">
        <div>
          <h2
            className="font-bold leading-[1.15] tracking-tight m-0"
            style={{ fontSize: 'clamp(24px, 4vw, 34px)', color: '#ffffff' }}
          >
            Discover <span style={{ color: GOLD }}>projects</span>
          </h2>
          <p className="text-[14px] mt-2 m-0" style={{ color: MUTED }}>
            See what other writers are building on GEM
          </p>
        </div>
        <Link
          href="/discover"
          className="text-[13px] font-semibold no-underline hover:opacity-80 shrink-0"
          style={{ color: '#c4b5fd' }}
          onClick={() => { try { trackEvent('cta_clicked', { location: 'discover_v21', label: 'Explore Discover' }) } catch {} }}
        >
          Explore Discover →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        {discoverScripts.map(card => (
          <DiscoverTile key={card.submissionId} card={card} />
        ))}
      </div>
    </SectionWrapper>
  )
}

// ─── Section 8: GEM PRO + FINAL CTA ─────────────────────────────────

const PRO_FEATURES = [
  'Unlimited projects and evaluations',
  'Apply to all funding opportunities',
  'Full project workspace with media',
  'Invite unlimited collaborators',
  'Direct feedback from industry partners',
]

function ProAndFinalCTASection() {
  return (
    <>
      {/* GEM Pro */}
      <SectionWrapper>
        <div className="mx-auto text-center" style={{ maxWidth: 540 }}>
          {/* Pro badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <GemDiamond size={12} />
            <span className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>GEM Pro</span>
          </div>

          <h2
            className="font-bold leading-[1.15] tracking-tight m-0 mb-3"
            style={{ fontSize: 'clamp(26px, 4vw, 38px)', color: '#ffffff' }}
          >
            Unlimited access for{' '}
            <span style={{ color: GOLD }}>$20/month</span>
          </h2>
          <p className="text-[15px] m-0 mb-8" style={{ color: MUTED }}>
            Start with a free trial. Cancel anytime.
          </p>

          {/* Feature list */}
          <div
            className="rounded-2xl p-6 text-left mb-7"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.12)',
            }}
          >
            <ul className="list-none m-0 p-0 flex flex-col gap-3">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3">
                  <span className="text-[15px] font-bold shrink-0" style={{ color: '#4ade80' }}>✓</span>
                  <span className="text-[14px]" style={{ color: 'rgba(255,255,255,0.8)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/get-started"
            className="inline-block rounded-xl px-10 py-3.5 text-[15px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.985] no-underline"
            style={{ background: PURPLE_GRAD, boxShadow: '0 6px 20px rgba(124,58,237,0.30)' }}
            onClick={() => { try { trackEvent('cta_clicked', { location: 'pro_section_v21', label: 'Start free trial' }) } catch {} }}
          >
            Start free trial
          </Link>
        </div>
      </SectionWrapper>

      {/* Final CTA */}
      <section
        className="px-6"
        style={{ borderTop: DIVIDER, padding: '80px 24px' }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="font-bold tracking-tight leading-[1.15] m-0 mb-4"
            style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 4.5vw, 36px)', color: '#ffffff' }}
          >
            Your script deserves to{' '}
            <span style={{ color: GOLD }}>be made.</span>
          </h2>
          <p className="text-[16px] m-0 mb-8" style={{ color: MUTED }}>
            Create your project today. It&apos;s free to start.
          </p>
          <Link
            href="/get-started"
            className="inline-block rounded-full px-12 py-4 text-[17px] font-semibold text-white transition-all hover:scale-105 active:scale-[0.98] no-underline"
            style={{ background: PURPLE_GRAD, boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}
            onClick={() => { try { trackEvent('cta_clicked', { location: 'final_cta_v21', label: 'Create your project' }) } catch {} }}
          >
            Create your project
          </Link>
        </div>
      </section>
    </>
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
  return (
    <>
      <HeroSection />
      <PositionSection />
      <BuildTeamSection />
      <FindFundingSection />
      <NetworkSection />
      <OpportunitiesSection opportunities={opportunities} />
      <DiscoverSection discoverScripts={discoverScripts} />
      <ProAndFinalCTASection />
    </>
  )
}
