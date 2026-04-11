import Link from 'next/link'
import { ArrowRight, CheckCircle, Sparkles, Brain, BarChart3, Target, Star, FileText, Users, Trophy } from 'lucide-react'
import { LandingTracking } from '@/components/landing-tracking'
import { TrackSection } from '@/components/track-section'
import { TrackedCTA } from '@/components/tracked-cta'
import { LandingExperiments } from '@/components/landing-experiments'
import { MobileNav } from '@/components/mobile-nav'
import { SubscribeCTA } from '@/components/subscribe-cta'
import { createClient } from '@/lib/supabase-server'

function tierColor(tier: string) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

function tierBg(tier: string) {
  if (tier === 'Greenlight Material') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (tier === 'Optionable') return 'bg-blue-50 text-blue-700 border-blue-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function tierLabel(tier: string) {
  if (tier === 'Greenlight Material') return 'Greenlight'
  if (tier === 'Optionable') return 'Option Ready'
  return 'Shows Promise'
}

export default async function Home() {
  const supabase = await createClient()

  // Featured sample reports — produced screenplays scored by GEM (social proof)
  const { data: sampleRows } = await supabase
    .from('script_submissions')
    .select(`
      sample_slug, title, sample_author, sample_year, sample_type, sample_genre,
      script_evaluations ( weighted_score, tier )
    `)
    .eq('is_sample', true)
    .eq('status', 'completed')

  const featuredSamples = (sampleRows ?? [])
    .map((r: any) => {
      const evRaw = r.script_evaluations
      const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw
      if (!ev) return null
      return {
        slug: r.sample_slug as string,
        title: r.title as string,
        author: (r.sample_author as string) ?? 'Unknown',
        year: (r.sample_year as number | null) ?? null,
        type: (r.sample_type as string) ?? 'Feature',
        genre: (r.sample_genre as string | null) ?? null,
        weighted_score: ev.weighted_score as number,
        tier: ev.tier as string,
      }
    })
    .filter((x: any): x is NonNullable<typeof x> => x !== null)
    .sort((a: any, b: any) => b.weighted_score - a.weighted_score)
    .slice(0, 6)

  return (
    <div className="min-h-screen">
      <LandingTracking />
      <LandingExperiments />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/90 backdrop-blur-sm">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 rotate-45"
              style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)' }}
            />
            <span className="text-lg sm:text-xl font-bold tracking-tight">GEM</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/sample" className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors">
              Samples
            </Link>
            <Link href="/discover" className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors">
              For Producers
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
          {/* Mobile hamburger */}
          <MobileNav />
        </div>
      </nav>

      {/* Hero */}
      <TrackSection name="hero">
        <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 sm:pt-24 sm:pb-16 hero-backdrop">
          {/* Decorative gradient orbs */}
          <div className="absolute -top-20 -right-40 w-80 h-80 bg-gradient-to-br from-violet-200/50 via-amber-100/30 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-32 w-60 h-60 bg-gradient-to-tr from-amber-100/25 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          {/* Eyebrow */}
          <div className="relative mb-4 sm:mb-6">
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[var(--gem-gold)] font-semibold">For Screenwriters &amp; Producers</span>
          </div>
          <h1
            className="relative text-[2.25rem] leading-[1.05] sm:text-5xl md:text-[4rem] font-bold tracking-tight sm:leading-[1.02] mb-4 sm:mb-6 max-w-3xl font-[family-name:var(--font-display)]"
            data-experiment="hero-headline"
          >
            Your script deserves the right producer. We make the introduction.
          </h1>
          <p
            className="relative text-[15px] sm:text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-8 sm:mb-10"
            data-experiment="hero-subhead"
          >
            Submit your screenplay for a free producer-grade evaluation. We identify what makes it strong, match it to the right people, and put it into circulation with our production partners.
          </p>

          {/* Primary + secondary CTA */}
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'hero', label: 'Submit your script' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm sm:text-base font-semibold hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
            >
              Submit your script — free
              <ArrowRight size={16} />
            </TrackedCTA>
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'hero', label: 'For producers' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[var(--gem-gray-700)] text-[var(--gem-gray-200)] text-sm sm:text-base font-medium hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-500)] transition-colors"
            >
              See how it works for producers
            </TrackedCTA>
          </div>

          {/* Equation visual: Eval + Exposure = Break */}
          <div className="relative mt-12 sm:mt-16">
            <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-2xl mx-auto">
              {/* Eval */}
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30 flex items-center justify-center mb-2 sm:mb-3">
                  <FileText size={22} className="text-[var(--gem-accent)] sm:hidden" />
                  <FileText size={32} className="text-[var(--gem-accent)] hidden sm:block" />
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--gem-gray-500)]">Development</div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--gem-white)]">Read</div>
              </div>

              <div className="text-xl sm:text-3xl font-light text-[var(--gem-gray-500)] shrink-0">+</div>

              {/* Exposure */}
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-400/30 flex items-center justify-center mb-2 sm:mb-3">
                  <Users size={22} className="text-amber-400 sm:hidden" />
                  <Users size={32} className="text-amber-400 hidden sm:block" />
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--gem-gray-500)]">Producer</div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--gem-white)]">Match</div>
              </div>

              <div className="text-xl sm:text-3xl font-light text-[var(--gem-gray-500)] shrink-0">=</div>

              {/* Break */}
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[var(--gem-gold)]/25 to-[var(--gem-gold)]/5 border border-[var(--gem-gold)]/40 flex items-center justify-center mb-2 sm:mb-3">
                  <Trophy size={22} className="text-[var(--gem-gold)] sm:hidden" />
                  <Trophy size={32} className="text-[var(--gem-gold)] hidden sm:block" />
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--gem-gray-500)]">Your</div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--gem-white)]">Break</div>
              </div>
            </div>
          </div>
        </section>
      </TrackSection>

      {/* Gold accent divider — Hollywood motif */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
          <Star size={12} className="text-[var(--gem-gold)]" fill="currentColor" />
          <div className="flex-1 h-px bg-[var(--gem-gold)]" />
        </div>
      </div>

      {/* How Producers Use GEM */}
      <TrackSection name="producer_experience">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:py-24">
          <div className="flex items-center gap-2 mb-2 sm:mb-4">
            <Users size={14} className="text-[var(--gem-gold)]" />
            <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gold)] font-medium">The Producer Experience</p>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-display)]">Your scripts land in front of the right people.</h2>
          <p className="text-sm sm:text-base text-[var(--gem-gray-400)] mb-8 sm:mb-12 max-w-2xl">
            Producers on GEM get a curated feed matched to what they&apos;re looking for — plus full access to search the entire database by genre, score, format, and more.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched Feed mockup */}
            <div className="rounded-2xl card-glass p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30 flex items-center justify-center">
                  <Target size={16} className="text-violet-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Personalized Feed</div>
                  <div className="text-[10px] text-[var(--gem-gray-500)]">Matched to your preferences</div>
                </div>
              </div>
              {/* Fake feed items */}
              <div className="space-y-2.5">
                {[
                  { title: 'Untitled Thriller', score: 84, genre: 'Thriller', tag: 'Greenlight' },
                  { title: 'Harbor Lights', score: 77, genre: 'Drama', tag: 'Optionable' },
                  { title: 'The Long Way Back', score: 81, genre: 'Drama', tag: 'Greenlight' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-[var(--gem-gray-800)]/40 border border-[var(--gem-gray-700)]/50 px-3 py-2.5">
                    <div className="text-center shrink-0 w-10">
                      <div className="text-lg font-bold tabular-nums text-[var(--gem-gold)]">{item.score}</div>
                      <div className="text-[7px] uppercase tracking-wider text-[var(--gem-gray-500)]">Score</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">{item.genre}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${item.tag === 'Greenlight' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{item.tag}</span>
                      </div>
                    </div>
                    <ArrowRight size={12} className="text-[var(--gem-gray-500)] shrink-0" />
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[10px] text-[var(--gem-gray-500)] text-center italic">New matches delivered daily based on your slate</div>
            </div>

            {/* Searchable Database mockup */}
            <div className="rounded-2xl card-glass p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-400/30 flex items-center justify-center">
                  <BarChart3 size={16} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Script Database</div>
                  <div className="text-[10px] text-[var(--gem-gray-500)]">Search, filter, discover</div>
                </div>
              </div>
              {/* Fake search/filter UI */}
              <div className="rounded-lg bg-[var(--gem-gray-800)]/40 border border-[var(--gem-gray-700)]/50 p-3 mb-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex-1 h-7 rounded-md bg-[var(--gem-gray-700)]/50 border border-[var(--gem-gray-700)] px-2.5 flex items-center">
                    <span className="text-[10px] text-[var(--gem-gray-500)]">Search by title, genre, logline...</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Feature Film', 'Thriller', 'Score 75+', 'Low Budget'].map((f) => (
                    <span key={f} className="text-[9px] px-2 py-1 rounded-full bg-[var(--gem-accent)]/10 text-[var(--gem-accent)] border border-[var(--gem-accent)]/20 font-medium">{f}</span>
                  ))}
                </div>
              </div>
              {/* Fake results */}
              <div className="space-y-2">
                {[
                  { title: 'Midnight in Marfa', score: 79, format: 'Feature', genres: 'Thriller / Neo-Western' },
                  { title: 'Second Chances', score: 72, format: 'Feature', genres: 'Drama / Romance' },
                  { title: 'The Hollow Men', score: 86, format: 'Feature', genres: 'Thriller / Political' },
                  { title: 'Bright Noise', score: 74, format: 'Feature', genres: 'Comedy / Satire' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-[var(--gem-gray-800)]/30 px-2.5 py-2 border border-[var(--gem-gray-700)]/30">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-white truncate">{item.title}</div>
                      <div className="text-[9px] text-[var(--gem-gray-500)]">{item.format} &middot; {item.genres}</div>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-[var(--gem-gold)] shrink-0 ml-3">{item.score}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[10px] text-[var(--gem-gray-500)] text-center italic">Full reports, contact info, and request reads — all in one place</div>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'producer_experience', label: 'Submit your script' }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
            >
              Submit your script
              <ArrowRight size={14} />
            </TrackedCTA>
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'producer_experience', label: 'Producer info' }}
              className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline font-medium"
            >
              I&apos;m a producer — tell me more
              <ArrowRight size={14} />
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Credibility / Selznick */}
      <TrackSection name="credibility">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[var(--gem-gold)]/10 border border-[var(--gem-gold)]/20 text-[var(--gem-gold)] text-sm sm:text-base font-semibold mb-5 tracking-wide">
              <Sparkles size={16} />
              Powered by Selznick
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-display)]">
              Built to Spot What the Industry Misses
            </h2>
            <p className="text-sm sm:text-base text-[var(--gem-gray-300)] max-w-2xl mx-auto leading-relaxed">
              Selznick reads every script the way a great development executive would &mdash; then goes further. It&apos;s calibrated against thousands of produced films and series, real-world audience data, and the patterns behind content that reached over 500 million people. When we match a script to a producer, we know why it fits.
            </p>
            <p className="text-xs text-[var(--gem-gray-500)] italic max-w-lg mx-auto mt-4">
              Named for David O. Selznick — the producer who saw what others missed. GEM is built to do the same, at scale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto">
            <div className="p-5 rounded-xl card-glass">
              <div className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center mb-3">
                <Brain size={18} className="text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">Deep Script Intelligence</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Every submission is analyzed across character depth, market positioning, narrative structure, tonal coherence, and production viability — so we know exactly who it&apos;s right for.
              </p>
            </div>

            <div className="p-5 rounded-xl card-glass">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                <BarChart3 size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">Calibrated Against What Actually Works</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Built on research across thousands of produced films and series — Selznick knows what succeeds on screen and uses that to evaluate and match new work.
              </p>
            </div>

            <div className="p-5 rounded-xl card-glass">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
                <Target size={18} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">Reports That Move Projects Forward</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Every report reads like a development executive&apos;s notes — strengths, weaknesses, market positioning, comparable titles, and a clear path to what&apos;s next.
              </p>
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Featured Sample Reports — produced screenplays scored by GEM */}
      {featuredSamples.length > 0 && (
        <TrackSection name="featured_samples">
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:py-20">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Sparkles size={14} className="text-violet-400" />
              <p className="text-xs sm:text-sm uppercase tracking-widest text-violet-400 font-medium">GEM Sample Library</p>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-3 font-[family-name:var(--font-display)]">
              See how Selznick reads produced screenplays.
            </h2>
            <p className="text-sm text-[var(--gem-gray-400)] mb-6 sm:mb-8 max-w-2xl leading-relaxed">
              Breaking Bad. Inception. The Sopranos. Game of Thrones. Every sample was evaluated by the same system that reads your script — so you can see exactly what producers will see.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {featuredSamples.map((s) => (
                <Link
                  key={s.slug}
                  href={`/sample/${s.slug}`}
                  className="group block rounded-xl card-glass overflow-hidden p-4"
                  style={{ borderLeft: `4px solid ${tierColor(s.tier)}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate group-hover:text-[var(--gem-accent)] transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-[11px] text-[var(--gem-gray-400)] mt-0.5 truncate">
                        {s.author}{s.year ? ` · ${s.year}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-bold tabular-nums" style={{ color: tierColor(s.tier) }}>
                        {Math.round(s.weighted_score)}
                      </div>
                      <div className="text-[8px] uppercase tracking-wider text-[var(--gem-gray-500)]">GEM Score</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-medium">
                      {s.type}
                    </span>
                    {s.genre && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium truncate max-w-[140px]">
                        {s.genre}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 sm:mt-8">
              <TrackedCTA
                href="/sample"
                event="cta_clicked"
                properties={{ location: 'featured_samples', label: 'Browse all samples' }}
                className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline font-medium"
              >
                Browse all 25 sample reports
                <ArrowRight size={14} />
              </TrackedCTA>
            </div>
          </section>
        </TrackSection>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* How it works — expanded Eval + Exposure = Break */}
      <TrackSection name="how_it_works">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">How GEM works</p>
            <h2 className="text-2xl sm:text-4xl font-bold font-[family-name:var(--font-display)]">
              Development Read&nbsp;+&nbsp;Producer Match&nbsp;=&nbsp;Your Break
            </h2>
            <p className="mt-3 text-sm sm:text-base uppercase tracking-[0.2em] text-[var(--gem-gold)]/90 font-semibold">
              Read. Matched. Circulated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Producer Eval */}
            <div className="p-6 sm:p-7 rounded-2xl card-glass">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30 flex items-center justify-center mb-4">
                <FileText size={22} className="text-[var(--gem-accent)]" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--gem-gray-500)] mb-1">Step One</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 font-[family-name:var(--font-display)]">Development Read</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Upload your screenplay and get a development-grade read in under a minute — score, verdict, development notes, comparable titles, and a full production analysis. Know exactly where you stand before anyone else reads it.
              </p>
            </div>

            {/* Industry Exposure */}
            <div className="p-6 sm:p-7 rounded-2xl card-glass">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-400/30 flex items-center justify-center mb-4">
                <Users size={22} className="text-amber-400" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--gem-gray-500)] mb-1">Step Two</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 font-[family-name:var(--font-display)]">Producer Match</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Based on your script&apos;s genre, tone, budget range, and strengths, we match it to producers actively looking for that kind of project. Top-scoring scripts get direct introductions. Everything else enters the open pipeline.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--gem-gold)]/80">
                <Sparkles size={11} /> Matched by genre, tone, and fit
              </div>
            </div>

            {/* Your Break */}
            <div className="p-6 sm:p-7 rounded-2xl card-glass">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gem-gold)]/25 to-[var(--gem-gold)]/5 border border-[var(--gem-gold)]/40 flex items-center justify-center mb-4">
                <Trophy size={22} className="text-[var(--gem-gold)]" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--gem-gray-500)] mb-1">Step Three</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 font-[family-name:var(--font-display)]">Your Break</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Rewrite, resubmit, and improve your match potential. The best scripts rise — and GEM is built to make sure the right people are watching when they do.
              </p>
            </div>
          </div>

          <div className="text-center mt-10 sm:mt-14">
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'how_it_works', label: 'Submit your script' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-semibold hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
            >
              Submit your script — free
              <ArrowRight size={16} />
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Pricing */}
      <TrackSection name="pricing">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-14 font-[family-name:var(--font-display)]">Other services charge hundreds for generic notes and zero introductions. We do the opposite.</h2>

          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl border border-[var(--gem-gray-700)] p-6 sm:p-8 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-bold">Free</div>
                  <p className="text-xs text-[var(--gem-gray-400)]">No account needed</p>
                </div>
                <div className="text-2xl font-bold text-emerald-600">$0</div>
              </div>
              <ul className="space-y-2.5 mb-5">
                {['Full development read of your script', 'Unlimited submissions'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--gem-gray-300)]">
                    <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <TrackedCTA
                href="/submit"
                event="cta_clicked"
                properties={{ location: 'pricing', label: 'Get your free score' }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
              >
                Get your free score
                <ArrowRight size={14} />
              </TrackedCTA>
            </div>

            <div className="rounded-2xl border border-[var(--gem-accent)]/20 bg-[var(--gem-accent)]/5 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-bold">Pro</div>
                  <p className="text-xs text-[var(--gem-gray-400)]">Everything in Free, plus</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[var(--gem-accent)]">$20</span>
                  <span className="text-xs text-[var(--gem-gray-400)]">/mo</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-5">
                {['Full development reads with production analysis', 'Character breakdowns and market positioning', 'Get your script circulated to production partners', 'Cancel anytime'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--gem-gray-300)]">
                    <CheckCircle size={14} className="text-[var(--gem-accent)] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <SubscribeCTA
                location="pricing"
                label="Start with Pro"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[var(--gem-accent)] text-[var(--gem-accent)] text-sm font-medium hover:bg-[var(--gem-accent)] hover:text-white transition-colors disabled:opacity-50"
              >
                Start with Pro
              </SubscribeCTA>
              <p className="text-xs text-[var(--gem-gray-500)] text-center mt-3">Less than one script coverage — and we actually introduce you to producers.</p>
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Bottom CTA */}
      <TrackSection name="bottom_cta">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-display)]">
            Every great script deserves to be found.
          </h2>

          <p className="text-base sm:text-lg text-[var(--gem-gray-400)] max-w-lg mx-auto leading-relaxed mb-8 sm:mb-10">
            Submit yours, get your development read, and let us put it in front of the right people.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'bottom_cta', label: 'Get Started Free' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
            >
              Submit your script — free
              <ArrowRight size={16} />
            </TrackedCTA>
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'bottom_cta', label: 'Producer CTA' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-600)] transition-colors"
            >
              I&apos;m a producer — tell me more
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      {/* Footer */}
      <footer className="border-t border-[var(--gem-gray-700)] py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM</span>
          <div className="flex items-center gap-4">
            <a href="mailto:info@gem.studio" className="hover:text-[var(--gem-white)] transition-colors">
              Get in touch
            </a>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
