import Link from 'next/link'
import { ArrowRight, CheckCircle, Sparkles, Brain, BarChart3, Target, Star } from 'lucide-react'
import { LandingTracking } from '@/components/landing-tracking'
import { TrackSection } from '@/components/track-section'
import { TrackedCTA } from '@/components/tracked-cta'
import { LandingExperiments } from '@/components/landing-experiments'
import { HeroUpload } from '@/components/hero-upload'
import { createClient } from '@/lib/supabase-server'

function tierColor(tier: string) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

function tierBg(tier: string) {
  if (tier === 'Greenlight Material') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (tier === 'Optionable') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function tierLabel(tier: string) {
  if (tier === 'Greenlight Material') return 'Greenlight'
  if (tier === 'Optionable') return 'Optionable'
  return 'Development'
}

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

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <span className="text-lg sm:text-xl font-bold tracking-tight">GEM</span>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/discover" className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors">
              Leaderboard
            </Link>
            <Link href="/login" className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors">
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
        <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-12 sm:pt-24 sm:pb-20">
          {/* Subtle decorative gradient */}
          <div className="absolute -top-20 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-100/40 via-amber-50/30 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-40 w-60 h-60 bg-gradient-to-tr from-emerald-50/30 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <h1
            className="relative text-[1.75rem] leading-[1.15] sm:text-5xl md:text-[3.5rem] font-bold tracking-tight sm:leading-[1.1] mb-5 sm:mb-6 max-w-3xl font-[family-name:var(--font-display)]"
            data-experiment="hero-headline"
          >
            We help you get your screenplay made.
          </h1>
          <p
            className="relative text-base sm:text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-8 sm:mb-10"
            data-experiment="hero-subhead"
          >
            Get a producer-style score and a public leaderboard to showcase your best work to the industry.
          </p>

          {/* Upload — no account needed */}
          <HeroUpload />

          <p className="text-xs text-[var(--gem-gray-500)] mt-4">
            Not ready to submit?{' '}
            <TrackedCTA href="/discover" event="cta_clicked" properties={{ location: 'hero', label: 'Browse the leaderboard' }} className="text-[var(--gem-accent)] hover:underline">Browse the leaderboard</TrackedCTA>
            {' · '}
            <TrackedCTA href="https://calendly.com/anuj-gem/15-minute-intro-call" event="calendly_cta_clicked" properties={{ location: 'hero' }} target="_blank" rel="noopener noreferrer" className="text-[var(--gem-accent)] hover:underline">Talk to our team</TrackedCTA>
            {' · '}
            <TrackedCTA href="/signup" event="cta_clicked" properties={{ location: 'hero', label: 'Create account' }} className="text-[var(--gem-accent)] hover:underline">Create an account</TrackedCTA>
          </p>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Live from the Leaderboard — rich list with tags */}
      <TrackSection name="leaderboard_snapshot">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Star size={14} className="text-[var(--gem-gold)]" />
            <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gold)] font-medium">Live from the leaderboard</p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 font-[family-name:var(--font-display)]">See how your screenplay ranks.</h2>
          <p className="text-sm text-[var(--gem-gray-400)] max-w-2xl leading-relaxed mb-8 sm:mb-10">
            Our leaderboard ranks the top unproduced screenplays we&apos;ve evaluated. Submit yours to see where it ranks.
          </p>

          {topScripts && topScripts.length > 0 ? (
            <div className="rounded-xl border border-[var(--gem-gray-700)] overflow-hidden bg-white/50">
              {topScripts.map((script: any, idx: number) => (
                <Link
                  key={script.evaluation_id ?? script.id ?? idx}
                  href={`/report/${script.evaluation_id ?? script.id}`}
                  className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 sm:py-5 hover:bg-[var(--gem-gray-800)] transition-colors ${
                    idx > 0 ? 'border-t border-[var(--gem-gray-700)]' : ''
                  }`}
                >
                  {/* Rank */}
                  <span className={`w-7 text-center font-bold tabular-nums shrink-0 ${
                    idx < 3 ? 'text-base' : 'text-sm text-[var(--gem-gray-500)]'
                  }`} style={idx < 3 ? { color: 'var(--gem-gold)' } : undefined}>
                    {idx + 1}
                  </span>

                  {/* Title + author + tags */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{script.title || 'Untitled'}</div>
                    <div className="text-xs text-[var(--gem-gray-400)] mt-0.5">{script.author_name || script.author || 'Anonymous'}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {script.format && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                          {script.format}
                        </span>
                      )}
                      {script.genre && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                          {script.genre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score + Verdict */}
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold tabular-nums" style={{ color: tierColor(script.tier ?? '') }}>
                      {typeof script.weighted_score === 'number' ? Math.round(script.weighted_score) : '—'}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-[var(--gem-gray-500)] leading-tight">GEM Score</div>
                    {script.tier && (
                      <div className="mt-1.5">
                        <div className="text-[8px] uppercase tracking-wider text-[var(--gem-gray-500)] mb-0.5">Verdict</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${tierBg(script.tier)}`}>
                          {tierLabel(script.tier)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* View Full Report */}
                  <span className="text-xs text-[var(--gem-accent)] font-medium shrink-0 hidden sm:block">View Report</span>
                  <ArrowRight size={14} className="text-[var(--gem-accent)] shrink-0 hidden sm:block" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-[var(--gem-gray-400)]">Loading leaderboard...</p>
          )}

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'leaderboard_snapshot', label: 'Submit yours' }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Submit yours to see where it ranks
              <ArrowRight size={14} />
            </TrackedCTA>
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'leaderboard_snapshot', label: 'See all scripts' }}
              className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline font-medium"
            >
              See all scripts on the leaderboard
              <ArrowRight size={14} />
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Credibility / Built on Research */}
      <TrackSection name="credibility">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[var(--gem-gold)]/10 border border-[var(--gem-gold)]/20 text-[var(--gem-gold)] text-sm sm:text-base font-semibold mb-5 tracking-wide">
              <Sparkles size={16} />
              The GEM Scoring System
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-display)]">
              Built on real research.<br className="hidden sm:block" /> Not vibes.
            </h2>
            <p className="text-sm sm:text-base text-[var(--gem-gray-300)] max-w-2xl mx-auto leading-relaxed">
              Selznick was developed to identify high-quality writers who may be overlooked by Hollywood.
              Our scoring system is built on thousands of data points, calibrated against real-world
              audience reception and informed by the creative instincts behind content that has collectively
              reached over 500 million people.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto">
            <div className="p-5 rounded-xl bg-gradient-to-br from-[var(--gem-gray-800)] to-white border border-[var(--gem-gray-700)]">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                <Brain size={18} className="text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">Thousands of Signals Per Script</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Every evaluation analyzes thousands of signals across your screenplay — character depth,
                market positioning, structural momentum, tonal coherence — not just a single number from a chatbot.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-[var(--gem-gray-800)] to-white border border-[var(--gem-gray-700)]">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                <BarChart3 size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">Decades of Film &amp; TV Research</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Our system is built on research across thousands of produced films and series going back
                decades — combined with real human insight to calibrate what actually works on screen.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-[var(--gem-gray-800)] to-white border border-[var(--gem-gray-700)]">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
                <Target size={18} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">Producer-Grade Analysis</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Every report reads like a development executive&apos;s notes — strengths, weaknesses,
                market positioning, and a production reality check.
              </p>
            </div>

          </div>

          <div className="text-center mt-8 sm:mt-10">
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'credibility', label: 'See how our system scores your script' }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors mb-4"
            >
              See how our system scores your script
              <ArrowRight size={14} />
            </TrackedCTA>
            <p className="text-xs text-[var(--gem-gray-500)] italic max-w-lg mx-auto">
              Named for David O. Selznick — the producer who discovered talent before anyone else did.
              GEM is built to do the same.
            </p>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* How it works */}
      <TrackSection name="how_it_works">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 sm:mb-16 font-[family-name:var(--font-display)]">Three simple steps.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-5 rounded-xl border border-[var(--gem-gray-700)] bg-gradient-to-b from-[var(--gem-gray-800)] to-transparent">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-[var(--gem-accent)] mb-3">1</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Upload your script</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed mb-3">Drop your PDF and GEM instantly analyzes it across 10 research-backed dimensions.</p>
              <TrackedCTA
                href="/submit"
                event="cta_clicked"
                properties={{ location: 'how_it_works', label: 'Upload now' }}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] hover:underline font-medium"
              >
                Upload now <ArrowRight size={12} />
              </TrackedCTA>
            </div>
            <div className="p-5 rounded-xl border border-[var(--gem-gray-700)] bg-gradient-to-b from-[var(--gem-gray-800)] to-transparent">
              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600 mb-3">2</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Get your free score</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">Score, tier, and a blurred report preview — free, no account needed. Subscribe to unlock the full producer read.</p>
            </div>
            <div className="p-5 rounded-xl border border-[var(--gem-gray-700)] bg-gradient-to-b from-[var(--gem-gray-800)] to-transparent">
              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-sm font-bold text-amber-600 mb-3">3</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Publish and climb</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed mb-3">Rewrite and resubmit. Watch your ranking rise on the leaderboard.</p>
              <TrackedCTA
                href="/discover"
                event="cta_clicked"
                properties={{ location: 'how_it_works', label: 'View the leaderboard' }}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] hover:underline font-medium"
              >
                View the leaderboard <ArrowRight size={12} />
              </TrackedCTA>
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Pricing */}
      <TrackSection name="pricing">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-display)]">Get started free. Seriously.</h2>
          <p className="text-sm text-[var(--gem-gray-400)] mb-8 sm:mb-14 max-w-lg leading-relaxed">
            Get a free score. Get a free report preview. No account needed to try it.
            Create an account to save your reports, or subscribe for the full producer read and leaderboard publishing.
          </p>

          <div className="max-w-md mx-auto grid grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-2xl border border-[var(--gem-gray-700)] p-5 sm:p-6">
              <div className="text-sm font-semibold mb-1">Free</div>
              <p className="text-xs text-[var(--gem-gray-400)] mb-4">No credit card</p>
              <ul className="space-y-2.5">
                {['Free GEM score instantly', 'Free report preview', 'Create an account to save reports', 'Unlimited evaluations'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-[var(--gem-gray-300)]">
                    <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <TrackedCTA
                href="/submit"
                event="cta_clicked"
                properties={{ location: 'pricing', label: 'Get your free score' }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--gem-gray-600)] text-xs font-medium text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-400)] transition-colors"
              >
                Get your free score
              </TrackedCTA>
            </div>
            <div className="rounded-2xl border-2 border-[var(--gem-accent)]/30 bg-indigo-50/50 p-5 sm:p-6">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-bold">$20</span>
                <span className="text-xs text-[var(--gem-gray-400)]">/ mo</span>
              </div>
              <p className="text-xs text-[var(--gem-gray-400)] mb-4">Cancel anytime</p>
              <ul className="space-y-2.5">
                {['Full development reads', 'Production analysis', 'Publish to leaderboard', 'Everything free users get, plus the full report'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-[var(--gem-gray-300)]">
                    <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <TrackedCTA
                href="/submit"
                event="cta_clicked"
                properties={{ location: 'pricing', label: 'Try free first' }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-xs font-medium text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                Try free first
              </TrackedCTA>
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Bottom CTA */}
      <TrackSection name="bottom_cta">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-display)]">
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
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'bottom_cta', label: 'Get Started Free' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Upload your script free
              <ArrowRight size={16} />
            </TrackedCTA>
            <TrackedCTA
              href="https://calendly.com/anuj-gem/15-minute-intro-call"
              event="calendly_cta_clicked"
              properties={{ location: 'bottom_cta' }}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-600)] transition-colors"
            >
              Talk to the founder
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      {/* Footer */}
      <footer className="border-t border-[var(--gem-gray-700)] py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM</span>
          <div className="flex items-center gap-4">
            <a href="https://calendly.com/anuj-gem/15-minute-intro-call" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--gem-white)] transition-colors">
              Talk to us
            </a>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
