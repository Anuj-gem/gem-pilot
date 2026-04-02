import Link from 'next/link'
import { ArrowRight, CheckCircle, Calendar, Zap, Shield, TrendingUp, Eye } from 'lucide-react'
import { HeroUpload } from '@/components/hero-upload'
import { ReportShowcase } from '@/components/report-showcase'
import { LandingTracking } from '@/components/landing-tracking'
import { TrackSection } from '@/components/track-section'
import { TrackedCTA } from '@/components/tracked-cta'
import { LandingExperiments } from '@/components/landing-experiments'

export default function Home() {
  return (
    <div className="min-h-screen">
      <LandingTracking />
      <LandingExperiments />

      {/* Nav — compact on mobile, spaced on desktop */}
      <nav className="sticky top-0 z-50 border-b border-[var(--gem-gray-800)] bg-[var(--gem-black)]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <span className="text-lg sm:text-xl font-bold tracking-tight">GEM</span>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/discover"
              className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors hidden sm:inline"
            >
              Leaderboard
            </Link>
            <Link
              href="/login"
              className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors"
            >
              Log in
            </Link>
            <TrackedCTA
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'nav', label: 'Get Started Free' }}
              className="text-sm px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Get Started Free
            </TrackedCTA>
          </div>
        </div>
      </nav>

      {/* Hero — mobile-first, tight vertical rhythm */}
      <TrackSection name="hero">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-12 sm:pt-24 sm:pb-20">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-accent)] mb-3 sm:mb-4">
            Your AI development executive
          </p>
          <h1
            className="text-[1.75rem] leading-[1.15] sm:text-5xl md:text-[3.5rem] font-bold tracking-tight sm:leading-[1.1] mb-5 sm:mb-6 max-w-3xl"
            data-experiment="hero-headline"
          >
            The producer&apos;s perspective on your script — in 60 seconds.
          </h1>
          <p
            className="text-base sm:text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-8 sm:mb-10"
            data-experiment="hero-subhead"
          >
            GEM reads your screenplay the way a development exec would: market fit, budget
            feasibility, packaging potential, and what makes it easy or hard to sell. Not
            coverage — a producer&apos;s second opinion.
          </p>
          <HeroUpload />

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mt-6">
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'hero', label: 'Browse the leaderboard' }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--gem-gray-700)] text-sm text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-500)] transition-colors"
            >
              Browse the leaderboard
              <ArrowRight size={14} />
            </TrackedCTA>
            <TrackedCTA
              href="https://calendly.com/anuj-gem/15-minute-intro-call"
              event="calendly_cta_clicked"
              properties={{ location: 'hero' }}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--gem-gray-700)] text-sm text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-500)] transition-colors"
            >
              <Calendar size={14} />
              Talk to the founder
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* What GEM tells you — the value prop grid */}
      <TrackSection name="value_props">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">What you get</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            The questions producers ask — answered before they ask them.
          </h2>
          <p className="text-sm text-[var(--gem-gray-400)] max-w-2xl leading-relaxed mb-8 sm:mb-14">
            Before a producer takes a meeting on your script, they want to know: can this
            get made? What does it cost? Who&apos;s the audience? GEM gives you those answers
            so you walk in prepared — or know what to fix first.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <div className="w-9 h-9 rounded-lg bg-[var(--gem-accent)]/10 border border-[var(--gem-accent)]/20 flex items-center justify-center mb-3">
                <TrendingUp size={16} className="text-[var(--gem-accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Market Positioning</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Where your script sits in the current market. Comparable titles,
                genre positioning, and what makes it timely or out-of-cycle.
              </p>
            </div>
            <div className="p-5 sm:p-6 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <Shield size={16} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Budget Feasibility</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Cast requirements, location count, VFX demands, and cost flags.
                The production reality check that kills projects in development.
              </p>
            </div>
            <div className="p-5 sm:p-6 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                <Eye size={16} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Packaging Potential</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Platform fit, audience size, content level, and what kind of talent
                the project needs to attract. The business case for your story.
              </p>
            </div>
            <div className="p-5 sm:p-6 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                <Zap size={16} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Development Notes</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                What&apos;s working, what&apos;s hurting, and why — with evidence from your
                script. Actionable notes for your next draft, not a form letter.
              </p>
            </div>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* See a Real Report — showcase section */}
      <TrackSection name="showcase">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">See for yourself</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">A real evaluation, not a demo.</h2>
          <p className="text-sm text-[var(--gem-gray-400)] max-w-2xl leading-relaxed mb-8 sm:mb-14">
            We ran the Game of Thrones pilot through GEM. This is the actual report — the
            same analysis every writer gets. Your first evaluation is free.
          </p>

          <div className="grid md:grid-cols-5 gap-6 md:gap-10 items-start">
            <div className="md:col-span-3">
              <ReportShowcase />
            </div>

            <div className="md:col-span-2 space-y-5 sm:space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Weighted GEM Score + Tier</h3>
                <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                  Five dimensions — audience appeal, character strength, originality, hook, and
                  momentum — weighted by what matters for getting made. One score, one tier.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Development Intelligence</h3>
                <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                  What&apos;s working, what&apos;s hurting, and why — with evidence pulled from your
                  script. The notes a development exec would give before a greenlight meeting.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Production Reality Check</h3>
                <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                  Cast requirements, locations, VFX, rights flags, platform fit. The feasibility
                  questions a producer asks before taking a meeting.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Market Comparables</h3>
                <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                  Automatic comp titles with reasoning — know where your script sits in the
                  market before anyone asks.
                </p>
              </div>

              <div className="pt-1 sm:pt-2">
                <TrackedCTA
                  href="/signup"
                  event="cta_clicked"
                  properties={{ location: 'showcase', label: 'Try it free' }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
                >
                  Try it free with your script
                  <ArrowRight size={14} />
                </TrackedCTA>
              </div>
            </div>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* How it works — stacked on mobile, 4-col on desktop */}
      <TrackSection name="how_it_works">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-16">Upload. Read. Rewrite. Repeat.</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-8">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--gem-gray-700)] mb-2 sm:mb-3">01</div>
              <h3 className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2">Upload your script</h3>
              <p className="text-xs sm:text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Any format — pilot, feature, short, limited series. Drop a PDF
                and GEM handles the rest.
              </p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--gem-gray-700)] mb-2 sm:mb-3">02</div>
              <h3 className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2">Get the full picture</h3>
              <p className="text-xs sm:text-sm text-[var(--gem-gray-400)] leading-relaxed">
                In under 60 seconds: scored dimensions, development notes,
                production analysis, and market comps.
              </p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--gem-gray-700)] mb-2 sm:mb-3">03</div>
              <h3 className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2">Go public</h3>
              <p className="text-xs sm:text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Publish to the GEM leaderboard. Your script ranked by score
                alongside every other screenplay on the platform.
              </p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--gem-gray-700)] mb-2 sm:mb-3">04</div>
              <h3 className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2">Rewrite and climb</h3>
              <p className="text-xs sm:text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Use the notes to improve your draft. Resubmit, get a new score,
                and watch your ranking rise.
              </p>
            </div>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* The Leaderboard */}
      <TrackSection name="leaderboard">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">Beyond the report</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Let the work speak for itself.</h2>
          <p className="text-sm text-[var(--gem-gray-400)] max-w-2xl leading-relaxed mb-8 sm:mb-14">
            Publish your script to the GEM leaderboard and compete publicly. The best
            work rises to the top — ranked by score, visible to everyone.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <h3 className="text-sm font-semibold text-white mb-1.5 sm:mb-2">Public Rankings</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Scripts ranked by GEM score with tier badges. Search by genre, format, or title.
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <h3 className="text-sm font-semibold text-white mb-1.5 sm:mb-2">Community Likes</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Writers and readers can like your script. Sort by what&apos;s resonating.
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <h3 className="text-sm font-semibold text-white mb-1.5 sm:mb-2">Every Format</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Features, pilots, shorts, limited series — every idea gets scored and can go public.
              </p>
            </div>
          </div>

          <div className="mt-6 sm:mt-8">
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'leaderboard_section', label: 'Browse leaderboard' }}
              className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline"
            >
              Browse the leaderboard now
              <ArrowRight size={14} />
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Pricing */}
      <TrackSection name="pricing">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">A development exec for $20 a month.</h2>
          <p className="text-sm text-[var(--gem-gray-400)] mb-8 sm:mb-14 max-w-lg">
            Traditional coverage charges $50&ndash;150 per script and takes days. GEM gives you
            a producer-grade evaluation in under a minute, unlimited.
          </p>

          <div className="max-w-sm mx-auto">
            <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] p-6 sm:p-8">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">$20</span>
                <span className="text-[var(--gem-gray-400)]">/ month</span>
              </div>
              <p className="text-sm text-[var(--gem-gray-400)] mb-5 sm:mb-6">Unlimited everything. Cancel anytime.</p>

              <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                {[
                  'Unlimited script evaluations',
                  'Full development + production analysis',
                  'Market comps and packaging intel',
                  'Publish to the public leaderboard',
                  'All formats — features, pilots, shorts',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--gem-gray-300)]">
                    <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <TrackedCTA
                href="/signup"
                event="cta_clicked"
                properties={{ location: 'pricing', label: 'Start with a free evaluation' }}
                className="block w-full text-center py-3 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                Start with a free evaluation
              </TrackedCTA>
              <p className="text-xs text-[var(--gem-gray-500)] text-center mt-3">
                Your first evaluation is free. No credit card required.
              </p>
            </div>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Bottom CTA */}
      <TrackSection name="bottom_cta">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Know what a producer would think — before they read it.</h2>
          <p className="text-[var(--gem-gray-300)] max-w-lg mx-auto leading-relaxed mb-8 sm:mb-10">
            Get a development-level evaluation. See where your script stands. Walk into
            every meeting prepared.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <TrackedCTA
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'bottom_cta', label: 'Get Started Free' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Get Started Free
              <ArrowRight size={16} />
            </TrackedCTA>
            <TrackedCTA
              href="https://calendly.com/anuj-gem/15-minute-intro-call"
              event="calendly_cta_clicked"
              properties={{ location: 'bottom_cta' }}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-500)] transition-colors"
            >
              <Calendar size={16} />
              Talk to the founder
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      {/* Footer */}
      <footer className="border-t border-[var(--gem-gray-800)] py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM</span>
          <div className="flex items-center gap-4">
            <a
              href="https://calendly.com/anuj-gem/15-minute-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Talk to us
            </a>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
