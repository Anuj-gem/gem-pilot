import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CheckCircle, Upload, FileText, Megaphone, Sparkles, NotebookPen, Search } from 'lucide-react'
import { LandingTracking } from '@/components/landing-tracking'
import { TrackSection } from '@/components/track-section'
import { TrackedCTA } from '@/components/tracked-cta'
import { LandingExperiments } from '@/components/landing-experiments'
import { MobileNav } from '@/components/mobile-nav'
import { SubscribeCTA } from '@/components/subscribe-cta'
import { createClient } from '@/lib/supabase-server'

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  // OAuth safety net: if Supabase bounced the writer back here with a
  // ?code= because the actual /auth/callback URL wasn't in the allow list,
  // forward it to the callback handler so the session can be exchanged.
  // Without this, the writer ends up stuck on the marketing page with a
  // dangling code that does nothing.
  const sp = await searchParams
  if (sp.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}&next=/submit`)
  }

  const supabase = await createClient()

  // Logged-in writers shouldn't see the marketing page — they already
  // converted. Send them straight to their dashboard so they can find their
  // existing scripts or start a new one. Existing users were getting confused
  // landing on gem.studio and seeing a Sign Up button.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  const { data: topScripts } = await supabase
    .from('leaderboard')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8)

  // Featured sample reports — produced screenplays scored by GEM
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
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/discover" className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors">
              Discover
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
          <MobileNav />
        </div>
      </nav>

      {/* Hero */}
      <TrackSection name="hero">
        <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 sm:pt-24 sm:pb-16 hero-backdrop">
          <div className="absolute -top-20 -right-40 w-80 h-80 bg-gradient-to-br from-violet-200/50 via-amber-100/30 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-32 w-60 h-60 bg-gradient-to-tr from-amber-100/25 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="relative mb-4 sm:mb-6">
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[var(--gem-gold)] font-semibold">For Screenwriters</span>
          </div>
          <h1
            className="relative text-[2.25rem] leading-[1.05] sm:text-5xl md:text-[4rem] font-bold tracking-tight sm:leading-[1.02] mb-4 sm:mb-6 max-w-3xl font-[family-name:var(--font-display)]"
            data-experiment="hero-headline"
          >
            Score your script. Get it in front of the industry.
          </h1>
          <p
            className="relative text-[15px] sm:text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-8 sm:mb-10"
            data-experiment="hero-subhead"
          >
            Every submission gets a full report — score, notes, and the pitch a producer would write. Scripts scoring 75+ earn GEM Select on Discover. First one&apos;s free — unlimited for $20/mo.
          </p>

          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'hero', label: 'Get Started — Free' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm sm:text-base font-semibold hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
            >
              Get Started — Free
              <ArrowRight size={16} />
            </TrackedCTA>
          </div>

          {/* 3-step visual: Upload PDF → Get report → Post on Discover */}
          <div className="relative mt-12 sm:mt-16">
            <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-2xl mx-auto">
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30 flex items-center justify-center mb-2 sm:mb-3">
                  <Upload size={22} className="text-[var(--gem-accent)] sm:hidden" />
                  <Upload size={32} className="text-[var(--gem-accent)] hidden sm:block" />
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--gem-gray-500)]">Step 1</div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--gem-white)]">Get your report</div>
              </div>

              <div className="text-xl sm:text-3xl font-light text-[var(--gem-gray-500)] shrink-0">→</div>

              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-400/30 flex items-center justify-center mb-2 sm:mb-3">
                  <FileText size={22} className="text-amber-400 sm:hidden" />
                  <FileText size={32} className="text-amber-400 hidden sm:block" />
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--gem-gray-500)]">Step 2</div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--gem-white)]">Rewrite to raise your score</div>
              </div>

              <div className="text-xl sm:text-3xl font-light text-[var(--gem-gray-500)] shrink-0">→</div>

              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[var(--gem-gold)]/25 to-[var(--gem-gold)]/5 border border-[var(--gem-gold)]/40 flex items-center justify-center mb-2 sm:mb-3">
                  <Megaphone size={22} className="text-[var(--gem-gold)] sm:hidden" />
                  <Megaphone size={32} className="text-[var(--gem-gold)] hidden sm:block" />
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--gem-gray-500)]">Step 3</div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--gem-white)]">Earn GEM Select</div>
              </div>
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Section 1 — What you get */}
      <TrackSection name="value_props">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">What you get</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 font-[family-name:var(--font-display)]">
            Score. Improve. Get discovered.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-6 sm:p-7 rounded-2xl card-glass">
              <div className="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-4">
                <NotebookPen size={20} className="text-[var(--gem-accent)]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-2">Get your report</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                A commercial viability score plus dimension-by-dimension notes on characters, hook, momentum, and originality &mdash; and a pitch with logline, lead-character breakdowns, and package angles. Private to you.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl card-glass">
              <div className="w-10 h-10 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-4">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-2">Rewrite to raise your score</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Use the notes to sharpen the draft. Resubmit to get a fresh score and see the delta. Pro gets you unlimited evaluations so every draft moves the needle.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl card-glass">
              <div className="w-10 h-10 rounded-lg bg-[var(--gem-gold)]/15 border border-[var(--gem-gold)]/40 flex items-center justify-center mb-4">
                <Megaphone size={20} className="text-[var(--gem-gold)]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-2">Earn GEM Select</h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                Scripts scoring 75+ earn GEM Select on Discover &mdash; the shelf producers and reps browse. Your score stays private; only the designation is public.
              </p>
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Section 2 — Live on Discover */}
      <TrackSection name="discover_snapshot">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gold)] font-medium">Live on Discover</p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 font-[family-name:var(--font-display)]">Writers are posting this week.</h2>
          <p className="text-sm sm:text-base text-[var(--gem-gray-400)] mb-6 sm:mb-8 max-w-2xl leading-relaxed">
            Recent scripts on Discover. Click any to read the full report.
          </p>

          {topScripts && topScripts.length > 0 ? (
            <div className="space-y-3">
              {topScripts.map((script: any, idx: number) => (
                <Link
                  key={script.evaluation_id ?? script.id ?? idx}
                  href={`/report/${script.evaluation_id ?? script.id}`}
                  className="group block rounded-xl card-glass overflow-hidden"
                >
                  <div className="flex" style={{ borderLeft: `4px solid var(--gem-gold)` }}>
                    <div className="flex-1 min-w-0 py-4 sm:py-5 px-4 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold truncate group-hover:text-[var(--gem-accent)] transition-colors">
                            {script.title || 'Untitled'}
                          </h3>
                          <div className="text-xs text-[var(--gem-gray-400)] mt-0.5">
                            by {script.author_name || script.author || 'Anonymous'}
                            {script.created_at && (
                              <>
                                <span className="mx-1.5 text-[var(--gem-gray-500)]">·</span>
                                <span className="text-[var(--gem-gray-500)]">{relativeTime(script.created_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {script.positioning_hook && (
                        <p className="text-xs sm:text-sm text-[var(--gem-gray-300)] mt-2 leading-snug line-clamp-2">
                          {script.positioning_hook}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {script.format && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-medium">
                            {script.format}
                          </span>
                        )}
                        {script.genre && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                            {script.genre}
                          </span>
                        )}
                        {script.genre_tags && Array.isArray(script.genre_tags) && script.genre_tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] font-medium group-hover:underline">
                          View Full Report <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-[var(--gem-gray-400)]">Loading Discover...</p>
          )}

          <div className="mt-6 sm:mt-8">
            <TrackedCTA
              href="/discover"
              event="cta_clicked"
              properties={{ location: 'discover_snapshot', label: 'See all scripts' }}
              className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline font-medium"
            >
              Browse Discover
              <ArrowRight size={14} />
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Section 4 — About Selznick */}
      <TrackSection name="credibility">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">About Selznick</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 font-[family-name:var(--font-display)]">
            Built by writers, for writers.
          </h2>
          <p className="text-sm sm:text-base text-[var(--gem-gray-300)] leading-relaxed">
            GEM is named after David O. Selznick — the producer who discovered Hitchcock and made <em>Gone With the Wind</em>. He had a gift for spotting writers the industry missed. GEM is built to do the same: read a script like a producer and tell the writer what makes it worth making.
          </p>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Section 5 — Pricing */}
      <TrackSection name="pricing">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-3 sm:mb-4">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 font-[family-name:var(--font-display)]">Simple pricing. No hidden fees.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-[var(--gem-gray-700)] p-6 sm:p-8 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-bold">Free</div>
                  <p className="text-xs text-[var(--gem-gray-400)]">No credit card</p>
                </div>
                <div className="text-2xl font-bold text-emerald-600">$0</div>
              </div>
              <ul className="space-y-2.5 mb-5 flex-1">
                {['One free evaluation with full report', 'Read sample reports'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--gem-gray-300)]">
                    <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <TrackedCTA
                href="/submit"
                event="cta_clicked"
                properties={{ location: 'pricing', label: 'Get Started — Free' }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
              >
                Get Started — Free
                <ArrowRight size={14} />
              </TrackedCTA>
            </div>

            <div className="rounded-2xl border border-[var(--gem-accent)]/30 bg-[var(--gem-accent)]/5 p-6 sm:p-8 flex flex-col">
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
              <ul className="space-y-2.5 mb-5 flex-1">
                {['Unlimited script evaluations', 'Feature scripts on Discover', 'Producers can contact you', 'Full reports with production analysis'].map(item => (
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
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* Section 6 — Final CTA */}
      <TrackSection name="bottom_cta">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <TrackedCTA
            href="/submit"
            event="cta_clicked"
            properties={{ location: 'bottom_cta', label: 'Get Started — Free' }}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[var(--gem-accent)] text-white text-base sm:text-lg font-semibold hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
          >
            Get Started — Free
            <ArrowRight size={18} />
          </TrackedCTA>
          <p className="text-sm text-[var(--gem-gray-400)] mt-4">First evaluation free — full report, no credit card.</p>
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
