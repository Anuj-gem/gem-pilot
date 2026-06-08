'use client'

// LandingPageV21 — pillar-pattern landing (gem-refresh).
// Sections: Hero → Pillars (The read / Partner with us) → Opportunities (live) → The Math → Straight With You → Final CTA
// Outer page (src/app/page.tsx) provides the #2b1a55 background + Nav.

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'
import { OpportunityCard, type OpportunityCardProps } from '@/components/opportunities/opportunity-card'
import { type LeaderboardCard } from '@/components/discover/leaderboard-cards'

// ─── Shared primitives ───────────────────────────────────────────────

const GOLD = '#D4A843'
const PURPLE_GRAD = 'linear-gradient(135deg, #7c3aed, #a855f7)'
const MUTED = 'rgba(255,255,255,0.62)'
const FAINT = 'rgba(255,255,255,0.42)'
const DIVIDER = '1px solid rgba(255,255,255,0.10)'

function GemDiamond({ size = 11 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0 align-middle"
      style={{ width: size, height: size, transform: 'rotate(45deg)', background: '#7c3aed', borderRadius: 1, display: 'inline-block' }}
    />
  )
}

function SectionWrapper({ children, className = '', center = false }: { children: React.ReactNode; className?: string; center?: boolean }) {
  return (
    <section className={`px-5 sm:px-8 py-14 ${center ? 'text-center' : ''} ${className}`} style={{ borderTop: DIVIDER }}>
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  )
}

const eyebrowStyle: React.CSSProperties = { color: GOLD, fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }
const h2Style: React.CSSProperties = { fontSize: 'clamp(25px, 3.4vw, 38px)', letterSpacing: '-0.8px', fontWeight: 800, lineHeight: 1.12, color: '#ffffff' }
const leadStyle: React.CSSProperties = { fontSize: 17, color: MUTED, lineHeight: 1.6 }

// ─── Section 1: HERO ────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="px-5 sm:px-8 pt-14 sm:pt-20 pb-12 text-center">
      <div className="mx-auto max-w-5xl">
        {/* TODO(hero): placeholder line — finalize wording. */}
        <h1
          className="font-extrabold m-0 mb-5 mx-auto"
          style={{ fontSize: 'clamp(34px, 6vw, 58px)', lineHeight: 1.06, letterSpacing: '-1.5px', color: '#ffffff', maxWidth: 880 }}
        >
          Telling the stories the old world overlooks.
        </h1>

        <p className="m-0 mb-8 mx-auto" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: MUTED, maxWidth: 640, lineHeight: 1.55 }}>
          We come from the creator world. We built GEM — free tools, a community, and a real studio behind it — to help great stories get made.
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
            onClick={() => { try { trackEvent('cta_clicked', { location: 'hero_v21', label: 'Partner with us' }) } catch {} }}
            className="inline-block text-white no-underline transition-all hover:bg-white/10 active:scale-[0.98]"
            style={{ border: '1px solid rgba(255,255,255,0.35)', padding: '15px 34px', borderRadius: 12, fontWeight: 600, fontSize: 17 }}
          >
            Partner with us
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Section 2: PILLARS ─────────────────────────────────────────────

function Pillar({
  eyebrow,
  title,
  body,
  second,
  card,
  textFirst,
}: {
  eyebrow: string
  title: string
  body: string
  second?: string
  card: React.ReactNode
  textFirst: boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div className={textFirst ? 'lg:order-1' : 'lg:order-2'}>
        <div className="mb-3.5" style={eyebrowStyle}>{eyebrow}</div>
        <h2 className="m-0 mb-3" style={{ ...h2Style, fontFamily: 'Georgia, "Times New Roman", serif' }}>{title}</h2>
        <p className="m-0" style={{ ...leadStyle, maxWidth: '52ch' }}>{body}</p>
        {second && <p className="m-0 mt-3" style={{ fontSize: 14.5, fontWeight: 700, color: '#c4b5fd' }}>{second}</p>}
      </div>
      <div className={textFirst ? 'lg:order-2' : 'lg:order-1'}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 22px 50px rgba(0,0,0,0.3)', color: '#1c1917', overflow: 'hidden' }}>
          {card}
        </div>
      </div>
    </div>
  )
}

function PillarsSection() {
  return (
    <SectionWrapper>
      <div className="space-y-16">
        <Pillar
          textFirst
          eyebrow="The read"
          title="Real script coverage and development tools — free."
          body="We built screenplay technology that beats the coverage sites charging you hundreds of dollars: a real read on your script, new drafts, and honest feedback. We give it to you 100% free."
          card={<AnalysisCard />}
        />
        <Pillar
          textFirst={false}
          eyebrow="Partner with us"
          title="When it's ready, apply to partner with GEM."
          body="For the projects we believe in, we go all the way — developing the work with you, putting our reach behind it, and helping get it financed and made. Highly selective, and you always hear back."
          second="Apply free with any script you've scored on GEM."
          card={<PartnerCard />}
        />
      </div>
    </SectionWrapper>
  )
}

// Product card 1 — the GEM-score analysis read
function AnalysisCard() {
  const strengths = [
    'Breakout central character with a real contradiction at the core',
    'The hook lands inside the first ten pages and keeps pulling',
    'An ownable tone — you’d know this show from a single scene',
  ]
  const needs = [
    'Momentum sags through the midpoint of the pilot',
    'The antagonist’s logic needs sharpening to match the lead',
  ]
  return (
    <div style={{ padding: '24px 26px' }}>
      <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 26, fontWeight: 800, marginBottom: 3, color: '#1c1917' }}>Nightfall</h3>
      <div style={{ fontSize: 13, color: '#9b958c', marginBottom: 18 }}>Series · Thriller · Drama</div>

      <div style={{ background: '#f3f0fb', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
        <div className="flex items-center" style={{ gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#7c3aed', marginBottom: 6 }}>
          <GemDiamond size={11} /> GEM Score
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>
          88<span style={{ fontSize: 18, color: '#a9a2c0', fontWeight: 600 }}> / 100</span>
        </div>
        <div style={{ height: 9, background: '#e2dcf3', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
          <div style={{ height: 9, width: '88%', background: '#7c3aed', borderRadius: 99 }} />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#1c1917', margin: '14px 0 8px' }}>Strengths</div>
      {strengths.map((s) => (
        <div key={s} className="flex" style={{ gap: 9, fontSize: 14, color: '#44403c', padding: '3px 0' }}>
          <span style={{ color: '#16a34a', fontWeight: 800 }}>+</span> {s}
        </div>
      ))}

      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#1c1917', margin: '14px 0 8px' }}>Where it needs work</div>
      {needs.map((s) => (
        <div key={s} className="flex" style={{ gap: 9, fontSize: 14, color: '#44403c', padding: '3px 0' }}>
          <span style={{ color: '#d97706', fontWeight: 800 }}>−</span> {s}
        </div>
      ))}

      <div className="flex justify-between" style={{ borderTop: '1px solid #eee', marginTop: 16, paddingTop: 14, fontSize: 13, color: '#78716c' }}>
        <span>Format · <b style={{ color: '#1c1917' }}>Series</b></span>
        <span>Budget · <span style={{ color: GOLD, fontWeight: 700 }}>Indie</span> <b style={{ color: '#1c1917' }}>$1.5M–3M / ep</b></span>
      </div>
    </div>
  )
}

function OfferRow({ icon, title, body, social, last }: { icon: string; title: string; body: string; social?: boolean; last?: boolean }) {
  return (
    <div className="flex" style={{ gap: 14, alignItems: 'flex-start', padding: '16px 6px', borderBottom: last ? 'none' : '1px solid #f0ece4' }}>
      <div className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: '#f0edfb', fontSize: 20 }}>{icon}</div>
      <div>
        <h4 style={{ fontSize: 15, fontWeight: 800, color: '#1c1917', marginBottom: 3 }}>{title}</h4>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: '#57534e' }}>{body}</p>
        {social && (
          <div className="flex items-center" style={{ gap: 9, marginTop: 7, color: '#7c3aed' }}>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor" aria-hidden="true"><path d="M16.5 3c.32 2.02 1.6 3.62 3.5 3.9v2.43c-1.27 0-2.46-.4-3.5-1.06v6.36c0 3.18-2.58 5.77-5.77 5.77S4.96 17.81 4.96 14.63 7.55 8.86 10.73 8.86c.31 0 .61.02.91.07v2.52a3.25 3.25 0 1 0 2.34 3.12V3h2.52z" /></svg>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" /></svg>
          </div>
        )}
      </div>
    </div>
  )
}

// Product card 2 — the partnership offer (icon rows)
function PartnerCard() {
  return (
    <div style={{ padding: '14px 18px' }}>
      <OfferRow icon="✦" title="Develop it with you" body="We craft and position your project with our technology — optimizing it for a real production while keeping your vision." />
      <OfferRow icon="📣" title="Market it with our reach" body="We leverage our 350K+ following and our partners to test concepts, build proof of concept, and market it as we go." social />
      <OfferRow icon="🎬" title="Help get it made" body="We invest what we can and tap our network to help you secure financing and the partners to get it made and sold." last />
    </div>
  )
}

// ─── Section 3: FUNDING OPPORTUNITIES (live data) ────────────────────

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
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {opportunities.map(opp => (
          <OpportunityCard key={opp.id} {...opp} />
        ))}
      </div>
    </SectionWrapper>
  )
}

// ─── Section 4: THE MATH ─────────────────────────────────────────────

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
        Everyone charges for this.
        <br />
        We don&apos;t.
      </h2>
      <p className="m-0 mt-3" style={{ ...leadStyle, maxWidth: 620 }}>
        Coverage, analysis, getting listed — writers pay hundreds for it elsewhere. On GEM the tools are free.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div style={{ borderRadius: 16, padding: '24px 22px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, color: FAINT }}>Elsewhere</div>
          <CompareRow mark="✕" label="Script coverage" price="~$75 each" />
          <CompareRow mark="✕" label="Get listed" price="$30/mo+" />
          <CompareRow mark="✕" label="A deep analysis" price="$495+" />
          <div style={{ color: FAINT, fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>Black List · WeScreenplay · ISA · Coverfly</div>
        </div>

        <div style={{ borderRadius: 16, padding: '24px 22px', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.35)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, color: GOLD }}>On GEM</div>
          <CompareRow mark="✓" gold label="A real read on every script" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Drafts & feedback" price="Free" priceFree />
          <CompareRow mark="✓" gold label="Show it on Discover" price="Free" priceFree />
          <div style={{ color: GOLD, fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>Everything they charge hundreds for — free.</div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section 5: STRAIGHT WITH YOU ────────────────────────────────────

function StraightWithYouSection() {
  return (
    <SectionWrapper center>
      <div className="mb-3.5" style={eyebrowStyle}>Straight with you</div>
      <h2 className="m-0 mb-4 mx-auto" style={h2Style}>We&apos;re not selling you anything.</h2>
      <p className="m-0 mx-auto" style={{ ...leadStyle, maxWidth: 680 }}>
        The tools are free — our way of supporting writers and finding people we want to work with. We only ever make money if we partner to actually produce your project, case by case, only when we both believe in it. That&apos;s it.
      </p>
    </SectionWrapper>
  )
}

// ─── Section 6: FINAL CTA ────────────────────────────────────────────

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
      <PillarsSection />
      <OpportunitiesSection opportunities={opportunities} />
      <TheMathSection />
      <StraightWithYouSection />
      <FinalCTASection />
    </>
  )
}
