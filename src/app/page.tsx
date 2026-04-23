// Landing page — v11 rewrite.
//
// Structure:
//   1. Hero — copy + upload zone + sample report preview (client component)
//   2. The Engine — Selznick tout, three proof cards
//   3. What's in your report — product UI snippets
//   4. The Path — 3 steps
//   5. Discover — live preview, most recent scripts (no scores)
//   6. Pricing — Free vs Pro, simple, no Charter lock
//   7. Final CTA
//
// Hero-upload handoff: LandingHero stashes the picked PDF via setPendingFile()
// and routes to /submit?from=hero. /submit detects the pending file and
// skips the script step — Format → Account direct, eval fires in background.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Script from 'next/script'
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
  // OAuth safety net — forward dangling ?code= to /auth/callback so the
  // session exchange completes (Supabase sometimes bounces here if the
  // test-branch URL isn't in the allow list).
  const sp = await searchParams
  if (sp.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}&next=/submit`)
  }

  const supabase = await createClient()

  // Logged-in writers skip the marketing page.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  // Recent scripts for the Discover preview. Title + author + format only —
  // no scores on the public landing page.
  const { data: recentScripts } = await supabase
    .from('leaderboard')
    .select('evaluation_id, title, author_name, format')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      <LandingTracking />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/92 backdrop-blur-sm">
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
              href="/discover"
              className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] transition-colors"
            >
              Discover
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

      {/* THE ENGINE — Selznick tout */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-16"
        style={{
          background:
            'linear-gradient(180deg, var(--gem-gray-900) 0%, var(--gem-black) 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-[620px] mx-auto mb-8">
            <div
              className="text-[11px] uppercase font-semibold mb-3"
              style={{ letterSpacing: '0.32em', color: 'var(--gem-gold)' }}
            >
              The Engine
            </div>
            <h2
              className="text-[26px] sm:text-[32px] font-bold leading-[1.15] tracking-tight m-0 mb-3"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Meet{' '}
              <span className="gem-shimmer-gold font-extrabold">Selznick</span>{' '}
              — the most advanced screenplay analysis ever built.
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
              Not a checklist. Not a coverage template. A reader calibrated
              against the screenplays Hollywood actually makes — and getting
              sharper with every script it sees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {/* Thousands of signals */}
            <div
              className="rounded-xl text-center p-5"
              style={{
                background: '#fff',
                border: '1px solid rgba(212,160,23,0.30)',
              }}
            >
              <div
                className="text-[30px] font-bold leading-none mb-2.5"
                style={{
                  color: 'var(--gem-gold)',
                  fontFamily: 'Georgia, serif',
                }}
              >
                1,000s
              </div>
              <p
                className="text-[11px] font-bold uppercase m-0 mb-2"
                style={{ letterSpacing: '0.18em', color: '#92710f' }}
              >
                Signals per script
              </p>
              <p className="text-[12px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
                Every craft choice, every story beat, every production reality
                — scored against what Hollywood actually makes.
              </p>
            </div>

            {/* Sharper every release */}
            <div
              className="rounded-xl text-center p-5"
              style={{
                background: '#fff',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              <div className="flex items-center justify-center mb-2.5">
                <svg width="36" height="22" viewBox="0 0 36 22" fill="none">
                  <path
                    d="M2 18 L10 14 L18 16 L26 8 L34 4"
                    stroke="#7C3AED"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="34" cy="4" r="3" fill="#7C3AED" />
                </svg>
              </div>
              <p
                className="text-[11px] font-bold uppercase m-0 mb-2"
                style={{ letterSpacing: '0.18em', color: 'var(--gem-accent)' }}
              >
                Sharper every release
              </p>
              <p className="text-[12px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
                Selznick is retrained on every produced screenplay it sees.
                The engine you read with today is smarter than the one we
                shipped last month.
              </p>
            </div>

            {/* Builds the match */}
            <div
              className="rounded-xl text-center p-5"
              style={{
                background:
                  'linear-gradient(135deg, rgba(22,163,74,0.04), #fff 70%)',
                border: '1px solid rgba(22,163,74,0.30)',
              }}
            >
              <div className="flex items-center justify-center mb-2.5">
                <svg width="44" height="22" viewBox="0 0 44 22" fill="none">
                  <circle cx="6" cy="11" r="3" fill="#D4A017" />
                  <path d="M9 11 L18 11" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="2 2" />
                  <circle cx="22" cy="11" r="4" fill="#16a34a" />
                  <path d="M26 11 L35 11" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="2 2" />
                  <circle cx="38" cy="11" r="3" fill="#7C3AED" />
                </svg>
              </div>
              <p
                className="text-[11px] font-bold uppercase m-0 mb-2"
                style={{ letterSpacing: '0.18em', color: '#16a34a' }}
              >
                Builds the match
              </p>
              <p className="text-[12px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
                Selznick profiles your script&apos;s lane, audience, and
                packaging fit — the foundation for matching the right scripts
                to the right industry partners.
              </p>
            </div>
          </div>

          <p
            className="text-center text-[12px] text-[var(--gem-gray-400)] italic m-0"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            In the lineage of the producers who decided what got made —
            Selznick, Thalberg, Goldwyn — built for the writers shaping what
            gets made next.
          </p>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* WHAT'S IN YOUR REPORT */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-16"
        style={{ background: 'var(--gem-gray-900)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-7">
            <h2
              className="text-[26px] sm:text-[30px] font-bold leading-[1.15] tracking-tight m-0 mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              What&apos;s in your report.
            </h2>
            <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
              Score, headline, why it works, and the sharpest place a producer
              would lean on next.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Why this can be a hit */}
            <div
              className="rounded-xl p-5"
              style={{
                background: '#fff',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              <div
                className="text-[10px] uppercase font-bold mb-2.5"
                style={{ letterSpacing: '0.22em', color: 'var(--gem-accent)' }}
              >
                Why this can be a hit
              </div>
              <div className="flex flex-col gap-2">
                {[
                  'Mainstream emotional hook with built-in returnability',
                  'Lead role that gives an A-list actor their dramatic re-entry',
                  'Single-location structure — reads premium without expensive',
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span
                      className="font-bold text-[13px]"
                      style={{ color: 'var(--gem-gold)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[13px] font-semibold text-[var(--gem-gray-100)] leading-[1.4] m-0">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary lever — producer-mind, no story punch-downs */}
            <div
              className="rounded-xl p-5"
              style={{
                background:
                  'linear-gradient(135deg, rgba(220,38,38,0.04), #fff 60%)',
                border: '1px solid rgba(220,38,38,0.30)',
              }}
            >
              <span
                className="text-[9px] font-bold uppercase"
                style={{
                  letterSpacing: '0.18em',
                  color: '#dc2626',
                  background: 'rgba(220,38,38,0.07)',
                  border: '1px solid rgba(220,38,38,0.25)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                }}
              >
                Primary lever
              </span>
              <p className="text-[13px] font-semibold text-[var(--gem-gray-100)] leading-[1.4] m-0 mt-2">
                The expansive world is your strength — figure out how to
                control costs to support it.
              </p>
              <p className="text-[12px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mt-1.5">
                Anchoring the back half in a single contained location keeps
                packaging in indie range without losing the scope you&apos;ve
                built.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* THE PATH */}
      <section className="px-4 sm:px-6 py-14 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2
              className="text-[26px] sm:text-[30px] font-bold leading-[1.15] tracking-tight m-0"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              From your draft to a producer&apos;s desk.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[760px] mx-auto">
            {[
              {
                n: 1,
                title: 'Upload',
                body: 'Drop your PDF. Selznick reads.',
                color: 'var(--gem-gold)',
                bg: 'rgba(212,160,23,0.10)',
                border: 'rgba(212,160,23,0.4)',
              },
              {
                n: 2,
                title: 'Sharpen',
                body: 'Use the development priorities. Resubmit. Watch it climb.',
                color: 'var(--gem-accent)',
                bg: 'rgba(124,58,237,0.10)',
                border: 'rgba(124,58,237,0.4)',
              },
              {
                n: 3,
                title: 'Get discovered',
                body: 'Your strongest work goes on Discover.',
                color: '#16a34a',
                bg: 'rgba(22,163,74,0.10)',
                border: 'rgba(22,163,74,0.4)',
              },
            ].map(({ n, title, body, color, bg, border }) => (
              <div key={n} className="text-center">
                <div
                  className="w-12 h-12 rounded-xl grid place-items-center mx-auto mb-3 font-bold text-[18px]"
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    color,
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {n}
                </div>
                <p
                  className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {title}
                </p>
                <p className="text-[12px] text-[var(--gem-gray-300)] leading-[1.55] m-0 max-w-[200px] mx-auto">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* DISCOVER */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-16"
        style={{ background: 'var(--gem-gray-900)' }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-6 sm:gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: '#16a34a' }}
              />
              <span
                className="text-[11px] font-bold uppercase"
                style={{ letterSpacing: '0.22em', color: '#16a34a' }}
              >
                Live · Discover
              </span>
            </div>
            <h2
              className="text-[22px] sm:text-[26px] font-bold leading-[1.2] tracking-tight m-0 mb-2.5"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Producers are browsing right now.
            </h2>
            <p className="text-[13px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-3">
              Discover is where buyers and reps come looking for what to read
              next. Tonight, someone might be reading yours.
            </p>
            <Link
              href="/discover"
              className="text-[13px] font-semibold"
              style={{ color: 'var(--gem-accent)' }}
            >
              Browse Discover →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {(recentScripts?.length ? recentScripts : SAMPLE_DISCOVER).map(
              (s: any, i: number) => {
                const href = s.evaluation_id
                  ? `/report/${s.evaluation_id}`
                  : '/discover'
                return (
                  <Link
                    key={s.evaluation_id ?? `sample-${i}`}
                    href={href}
                    className="group flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(124,58,237,0.10)]"
                    style={{
                      background: '#fff',
                      border: '1px solid var(--gem-gray-700)',
                    }}
                  >
                    <div
                      className="w-[32px] h-[32px] rounded-md grid place-items-center flex-shrink-0 text-[13px] transition-colors group-hover:bg-[rgba(124,58,237,0.10)] group-hover:text-[var(--gem-accent)]"
                      style={{
                        background: 'var(--gem-gray-800)',
                        color: 'var(--gem-gray-500)',
                      }}
                    >
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-semibold m-0 leading-tight truncate transition-colors group-hover:text-[var(--gem-accent)]"
                        style={{ color: 'var(--gem-gray-50)' }}
                      >
                        {s.title ?? 'Untitled'}
                      </p>
                      <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mt-0.5 truncate">
                        {s.author_name ?? 'Anonymous'} · {s.format ?? 'Feature'}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="text-[14px] text-[var(--gem-gray-500)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150"
                    >
                      →
                    </span>
                  </Link>
                )
              }
            )}
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* PRICING */}
      <section className="px-4 sm:px-6 py-14 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-7">
            <h2
              className="text-[24px] sm:text-[28px] font-bold leading-[1.2] tracking-tight m-0 mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Try it free. Upgrade for the full read.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[560px] mx-auto">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'var(--gem-gray-900)',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              <p className="text-[13px] font-semibold text-[var(--gem-gray-300)] m-0 mb-1">
                Free
              </p>
              <p
                className="text-[30px] font-bold m-0 mb-3"
                style={{ color: '#16a34a', fontFamily: 'Georgia, serif' }}
              >
                $0
              </p>
              <ul className="list-none p-0 m-0 text-[12px] text-[var(--gem-gray-100)] leading-[1.7]">
                <li>✓ Your score</li>
                <li>✓ Sample of the notes</li>
                <li>✓ No credit card</li>
              </ul>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{
                background:
                  'linear-gradient(135deg, rgba(124,58,237,0.05), #fff 70%)',
                border: '2px solid var(--gem-accent)',
                boxShadow: '0 6px 20px rgba(124,58,237,0.10)',
              }}
            >
              <p
                className="text-[13px] font-semibold m-0 mb-1"
                style={{ color: 'var(--gem-accent)' }}
              >
                Pro
              </p>
              <p
                className="text-[30px] font-bold m-0 mb-3"
                style={{ color: 'var(--gem-accent)', fontFamily: 'Georgia, serif' }}
              >
                $20
                <span className="text-[13px] font-medium text-[var(--gem-gray-400)]">
                  {' '}
                  /mo
                </span>
              </p>
              <ul className="list-none p-0 m-0 text-[12px] text-[var(--gem-gray-100)] leading-[1.7]">
                <li>✓ Full notes & development priorities</li>
                <li>✓ Unlimited revisions</li>
                <li>✓ Publish to Discover</li>
                <li>✓ Producers contact you directly</li>
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
            'radial-gradient(ellipse at 50% 50%, rgba(212,160,23,0.06) 0%, transparent 65%)',
        }}
      >
        <h2
          className="text-[26px] sm:text-[30px] font-bold leading-[1.15] tracking-tight m-0 mb-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Get your screenplay scored.
        </h2>
        <p
          className="text-[14px] text-[var(--gem-gray-300)] italic m-0 mb-5"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          First one is on us.
        </p>
        <TrackedCTA
          href="/submit"
          event="cta_clicked"
          properties={{ location: 'bottom_cta', label: 'Get Started — Free' }}
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-[16px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.25)',
          }}
        >
          Get Started — Free
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

// Fallback for when the leaderboard hasn't populated in a fresh env.
const SAMPLE_DISCOVER = [
  { title: 'The Summer Court', author_name: 'Maya Chen', format: 'Limited series' },
  { title: 'Holding Pattern', author_name: 'Diego Vargas', format: 'Feature' },
  { title: 'Last Train Out', author_name: 'Priya Singh', format: 'Pilot' },
]
