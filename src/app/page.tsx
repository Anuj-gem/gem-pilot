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

  // Fetch the 3 most recent qualified + published reports for the live feed
  // section under "Three things every writer needs". Dedupes by title so a
  // single writer testing the same script multiple times doesn't dominate
  // the feed. Failures are non-fatal — the section just renders empty.
  type LiveCard = {
    eval_id: string
    title: string
    headline: string
    author: string | null
    declared_format: string | null
    posted_at: string
  }
  const liveQualified: LiveCard[] = []
  try {
    const { data: subs } = await supabase
      .from('script_submissions')
      .select(
        'id, title, declared_format, created_at, profiles ( full_name ), script_evaluations ( id, weighted_score, evaluation, edited_fields )'
      )
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(40)
    const seenTitles = new Set<string>()
    for (const s of (subs as any[]) ?? []) {
      const ev = Array.isArray(s.script_evaluations) ? s.script_evaluations[0] : s.script_evaluations
      if (!ev) continue
      const score = Number(ev.weighted_score)
      if (Number.isNaN(score) || score < 50) continue
      const title = (s.title || '').trim()
      const titleKey = title.toLowerCase()
      if (seenTitles.has(titleKey)) continue
      seenTitles.add(titleKey)
      const headline =
        ev.edited_fields?.logline ||
        ev.evaluation?.positioning_hook ||
        ev.evaluation?.whats_special?.headline ||
        ''
      liveQualified.push({
        eval_id: ev.id,
        title: title || 'Untitled',
        headline: String(headline).trim(),
        author: s.profiles?.full_name ?? null,
        declared_format: s.declared_format ?? null,
        posted_at: s.created_at,
      })
      if (liveQualified.length >= 3) break
    }
  } catch {
    // Swallow — section just won't render
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

      {/* WHAT YOU GET — three distinct value props (writer-side
          mockups). Kept for the "show what the report looks like"
          beat. Anuj 2026-04-28: this is now writer-focused proof, not
          the brand-frame section (which moved to the network connector
          above). */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-16"
        style={{ background: 'var(--gem-gray-900)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-9">
            <div
              className="text-[11px] uppercase font-semibold mb-3"
              style={{ letterSpacing: '0.32em', color: 'var(--gem-gold)' }}
            >
              What writers get
            </div>
            <h2
              className="text-[26px] sm:text-[32px] font-bold leading-[1.15] tracking-tight m-0 mb-3"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              The packet a producer would write before greenlight.
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
              A sharable pitch. Private development notes. A match with the
              industry partners scouting your lane.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Pitch material — mini-mockup mirrors the report's Headline +
                Why this is a hit section. Specific rather than abstract:
                writers can already picture what they'd get back. */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: '#fff',
                border: '1px solid rgba(212,160,23,0.30)',
              }}
            >
              <div
                className="rounded-lg p-3 mb-4"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(212,160,23,0.10), #fff 80%)',
                  border: '1px solid rgba(212,160,23,0.28)',
                }}
              >
                <p
                  className="text-[8.5px] font-bold uppercase m-0 mb-1.5"
                  style={{ letterSpacing: '0.18em', color: '#92710f' }}
                >
                  Headline
                </p>
                <p
                  className="text-[11px] font-semibold m-0 leading-[1.4] text-[var(--gem-gray-50)]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  A New Jersey mob boss in therapy races to hide panic attacks before family, crew, and rivals expose him.
                </p>
              </div>
              <p
                className="text-[17px] font-semibold m-0 mb-2 leading-tight text-[var(--gem-gray-50)]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Pitch material
              </p>
              <p className="text-[13px] text-[var(--gem-gray-300)] leading-[1.6] m-0">
                Ready-to-share positioning — a sharp headline, why the script is a hit, and how it reads for production. Use it the next time someone asks &ldquo;what have you got?&rdquo;
              </p>
            </div>

            {/* Development notes — mini-mockup mirrors the report's
                Development Priorities section: primary lever badge + a
                one-line sample. */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: '#fff',
                border: '1px solid rgba(124,58,237,0.25)',
              }}
            >
              <div
                className="rounded-lg p-3 mb-4"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(220,38,38,0.04), #fff 80%)',
                  border: '1px solid rgba(220,38,38,0.20)',
                }}
              >
                <span
                  className="inline-block text-[8.5px] font-bold uppercase mb-1.5 px-1.5 py-0.5 rounded"
                  style={{
                    letterSpacing: '0.16em',
                    color: '#dc2626',
                    background: 'rgba(220,38,38,0.08)',
                    border: '1px solid rgba(220,38,38,0.22)',
                  }}
                >
                  Primary lever
                </span>
                <p className="text-[11px] font-semibold m-0 leading-[1.4] text-[var(--gem-gray-50)]">
                  Run each Melfi session as a distinct pressure — family, business, identity — so every return to the office does narrative work.
                </p>
              </div>
              <p
                className="text-[17px] font-semibold m-0 mb-2 leading-tight text-[var(--gem-gray-50)]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Development notes
              </p>
              <p className="text-[13px] text-[var(--gem-gray-300)] leading-[1.6] m-0">
                A private read on what&apos;s working and the sharpest places to push next. Use them at your own pace. They stay yours — you decide what, if anything, to share.
              </p>
            </div>

            {/* Industry matching — mini-mockup mirrors the green
                qualification banner from the report page. Same visual
                language across surfaces. */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: '#fff',
                border: '1px solid rgba(22,163,74,0.25)',
              }}
            >
              <div
                className="rounded-lg p-3 mb-4 flex items-start gap-2"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(5,150,105,0.10), #fff 80%)',
                  border: '1px solid rgba(5,150,105,0.30)',
                }}
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: '#059669' }}
                >
                  ✓
                </span>
                <div className="min-w-0">
                  <p
                    className="text-[8.5px] font-bold uppercase m-0 mb-1"
                    style={{ letterSpacing: '0.16em', color: '#047857' }}
                  >
                    Qualifies for industry matching
                  </p>
                  <p className="text-[11px] font-semibold m-0 leading-[1.4] text-[var(--gem-gray-50)]">
                    Producers, agents, and dev execs scouting your lane can find this script.
                  </p>
                </div>
              </div>
              <p
                className="text-[17px] font-semibold m-0 mb-2 leading-tight text-[var(--gem-gray-50)]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Industry matching
              </p>
              <p className="text-[13px] text-[var(--gem-gray-300)] leading-[1.6] m-0">
                We connect you with the producers, reps, and dev execs looking for work like yours — so you reach people actually scouting in your lane.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* LIVE QUALIFIED FEED — the most-recent qualified scripts on Industry.
          Reinforces "Industry is for the most qualified" by making it
          tangible. Server-fetched at request time so it always shows real
          recent activity. Hidden if we can't pull at least one card. */}
      {liveQualified.length > 0 && (
        <>
          <section
            className="px-4 sm:px-6 py-12 sm:py-14"
            style={{ background: 'var(--gem-black)' }}
          >
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      aria-hidden
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: '#16a34a', boxShadow: '0 0 8px rgba(22,163,74,0.6)' }}
                    />
                    <div
                      className="text-[11px] uppercase font-semibold"
                      style={{ letterSpacing: '0.32em', color: '#16a34a' }}
                    >
                      Qualifying right now
                    </div>
                  </div>
                  <h2
                    className="text-[22px] sm:text-[26px] font-bold leading-[1.2] tracking-tight m-0"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Writers are qualifying for industry visibility every day.
                  </h2>
                </div>
                <Link
                  href="/discover"
                  className="text-[13px] font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--gem-accent)' }}
                >
                  See all on Industry
                  <ArrowRight size={13} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {liveQualified.map((card) => (
                  <Link
                    key={card.eval_id}
                    href={`/report/${card.eval_id}`}
                    className="rounded-xl p-4 transition-colors hover:border-[var(--gem-gray-600)] block"
                    style={{
                      background: 'var(--gem-gray-900)',
                      border: '1px solid var(--gem-gray-700)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span
                        aria-hidden
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold"
                        style={{ background: '#059669' }}
                      >
                        ✓
                      </span>
                      <span
                        className="text-[9.5px] font-bold uppercase"
                        style={{ letterSpacing: '0.14em', color: '#34d399' }}
                      >
                        Qualified · {card.declared_format === 'Series' ? 'Series' : 'Feature'}
                      </span>
                    </div>
                    <p
                      className="text-[15px] font-semibold m-0 mb-1.5 leading-tight text-[var(--gem-gray-50)] line-clamp-2"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {card.title}
                    </p>
                    {card.headline && (
                      <p className="text-[12.5px] text-[var(--gem-gray-300)] leading-[1.5] m-0 mb-3 line-clamp-3">
                        {card.headline}
                      </p>
                    )}
                    {card.author && (
                      <p className="text-[11px] text-[var(--gem-gray-500)] m-0 leading-tight">
                        By {card.author}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
          <div className="h-px bg-[var(--gem-gray-700)]" />
        </>
      )}

      {/* MEET SELZNICK — kept as a brand beat on the landing, but the
          deep methodology page lives at /selznick now. This section
          stays compact and links into the deep page. */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-16"
        style={{
          background:
            'linear-gradient(180deg, var(--gem-gray-900) 0%, var(--gem-black) 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-[680px] mx-auto mb-8">
            <div
              className="text-[11px] uppercase font-semibold mb-3"
              style={{ letterSpacing: '0.32em', color: 'var(--gem-gold)' }}
            >
              The reader behind it
            </div>
            <h2
              className="text-[26px] sm:text-[32px] font-bold leading-[1.15] tracking-tight m-0 mb-3"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Meet{' '}
              <span className="gem-shimmer-gold font-extrabold">Selznick</span>
              .
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
              Selznick is the most powerful creative development engine ever built. It reads your script, learns from every screenplay it sees, and figures out the right collaborators to put it in front of.
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
                — read against what Hollywood actually makes.
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
                Selznick gets sharper with every release. The read you get
                today is more refined than a month ago.
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
                Profiles your script&apos;s lane, audience, and packaging fit —
                the basis for matching it with the right industry partners.
              </p>
            </div>
          </div>

          <p
            className="text-center text-[12px] text-[var(--gem-gray-400)] italic m-0"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            In the lineage of the producers who decided what got made —
            Selznick, Thalberg, Goldwyn — built for everyone shaping what
            gets made next.
          </p>
          <div className="text-center mt-7">
            <Link
              href="/selznick"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--gem-accent)] hover:text-[var(--gem-gray-50)] transition-colors"
            >
              How GEM reads scripts, in detail
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)]" />

      {/* FOR INDUSTRY PARTNERS — the apply wedge */}
      <section
        className="px-4 sm:px-6 py-14 sm:py-16"
        style={{
          background:
            'linear-gradient(180deg, rgba(124,58,237,0.05) 0%, var(--gem-black) 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="inline-block text-[10px] font-bold uppercase rounded-full px-3 py-1 mb-4"
            style={{
              letterSpacing: '0.2em',
              color: 'var(--gem-accent)',
              background: 'rgba(124,58,237,0.10)',
              border: '1px solid rgba(124,58,237,0.30)',
            }}
          >
            Industry access · limited beta
          </div>
          <h2
            className="text-[26px] sm:text-[32px] font-bold leading-[1.15] tracking-tight m-0 mb-4"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            For producers, reps, and dev execs.
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.65] m-0 mb-7 max-w-[62ch]">
            We&apos;re opening GEM to a hand-picked cohort of industry partners —
            producers actively optioning, literary reps building lists, dev
            execs with active mandates, packagers scouting. Approved partners
            get a private, curated shortlist matched to what they&apos;re looking
            for.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-7 max-w-[720px]">
            <IndustryProp
              title="Matched to your mandate"
              body="Genres, formats, budget range — we match by what you're actually building."
            />
            <IndustryProp
              title="Real cross-section"
              body="Every script is Selznick-read and writer-curated. No junk feed."
            />
            <IndustryProp
              title="Direct to the writer"
              body="Reach writers directly from their report. No gatekeepers, no reader queues."
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/industry"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-colors hover:brightness-110"
              style={{
                background: 'var(--gem-accent)',
                boxShadow: '0 4px 14px rgba(124,58,237,0.18)',
              }}
            >
              See the industry product
              <ArrowRight size={14} />
            </Link>
            <a
              href={INDUSTRY_APPLY_URL}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-colors hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)]"
              style={{
                border: '1px solid var(--gem-gray-700)',
                background: 'transparent',
                color: 'var(--gem-gray-50)',
              }}
            >
              Apply for access
            </a>
          </div>
          <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-3">
            Hand-reviewed · most replies within 48 hours
          </p>
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

function IndustryProp({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[13.5px] font-semibold m-0 mb-1 text-[var(--gem-gray-50)]">
        {title}
      </p>
      <p className="text-[12px] text-[var(--gem-gray-400)] leading-[1.55] m-0">
        {body}
      </p>
    </div>
  )
}
