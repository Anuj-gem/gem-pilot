// Landing page — v12 (2026-04-23).
//
// Structure:
//   1. Hero (client) — "Built to help screenwriters succeed." + upload +
//      pitch preview card
//   2. What You Get — 3 value prop cards: Pitch material, Development notes,
//      Industry matching
//   3. Meet Selznick — the reader behind the tech
//   4. For Industry Partners — apply-for-access wedge (mailto until Anuj
//      provides a real form URL)
//   5. Pricing — single Pro card, $20/mo for writers; industry is apply-only
//   6. Final CTA
//
// Writer-first, no marketing fluff, no scores, no leaderboard energy.
// Hero-upload handoff unchanged: LandingHero stashes the picked PDF via
// setPendingFile() and routes to /submit?from=hero.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Script from 'next/script'
import { LandingTracking } from '@/components/landing-tracking'
import { TrackedCTA } from '@/components/tracked-cta'
import { MobileNav } from '@/components/mobile-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { createClient } from '@/lib/supabase-server'

// TODO(2026-04-23): swap to the real application form URL once Anuj
// provides it. Same mailto used on /discover's RecommendedGate so both
// surfaces point to the same inbox until the form is live.
const INDUSTRY_APPLY_URL =
  'mailto:anuj@gem.studio?subject=GEM%20industry%20access%20request&body=Hi%20Anuj%20%E2%80%94%20I%27d%20like%20to%20apply%20for%20industry%20access%20on%20GEM.%0A%0AName%3A%0ACompany%2Frole%3A%0AWhat%20I%27m%20scouting%20for%20(genres%2C%20formats%2C%20mandates)%3A%0A'

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

  // Anuj 2026-04-28: Discover pulls removed. Free writers' posts no
  // longer appear on a public feed (industry matching is Pro-only),
  // and surfacing a writer-style "live qualified" feed here was
  // pulling readers off the network story we want this page to tell.

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

      {/* HERO (client) */}
      <LandingHero />

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* NETWORK CONNECTOR — the brand story in a graphic. Writers on
          one side, industry on the other, GEM (Selznick) in the middle
          as the connector. Anuj 2026-04-28: GEM is a network; this
          section visually communicates it. */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-20"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 60%), var(--gem-black)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-12 sm:mb-16">
            <p
              className="text-[11px] uppercase tracking-[0.32em] font-semibold m-0 mb-3"
              style={{ color: 'var(--gem-gold)' }}
            >
              How GEM works
            </p>
            <h2
              className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-3"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              We connect Hollywood with hidden gems.
            </h2>
            <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.6] m-0">
              Writers upload. Selznick reads every script the way a producer
              would. Industry partners see the work that fits their lane —
              and reach the writers behind it directly.
            </p>
          </div>

          {/* Three nodes: Writers → Selznick → Industry. Horizontal on
              desktop with connecting lines, vertical stack on mobile with
              down-arrows. Each node clickable → its dedicated product page. */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 sm:gap-2 items-stretch">
            <Link
              href="/writers"
              className="group rounded-2xl p-6 sm:p-7 transition-all hover:border-[var(--gem-gold)] flex flex-col"
              style={{
                background: '#fff',
                border: '1px solid var(--gem-gray-700)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div
                aria-hidden
                className="inline-flex items-center justify-center rounded-xl mb-4"
                style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(212,160,23,0.10)',
                  color: 'var(--gem-gold)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M5 4h9l3 3v11H5z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M14 4v3h3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <p
                className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-1.5"
                style={{ color: 'var(--gem-gold)' }}
              >
                Writers
              </p>
              <h3
                className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Upload your script.
              </h3>
              <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0 flex-1">
                Get a real read in 60 seconds. Decide who in the industry sees
                it. Free first eval, free first 7 days on Industry.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--gem-gray-50)] group-hover:text-[var(--gem-gold)] transition-colors mt-4">
                For writers
                <ArrowRight size={13} />
              </span>
            </Link>

            <NodeConnector />

            <Link
              href="/selznick"
              className="group rounded-2xl p-6 sm:p-7 transition-all flex flex-col relative"
              style={{
                background:
                  'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02) 65%), #fff',
                border: '1.5px solid var(--gem-accent)',
                boxShadow: '0 4px 18px rgba(124,58,237,0.12)',
              }}
            >
              <div
                aria-hidden
                className="inline-flex items-center justify-center rounded-xl mb-4"
                style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(124,58,237,0.10)',
                  color: 'var(--gem-accent)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M11 3l2.5 5 5.5.8-4 3.9.9 5.5L11 15.5 6.1 18.2 7 12.7 3 8.8 8.5 8z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-1.5"
                style={{ color: 'var(--gem-accent)' }}
              >
                Selznick
              </p>
              <h3
                className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                The producer&apos;s-eye lens.
              </h3>
              <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0 flex-1">
                Reads narrative, cast, production, packaging — calibrated to
                the signals that predict whether a project finds an audience.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--gem-gray-50)] group-hover:text-[var(--gem-accent)] transition-colors mt-4">
                The rubric
                <ArrowRight size={13} />
              </span>
            </Link>

            <NodeConnector />

            <Link
              href="/industry"
              className="group rounded-2xl p-6 sm:p-7 transition-all hover:border-[var(--gem-accent)] flex flex-col"
              style={{
                background: '#fff',
                border: '1px solid var(--gem-gray-700)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div
                aria-hidden
                className="inline-flex items-center justify-center rounded-xl mb-4"
                style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(22,163,74,0.10)',
                  color: '#16a34a',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="15" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 19c0-2.5 2.2-4.5 5-4.5M11 19c0-2.5 2.2-4.5 5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p
                className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-1.5"
                style={{ color: '#16a34a' }}
              >
                Industry
              </p>
              <h3
                className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Find the work that fits.
              </h3>
              <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0 flex-1">
                A curated, lane-matched feed of pre-read scripts. Producers and
                reps reach writers directly through GEM-routed intros.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--gem-gray-50)] group-hover:text-[var(--gem-accent)] transition-colors mt-4">
                For industry
                <ArrowRight size={13} />
              </span>
            </Link>
          </div>

          <p
            className="text-center text-[13px] sm:text-[14px] text-[var(--gem-gray-400)] italic m-0 mt-10 max-w-[60ch] mx-auto"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            In the lineage of the producers who decided what got made —
            Selznick, Thalberg, Goldwyn — built for everyone shaping what gets
            made next.
          </p>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* Anuj 2026-04-28: WHAT YOU GET writer-mockup section + LIVE
          QUALIFIED FEED Discover-pull section both removed. The page
          now flows: Hero → Network Connector → Selznick brand beat →
          Pricing → Final dual CTA. The deep "what the report
          contains" content lives at /writers; the producer-side pitch
          lives at /industry. The connector graphic above does the
          dual-audience tease. */}
      {/* WHY GEM EXISTS — single brand beat. The deep stories live on
          /writers, /industry, and /selznick (linked from the connector
          graphic above). This block is just the editorial sentence
          that ties the network together. Anuj 2026-04-28. */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-16"
        style={{
          background:
            'linear-gradient(180deg, var(--gem-gray-900) 0%, var(--gem-black) 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="text-[11px] uppercase font-semibold mb-3"
            style={{ letterSpacing: '0.32em', color: 'var(--gem-gold)' }}
          >
            Why GEM exists
          </div>
          <h2
            className="text-[26px] sm:text-[34px] font-bold leading-[1.2] tracking-tight m-0 mb-4"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Hollywood doesn&apos;t have a discovery problem.
            <br className="hidden sm:block" />{' '}
            <span className="gem-shimmer-gold font-extrabold">It has a translation problem.</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.65] m-0 mb-3 max-w-[60ch] mx-auto">
            Great scripts get written every day. Most of them never reach the
            people who could actually make them — not because the work
            isn&apos;t there, but because there&apos;s no shared language for
            evaluating it across a writer&apos;s desk and a producer&apos;s
            inbox.
          </p>
          <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.65] m-0 mb-7 max-w-[60ch] mx-auto">
            GEM is that language. Selznick reads every script the way a
            producer would. Writers know what they have. Industry partners
            know what they&apos;re seeing. The connection happens.
          </p>
          <Link
            href="/selznick"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--gem-accent)] hover:text-[var(--gem-gray-50)] transition-colors"
          >
            How GEM reads scripts, in detail
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* PRICING — single Pro card */}
      <section className="px-4 sm:px-6 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div
              className="text-[11px] uppercase font-semibold mb-3"
              style={{ letterSpacing: '0.32em', color: 'var(--gem-gold)' }}
            >
              Pricing
            </div>
            <h2
              className="text-[26px] sm:text-[30px] font-bold leading-[1.2] tracking-tight m-0 mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              $20/mo for writers.
            </h2>
            <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0">
              First read is free. Industry partners:{' '}
              <a
                href={INDUSTRY_APPLY_URL}
                className="underline"
                style={{ color: 'var(--gem-accent)' }}
              >
                apply for access
              </a>
              .
            </p>
          </div>
          <div className="max-w-[420px] mx-auto">
            <div
              className="rounded-2xl p-6"
              style={{
                background:
                  'linear-gradient(135deg, rgba(124,58,237,0.05), #fff 70%)',
                border: '2px solid var(--gem-accent)',
                boxShadow: '0 10px 30px rgba(124,58,237,0.10)',
              }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <div>
                  <p
                    className="text-[13px] font-semibold m-0 mb-1"
                    style={{ color: 'var(--gem-accent)' }}
                  >
                    GEM Pro
                  </p>
                  <p
                    className="text-[32px] font-bold m-0 leading-none text-[var(--gem-gray-50)]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    $20
                    <span className="text-[13px] font-medium text-[var(--gem-gray-400)]">
                      {' '}
                      /mo
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
              <ul className="list-none p-0 m-0 text-[13px] text-[var(--gem-gray-100)] leading-[1.85]">
                <li>✓ Full pitch material + development notes</li>
                <li>✓ Unlimited revisions</li>
                <li>✓ Industry matching when you&apos;re ready</li>
                <li>✓ Direct contact from industry partners</li>
                <li>✓ Cancel anytime</li>
              </ul>
            </div>
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
          className="text-[26px] sm:text-[30px] font-bold leading-[1.15] tracking-tight m-0 mb-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Submit your screenplay.
        </h2>
        <p
          className="text-[14px] text-[var(--gem-gray-300)] italic m-0 mb-5"
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

      {/* Shared shimmer style — used by the Selznick wordmark in the hero + engine */}
      <Script id="gem-shimmer-style" strategy="afterInteractive">{`
        (function(){
          if (document.getElementById('gem-shimmer-inline')) return;
          var s = document.createElement('style');
          s.id = 'gem-shimmer-inline';
          s.textContent = '@keyframes gemShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}.gem-shimmer-gold{background:linear-gradient(90deg,#B8860B 0%,#D4A017 30%,#F2D06B 50%,#D4A017 70%,#B8860B 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:gemShimmer 5s linear infinite}';
          document.head.appendChild(s);
        })();
      `}</Script>
    </div>
  )
}

// NodeConnector — sits between the three nodes in the network connector
// graphic. Horizontal arrow on desktop (between writers ↔ Selznick ↔
// industry), vertical down-arrow on mobile.
function NodeConnector() {
  return (
    <div className="flex items-center justify-center px-2 py-2 sm:px-0 sm:py-0">
      {/* Mobile: down arrow */}
      <svg
        className="sm:hidden text-[var(--gem-gray-600)]"
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        aria-hidden
      >
        <path
          d="M8 2v14M2 12l6 6 6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Desktop: right arrow */}
      <svg
        className="hidden sm:block text-[var(--gem-gray-600)]"
        width="32"
        height="14"
        viewBox="0 0 32 14"
        fill="none"
        aria-hidden
      >
        <path
          d="M2 7h26M22 2l6 5-6 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// IndustryProp helper removed — the heavy "FOR INDUSTRY PARTNERS"
// wedge that consumed it was deleted on 2026-04-28 in favor of the
// connector graphic + the dedicated /industry product page.
