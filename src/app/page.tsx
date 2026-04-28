// Landing page — v13 (2026-04-28).
//
// Structure (per Anuj's rebuild brief):
//   1. Hero — "We connect promising writers to the industry." Single
//      column, upload widget primary CTA. No outdated right-side card.
//   2. How GEM works / Selznick — pitches the engine; 3-step Upload →
//      Selznick → Match. Tech-led so the product feels heavy.
//   3. For Industry Partners — separate signup CTA; producers, dev
//      execs, lit reps; their own line straight to /signup.
//   4. GEM Pro — single pricing card.
//   5. Features deep-dive — multiple feature blocks paired with mock
//      product UI cards (the report top card, cast/packaging,
//      industry-matching dashboard) so the page LOOKS like the product.
//   6. Final CTA.
//
// Hero-upload handoff unchanged: LandingHero stashes the picked PDF via
// setPendingFile() and routes to /submit?from=hero.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Upload, Sparkles, Users, Eye, Mail, CheckCircle, Activity } from 'lucide-react'
import { LandingTracking } from '@/components/landing-tracking'
import { TrackedCTA } from '@/components/tracked-cta'
import { MobileNav } from '@/components/mobile-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { createClient } from '@/lib/supabase-server'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  // OAuth safety net — forward dangling ?code= to /auth/callback.
  const sp = await searchParams
  if (sp.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}&next=/submit`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      <LandingTracking />

      {/* Nav — fixed (not sticky) because layout.tsx's overflow-x-hidden
          wrapper breaks sticky containing-block. Spacer below reserves the
          slot so the hero starts below the nav. */}
      <div className="h-14 sm:h-16" aria-hidden />
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167,139,250,0.5)',
              }}
            />
            <span className="text-lg sm:text-xl font-bold tracking-tight">GEM</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/writers"
              className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] transition-colors"
            >
              Writers
            </Link>
            <Link
              href="/industry"
              className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] transition-colors"
            >
              Industry
            </Link>
            <Link
              href="/selznick"
              className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] transition-colors"
            >
              Selznick
            </Link>
            <Link
              href="/login"
              className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] transition-colors"
            >
              Log in
            </Link>
            <TrackedCTA
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'nav', label: 'Sign Up' }}
              className="text-sm px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Sign Up
            </TrackedCTA>
          </div>
          <MobileNav />
        </div>
      </nav>

      {/* HERO (client) — single column, upload-first */}
      <LandingHero />

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* HOW IT WORKS / SELZNICK — pitches the engine. Three numbered
          steps so the path is obvious; Selznick brain panel anchors the
          tech credibility. */}
      <section
        className="px-4 sm:px-6 py-16 sm:py-20"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 65%), var(--gem-black)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-12 sm:mb-14">
            <p
              className="text-[11px] uppercase tracking-[0.32em] font-semibold m-0 mb-3"
              style={{ color: 'var(--gem-gold)' }}
            >
              How GEM works
            </p>
            <h2
              className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Selznick reads every script the way a producer would.
            </h2>
            <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.6] m-0">
              Trained on the signals that decide what gets made — narrative,
              characters, packaging, production reality. A structured report
              comes back in under sixty seconds. Strong scripts move forward
              into industry matching automatically.
            </p>
          </div>

          {/* Three-step strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-12">
            <StepCard
              n="01"
              icon={<Upload size={18} />}
              title="Upload your screenplay"
              body="PDF only. Final Draft, WriterSolo, Highland — they all export. Sixty seconds from drag to result."
            />
            <StepCard
              n="02"
              icon={<Sparkles size={18} />}
              title="Selznick reads it end-to-end"
              body="Every dimension — story, character, audience, packaging, production — scored against what wins greenlights."
            />
            <StepCard
              n="03"
              icon={<Users size={18} />}
              title="Industry partners reach out"
              body="If your script qualifies, producers and reps in your lane see it on their dashboard and contact you directly."
            />
          </div>

          <div className="text-center">
            <Link
              href="/selznick"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--gem-accent)] hover:text-[var(--gem-gray-50)] transition-colors"
            >
              How Selznick reads scripts, in detail
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* FOR INDUSTRY PARTNERS — own section with own signup CTA. Anuj
          2026-04-28: rather than a tiny apply-via-mailto link we give
          this audience real estate so they can opt in directly. */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-10 md:gap-14 items-center">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.32em] font-semibold m-0 mb-3"
                style={{ color: '#16a34a' }}
              >
                For industry partners
              </p>
              <h2
                className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-[1.15] m-0 mb-4"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Find your next project,
                <br className="hidden sm:block" /> without the inbox.
              </h2>
              <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.6] m-0 mb-6">
                Producers, development executives, literary agents, and
                managers use GEM to scout pre-read scripts in their lane —
                with full reports already in hand.
              </p>
              <ul className="list-none p-0 m-0 mb-7 space-y-2.5">
                <IndustryFeature text="Lane-matched feed of qualified scripts" />
                <IndustryFeature text="Full producer-grade report on every project" />
                <IndustryFeature text="Direct line to the writer when something fits" />
                <IndustryFeature text="No inbound submissions to triage" />
              </ul>
              <TrackedCTA
                href="/signup"
                event="cta_clicked"
                properties={{ location: 'industry_section', label: 'Apply for industry access' }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
                style={{
                  background: '#16a34a',
                  boxShadow: '0 6px 18px rgba(22,163,74,0.22)',
                }}
              >
                Apply for industry access
                <ArrowRight size={15} />
              </TrackedCTA>
            </div>
            <IndustryDashboardMock />
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* GEM PRO PRICING */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p
              className="text-[11px] uppercase font-semibold mb-3"
              style={{ letterSpacing: '0.32em', color: 'var(--gem-gold)' }}
            >
              Pricing
            </p>
            <h2
              className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-[1.15] m-0 mb-3"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              GEM Pro is $20/mo.
            </h2>
            <p className="text-[14px] text-[var(--gem-gray-400)] m-0">
              First read is free. Cancel anytime.
            </p>
          </div>
          <div className="max-w-[440px] mx-auto">
            <div
              className="rounded-2xl p-7"
              style={{
                background:
                  'linear-gradient(135deg, rgba(124,58,237,0.05), #fff 70%)',
                border: '2px solid var(--gem-accent)',
                boxShadow: '0 10px 30px rgba(124,58,237,0.10)',
              }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-5">
                <div>
                  <p
                    className="text-[13px] font-semibold m-0 mb-1"
                    style={{ color: 'var(--gem-accent)' }}
                  >
                    GEM Pro
                  </p>
                  <p
                    className="text-[34px] font-bold m-0 leading-none text-[var(--gem-gray-50)]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    $20
                    <span className="text-[13px] font-medium text-[var(--gem-gray-400)]">
                      {' '}/mo
                    </span>
                  </p>
                </div>
                <span
                  className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    letterSpacing: '0.08em',
                    color: '#15803d',
                    background: 'rgba(22,163,74,0.10)',
                    border: '1px solid rgba(22,163,74,0.25)',
                  }}
                >
                  FIRST READ FREE
                </span>
              </div>
              <ul className="list-none p-0 m-0 text-[13.5px] text-[var(--gem-gray-100)] leading-[1.85]">
                <li>✓ Unlimited script evaluations</li>
                <li>✓ Industry matching with producers and reps</li>
                <li>✓ Direct intros routed to your inbox</li>
                <li>✓ Per-section privacy controls</li>
                <li>✓ Branded PDF report download</li>
                <li>✓ Cancel anytime</li>
              </ul>
              <TrackedCTA
                href="/signup"
                event="cta_clicked"
                properties={{ location: 'pricing_card', label: 'Start free' }}
                className="w-full mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
                style={{
                  background: 'var(--gem-accent)',
                  boxShadow: '0 6px 18px rgba(124,58,237,0.22)',
                }}
              >
                Start free
                <ArrowRight size={15} />
              </TrackedCTA>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* FEATURES DEEP-DIVE — alternating side panels with real-looking
          product UI mockups. The visual heft of the actual product is
          worth more than abstract pitch copy here. Anuj 2026-04-28. */}
      <section
        className="px-4 sm:px-6 py-16 sm:py-20"
        style={{
          background:
            'linear-gradient(180deg, var(--gem-gray-900) 0%, var(--gem-black) 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-12 sm:mb-16">
            <p
              className="text-[11px] uppercase tracking-[0.32em] font-semibold m-0 mb-3"
              style={{ color: 'var(--gem-gold)' }}
            >
              What you get
            </p>
            <h2
              className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              A producer-grade report — and a direct line to the people who decide.
            </h2>
          </div>

          <div className="space-y-16 sm:space-y-20">
            <FeatureBlock
              eyebrow="The cover read"
              title="A score, a headline, and the strongest reasons it lands."
              body="Selznick distills your script into the same one-pager a producer would scribble before pitching it up — a clean GEM Score, the sharpest version of your headline, and the three reasons the project works."
              visual={<ReportCoverMock />}
              flip={false}
            />
            <FeatureBlock
              eyebrow="Cast & packaging"
              title="Who would star in this. What it would cost. Who buys it."
              body="Lead character profiles with the actor archetypes your script is calling for, plus budget tier, audience cohort, and platform fit — the same lens a packaging exec walks into a meeting with."
              visual={<CastPackagingMock />}
              flip={true}
            />
            <FeatureBlock
              eyebrow="Industry matching"
              title="Producers and reps reach out directly."
              body="When your script qualifies, GEM puts it on the dashboards of producers and representatives actively scouting your lane. Their interest lands in your inbox — no submission portals, no chasing."
              visual={<MatchingDashboardMock />}
              flip={false}
            />
            <FeatureBlock
              eyebrow="Private by default"
              title="You decide what the industry sees."
              body="Hide your score. Hide individual sections. Take the post down anytime. Your report URL stays sharable with anyone you choose, separately from industry visibility."
              visual={<PrivacyControlsMock />}
              flip={true}
            />
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* FINAL CTA */}
      <section
        className="px-4 sm:px-6 py-16 sm:py-20 text-center"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(212,160,23,0.08) 0%, transparent 65%)',
        }}
      >
        <h2
          className="text-[28px] sm:text-[34px] font-bold leading-[1.15] tracking-tight m-0 mb-3"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Submit your screenplay.
        </h2>
        <p
          className="text-[14px] text-[var(--gem-gray-300)] italic m-0 mb-6"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          First read is on us.
        </p>
        <TrackedCTA
          href="/submit"
          event="cta_clicked"
          properties={{ location: 'bottom_cta', label: 'Submit your screenplay — Free' }}
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-[16px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.25)',
          }}
        >
          Submit your screenplay — free
          <ArrowRight size={16} />
        </TrackedCTA>
      </section>

      <footer className="border-t border-[var(--gem-gray-700)] py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM</span>
          <span>© 2026 GEM</span>
        </div>
      </footer>
    </div>
  )
}

// ─── Step card (How it works) ────────────────────────────────────────
function StepCard({
  n,
  icon,
  title,
  body,
}: {
  n: string
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
          style={{
            background: 'rgba(124,58,237,0.10)',
            color: 'var(--gem-accent)',
          }}
        >
          {icon}
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--gem-gray-500)' }}
        >
          Step {n}
        </span>
      </div>
      <h3
        className="text-[17px] sm:text-[18px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </h3>
      <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
        {body}
      </p>
    </div>
  )
}

// ─── Industry section helpers ────────────────────────────────────────
function IndustryFeature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-[var(--gem-gray-100)] leading-[1.5]">
      <CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
      <span>{text}</span>
    </li>
  )
}

function IndustryDashboardMock() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0"
          style={{ color: 'var(--gem-gray-500)' }}
        >
          Your matched feed
        </p>
        <span className="text-[10px] italic" style={{ color: 'var(--gem-gray-500)' }}>demo</span>
      </div>
      <div className="space-y-2.5">
        <MatchRow
          title="Untitled mob therapy pilot"
          format="Series · 1 hr drama"
          score="78"
          isNew
        />
        <MatchRow
          title="The Northern Line"
          format="Feature · Action thriller"
          score="71"
        />
        <MatchRow
          title="Glass Ceiling"
          format="Feature · Workplace comedy"
          score="68"
        />
      </div>
      <div
        className="text-center text-[11px] mt-4 pt-3"
        style={{ color: 'var(--gem-gray-500)', borderTop: '1px solid var(--gem-gray-800)' }}
      >
        3 new this week in your lane
      </div>
    </div>
  )
}

function MatchRow({
  title,
  format,
  score,
  isNew = false,
}: {
  title: string
  format: string
  score: string
  isNew?: boolean
}) {
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold m-0 text-[var(--gem-gray-50)] truncate">
            {title}
          </p>
          {isNew && (
            <span
              className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-[1px] rounded text-white"
              style={{ background: '#16a34a' }}
            >
              New
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mt-0.5">{format}</p>
      </div>
      <span
        className="shrink-0 text-[12px] font-bold px-2 py-1 rounded-md tabular-nums"
        style={{
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.25)',
          color: 'var(--gem-gray-50)',
        }}
      >
        {score}
      </span>
    </div>
  )
}

// ─── Features deep-dive helpers ──────────────────────────────────────
function FeatureBlock({
  eyebrow,
  title,
  body,
  visual,
  flip,
}: {
  eyebrow: string
  title: string
  body: string
  visual: React.ReactNode
  flip: boolean
}) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-8 md:gap-12 items-center ${
        flip ? 'md:[&>*:first-child]:order-2' : ''
      }`}
    >
      <div>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold m-0 mb-3"
          style={{ color: 'var(--gem-accent)' }}
        >
          {eyebrow}
        </p>
        <h3
          className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-[1.2] m-0 mb-3 text-[var(--gem-gray-50)]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {title}
        </h3>
        <p className="text-[15px] text-[var(--gem-gray-300)] leading-[1.65] m-0">
          {body}
        </p>
      </div>
      <div>{visual}</div>
    </div>
  )
}

// Real-feeling top of a report: GEM Score badge (neutral purple tint),
// title, headline, and the "Why this is a hit" bullets.
function ReportCoverMock() {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] uppercase tracking-[0.16em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
            Your script
          </p>
          <h4
            className="text-[18px] sm:text-[20px] font-bold tracking-tight m-0 leading-tight text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Untitled Mob Therapy Pilot
          </h4>
          <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5">By Anuj K.</p>
        </div>
        <div
          className="shrink-0 flex flex-col items-center justify-center rounded-lg tabular-nums"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.25)',
            minWidth: 64,
            padding: '8px 12px',
          }}
        >
          <span
            className="text-[9.5px] uppercase tracking-[0.16em] font-bold leading-none mb-1"
            style={{ color: 'var(--gem-gray-50)', opacity: 0.85 }}
          >
            Score
          </span>
          <span
            className="font-bold leading-none text-[var(--gem-gray-50)]"
            style={{ fontSize: 24 }}
          >
            78
          </span>
        </div>
      </div>
      <div
        className="rounded-xl p-3.5 mb-3"
        style={{
          background:
            'linear-gradient(135deg, rgba(212,160,23,0.08), #fff 70%)',
          border: '1px solid rgba(212,160,23,0.30)',
        }}
      >
        <div
          className="text-[9px] font-bold uppercase mb-1.5"
          style={{ letterSpacing: '0.18em', color: '#92710f' }}
        >
          Headline
        </div>
        <p
          className="text-[13.5px] font-semibold m-0 leading-[1.4] text-[var(--gem-gray-50)]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          A New Jersey mob boss in therapy races to hide panic attacks before
          family, crew, and rivals expose him.
        </p>
      </div>
      <div>
        <div
          className="text-[9px] font-bold uppercase mb-2"
          style={{ letterSpacing: '0.18em', color: 'var(--gem-accent)' }}
        >
          Why this is a hit
        </div>
        <ol className="list-none p-0 m-0 space-y-1.5">
          <WhyRow n="01" text="The premise is a built-in engine" />
          <WhyRow n="02" text="Tony is a star-making contradiction" />
          <WhyRow n="03" text="The family is as dramatic as the crime" />
        </ol>
      </div>
    </div>
  )
}

function WhyRow({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--gem-gold)' }}>
        {n}
      </span>
      <p className="text-[13px] font-medium m-0 leading-[1.4] text-[var(--gem-gray-100)]">
        {text}
      </p>
    </li>
  )
}

// Cast + packaging mock — shows lead character archetypes and the
// budget/audience/platform tier strip.
function CastPackagingMock() {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div className="mb-5">
        <p
          className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3"
        >
          Lead characters
        </p>
        <div className="space-y-2.5">
          <CharacterRow
            name="Tony Soprano"
            descriptor="Mob captain & reluctant patient"
            archetype="James Gandolfini lane · 40s · charisma + menace"
          />
          <CharacterRow
            name="Dr. Melfi"
            descriptor="Ethically conflicted psychiatrist"
            archetype="Lorraine Bracco lane · 40s · sharp + composed"
          />
        </div>
      </div>
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--gem-gray-900)',
          border: '1px solid var(--gem-gray-700)',
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3"
        >
          Packaging
        </p>
        <div className="grid grid-cols-3 gap-3">
          <PackagingMetric label="Budget tier" value="$3M / ep" />
          <PackagingMetric label="Audience" value="Premium drama" />
          <PackagingMetric label="Buyers" value="HBO, AMC, FX" />
        </div>
      </div>
    </div>
  )
}

function CharacterRow({
  name,
  descriptor,
  archetype,
}: {
  name: string
  descriptor: string
  archetype: string
}) {
  return (
    <div
      className="rounded-lg px-3.5 py-3"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-[13.5px] font-bold m-0 text-[var(--gem-gray-50)]">{name}</p>
        <p className="text-[11px] m-0 text-[var(--gem-gray-400)] truncate">{descriptor}</p>
      </div>
      <p className="text-[11.5px] m-0 text-[var(--gem-gray-300)] leading-snug">{archetype}</p>
    </div>
  )
}

function PackagingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9.5px] uppercase tracking-[0.14em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
        {label}
      </p>
      <p className="text-[12.5px] font-bold m-0 text-[var(--gem-gray-50)] leading-tight">
        {value}
      </p>
    </div>
  )
}

// Writer-side dashboard mock — Industry activity stats + a producer
// engagement row to show what "matching" looks like in practice.
function MatchingDashboardMock() {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3"
      >
        Industry activity
      </p>
      <div className="flex items-center gap-4 sm:gap-5 mb-5">
        <Stat label="Views" value="14" />
        <span className="text-[var(--gem-gray-700)]">·</span>
        <Stat label="Interested" value="3" />
        <span className="text-[var(--gem-gray-700)]">·</span>
        <Stat label="Emailed" value="2" />
      </div>
      <div className="space-y-2.5">
        <ProducerRow
          name="Lena Park"
          company="Plan B Entertainment"
          status="interested"
          time="2h ago"
        />
        <ProducerRow
          name="Marcus Hill"
          company="Anonymous Content"
          status="reached out"
          time="yesterday"
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[20px] font-bold tabular-nums m-0 leading-none text-[var(--gem-gray-50)]">
        {value}
      </p>
      <p className="text-[10.5px] uppercase tracking-[0.14em] font-bold text-[var(--gem-gray-500)] m-0 mt-1">
        {label}
      </p>
    </div>
  )
}

function ProducerRow({
  name,
  company,
  status,
  time,
}: {
  name: string
  company: string
  status: 'interested' | 'reached out'
  time: string
}) {
  const Icon = status === 'reached out' ? Mail : Eye
  const accent = status === 'reached out' ? 'var(--gem-accent)' : '#16a34a'
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 flex items-center gap-3"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full"
        style={{ background: 'rgba(124,58,237,0.08)', color: accent }}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold m-0 text-[var(--gem-gray-50)] truncate">
          {name} <span className="text-[var(--gem-gray-400)] font-normal">· {company}</span>
        </p>
        <p className="text-[11px] m-0 mt-0.5" style={{ color: accent }}>
          {status === 'reached out' ? 'Reached out' : 'Marked interested'} · {time}
        </p>
      </div>
    </div>
  )
}

// Privacy controls mock — the per-section pills the writer toggles.
function PrivacyControlsMock() {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <p
        className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-4"
      >
        Privacy
      </p>
      <PrivacyMockRow label="GEM Score" hint="Whether the score badge shows on your report cover." visible />
      <div className="my-3 border-t border-[var(--gem-gray-800)]" />
      <PrivacyMockRow label="Why this is a hit" hint="The strongest notes on why the script lands." visible />
      <PrivacyMockRow label="Cast" hint="Lead and supporting characters with actor appeal." visible={false} />
      <PrivacyMockRow label="Packaging" hint="Audience, budget tier, franchise potential." visible />
      <PrivacyMockRow label="Project Complexity" hint="Production and cast lift — what to plan for." visible />
    </div>
  )
}

function PrivacyMockRow({
  label,
  hint,
  visible,
}: {
  label: string
  hint: string
  visible: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
          {label}
        </p>
        <p className="text-[11.5px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
          {hint}
        </p>
      </div>
      <span
        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold ${
          visible
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : 'text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)]'
        }`}
      >
        {visible ? <Eye size={10} /> : <Activity size={10} />}
        {visible ? 'Visible' : 'Hidden'}
      </span>
    </div>
  )
}
