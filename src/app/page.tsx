import Link from 'next/link'
import { ArrowRight, CheckCircle, Calendar } from 'lucide-react'
import { HeroUpload } from '@/components/hero-upload'
import { LandingTracking } from '@/components/landing-tracking'
import { TrackSection } from '@/components/track-section'
import { TrackedCTA } from '@/components/tracked-cta'
import { LandingExperiments } from '@/components/landing-experiments'
import { createClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = await createClient()
  const { data: topScripts } = await supabase
    .from('leaderboard')
    .select('*')
    .order('weighted_score', { ascending: false })
    .limit(8)
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
              className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors"
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
              properties={{ location: 'nav', label: 'Sign Up' }}
              className="text-sm px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Sign Up
            </TrackedCTA>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <TrackSection name="hero">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-12 sm:pt-24 sm:pb-20">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-accent)] mb-3 sm:mb-4">
            Drop your script. See what a producer sees.
          </p>
          <h1
            className="text-[1.75rem] leading-[1.15] sm:text-5xl md:text-[3.5rem] font-bold tracking-tight sm:leading-[1.1] mb-5 sm:mb-6 max-w-3xl font-[family-name:var(--font-display)]"
            data-experiment="hero-headline"
          >
            Free screenplay scoring. Instant. Unlimited.
          </h1>
          <p
            className="text-base sm:text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-8 sm:mb-10"
            data-experiment="hero-subhead"
          >
            Upload any script and get your GEM score and tier in under a minute. No account needed. Subscribe to unlock the full development read.
          </p>

          {/* Desktop: file upload drop zone */}
          <div className="hidden sm:block">
            <HeroUpload />
          </div>

          {/* Mobile: signup CTA (users won't have PDFs on phone) */}
          <div className="sm:hidden">
            <TrackedCTA
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'hero_mobile', label: 'Create Free Account' }}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] active:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Create your free account
              <ArrowRight size={16} />
            </TrackedCTA>
            <p className="text-xs text-[var(--gem-gray-500)] text-center mt-2.5">
              See your score free. Subscribe for the full report.
            </p>
          </div>

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

      {/* Live from the Leaderboard */}
      <TrackSection name="leaderboard_snapshot">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">Live from the leaderboard</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 font-[family-name:var(--font-display)]">Real scripts. Real scores.</h2>
          <p className="text-sm text-[var(--gem-gray-400)] max-w-2xl leading-relaxed mb-8 sm:mb-12">
            Updated constantly. Top-ranked screenplays from writers building their craft with GEM.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {topScripts && topScripts.length > 0 ? (
              topScripts.map((script, idx) => (
                <div
                  key={script.id}
                  className="p-4 sm:p-5 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] hover:bg-[var(--gem-gray-800)] transition-colors"
                >
                  <div className="text-xs text-[var(--gem-gray-500)] mb-2">#{idx + 1}</div>
                  <h3 className="text-sm font-semibold text-white mb-1 truncate">
                    {script.title || 'Untitled'}
                  </h3>
                  <p className="text-xs text-[var(--gem-gray-400)] mb-3 truncate">
                    by {script.author || 'Anonymous'}
                  </p>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-2xl font-bold text-[var(--gem-accent)]">
                        {typeof script.weighted_score === 'number'
                          ? script.weighted_score.toFixed(1)
                          : 'N/A'}
                      </div>
                      <div className="text-xs text-[var(--gem-gray-400)]">GEM Score</div>
                    </div>
                    {script.tier && (
                      <span className="px-2.5 py-1 rounded-full bg-[var(--gem-accent)]/10 text-xs font-medium text-[var(--gem-accent)]">
                        {script.tier}
                      </span>
                    )}
                  </div>
                  {script.genre && (
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-1 rounded-full bg-[var(--gem-gray-800)] text-xs text-[var(--gem-gray-300)]">
                        {script.genre}
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-[var(--gem-gray-400)]">
                Loading leaderboard...
              </div>
            )}
          </div>

          <div className="mt-8 sm:mt-10 text-center">
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'leaderboard_snapshot', label: 'See all scripts' }}
              className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline"
            >
              See all scripts on the leaderboard
              <ArrowRight size={14} />
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* How it works */}
      <TrackSection name="how_it_works">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 sm:mb-16">Three simple steps.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--gem-accent)] mb-3">1</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Upload your script</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Drop your PDF and GEM instantly analyzes it.
              </p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--gem-accent)] mb-3">2</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Get your producer read</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Score, tier, development notes, and production analysis in under a minute.
              </p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--gem-accent)] mb-3">3</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Publish and climb</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Rewrite and resubmit. Watch your ranking rise on the leaderboard.
              </p>
            </div>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Pricing */}
      <TrackSection name="pricing">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Score your script free. Unlimited. No account needed.</h2>
          <p className="text-sm text-[var(--gem-gray-400)] mb-8 sm:mb-14 max-w-lg">
            Upload as many scripts as you want and see your GEM score and tier instantly.
            Subscribe to unlock the full development read, production analysis, and leaderboard publishing.
          </p>

          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* Free tier */}
              <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] p-5 sm:p-6">
                <div className="text-sm font-semibold text-white mb-1">Free</div>
                <p className="text-xs text-[var(--gem-gray-400)] mb-4">No account required</p>
                <ul className="space-y-2.5">
                  {[
                    'Upload any screenplay',
                    'GEM score + tier instantly',
                    'Unlimited — no account needed',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-[var(--gem-gray-300)]">
                      <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Paid tier */}
              <div className="rounded-2xl border border-[var(--gem-accent)]/40 bg-[var(--gem-accent)]/5 p-5 sm:p-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">$20</span>
                  <span className="text-xs text-[var(--gem-gray-400)]">/ mo</span>
                </div>
                <p className="text-xs text-[var(--gem-gray-400)] mb-4">Cancel anytime</p>
                <ul className="space-y-2.5">
                  {[
                    'Full development reads',
                    'Production analysis',
                    'Publish to leaderboard',
                    'Everything free users see, plus the full report',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-[var(--gem-gray-300)]">
                      <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </TrackSection>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Bottom CTA */}
      <TrackSection name="bottom_cta">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            This script is #{topScripts && topScripts.length > 0 ? '1' : 'trending'} on GEM right now.
          </h2>
          {topScripts && topScripts.length > 0 && (
            <p className="text-lg text-[var(--gem-accent)] mb-6 sm:mb-8">
              &quot;{topScripts[0].title || 'Untitled'}&quot; — {(typeof topScripts[0].weighted_score === 'number' ? topScripts[0].weighted_score.toFixed(1) : 'N/A')} score
            </p>
          )}
          <p className="text-[var(--gem-gray-300)] max-w-lg mx-auto leading-relaxed mb-8 sm:mb-10">
            Where does yours rank?
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <TrackedCTA
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'bottom_cta', label: 'Get Started Free' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Get started free
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
