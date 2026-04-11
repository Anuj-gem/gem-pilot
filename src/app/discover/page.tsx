import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { ScriptGrid } from '@/components/discover/script-grid'
import { SearchBar } from '@/components/discover/search-bar'
import { TrackedCTA } from '@/components/tracked-cta'
import { TrackSection } from '@/components/track-section'
import { ArrowRight, Search, Sparkles, Target, FileText, Users, CheckCircle } from 'lucide-react'
import type { LeaderboardEntry } from '@/types'

export const dynamic = 'force-dynamic'

function tierColor(tier: string) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

interface PageProps {
  searchParams: Promise<{ q?: string; genre?: string; format?: string; sort?: string }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch top scripts for the teaser grid (blurred for non-producers)
  let query = supabase
    .from('leaderboard')
    .select('*')

  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,author_name.ilike.%${params.q}%`)
  }
  if (params.genre) {
    query = query.ilike('genre', `%${params.genre}%`)
  }
  if (params.format) {
    query = query.ilike('format', `%${params.format}%`)
  }

  if (params.sort === 'likes') {
    query = query.order('like_count', { ascending: false })
  } else if (params.sort === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('weighted_score', { ascending: false })
  }

  query = query.limit(50)

  const { data: entries } = await query
  const scripts = (entries ?? []) as LeaderboardEntry[]

  let userLikes = new Set<string>()
  if (user) {
    const { data: likes } = await supabase
      .from('script_likes')
      .select('evaluation_id')
      .eq('user_id', user.id)
    if (likes) {
      userLikes = new Set(likes.map(l => l.evaluation_id))
    }
  }

  const genres = [...new Set(scripts.map(s => s.genre).filter(Boolean))]
  const formats = [...new Set(scripts.map(s => s.format).filter(Boolean))]

  // Featured sample reports
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
      return {
        slug: r.sample_slug as string,
        title: r.title as string,
        author: r.sample_author as string,
        year: r.sample_year as number | null,
        type: r.sample_type as string,
        genre: r.sample_genre as string | null,
        weighted_score: ev?.weighted_score ?? 0,
        tier: ev?.tier ?? '',
      }
    })
    .filter(s => s.slug && s.weighted_score > 0)
    .sort((a, b) => b.weighted_score - a.weighted_score)

  return (
    <>
      <Nav />

      {/* ─── PRODUCER HERO ─── */}
      <TrackSection name="producer_hero">
        <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 sm:pt-24 sm:pb-16">
          <div className="absolute -top-20 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/30 via-violet-100/20 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="mb-4 sm:mb-6">
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[var(--gem-gold)] font-semibold">For Producers</span>
          </div>
          <h1 className="relative text-[2.25rem] leading-[1.05] sm:text-5xl md:text-[3.5rem] font-bold tracking-tight sm:leading-[1.02] mb-4 sm:mb-6 max-w-3xl font-[family-name:var(--font-display)]">
            Stop reading bad scripts. Start reading the right ones.
          </h1>
          <p className="relative text-[15px] sm:text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-8 sm:mb-10">
            Every screenplay on GEM has been evaluated by Selznick — our proprietary scoring system calibrated against what actually gets produced. Search by genre, score, budget range, and format. Read the full development report before you request a read.
          </p>
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <TrackedCTA
              href="mailto:anuj@gem.studio?subject=Producer%20access%20request"
              event="cta_clicked"
              properties={{ location: 'producer_hero', label: 'Apply for access' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm sm:text-base font-semibold hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
            >
              Apply for producer access
              <ArrowRight size={16} />
            </TrackedCTA>
            <TrackedCTA
              href="/submit"
              event="cta_clicked"
              properties={{ location: 'producer_hero', label: 'Writer CTA' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-600)] transition-colors text-sm"
            >
              I&apos;m a writer — submit my script
            </TrackedCTA>
          </div>
        </section>
      </TrackSection>

      {/* ─── HOW IT WORKS FOR PRODUCERS ─── */}
      <TrackSection name="producer_how_it_works">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl card-glass">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30 flex items-center justify-center mb-3">
                <Search size={18} className="text-violet-400" />
              </div>
              <h3 className="text-sm font-bold mb-1.5">Search the Database</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Filter by genre, format, score, budget level, and tone. Every script has a full Selznick report so you know what you&apos;re getting before you read a single page.
              </p>
            </div>
            <div className="p-5 rounded-2xl card-glass">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-400/30 flex items-center justify-center mb-3">
                <Target size={18} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-bold mb-1.5">Get Matched</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Tell us what you&apos;re looking for — genre, budget, tone — and we&apos;ll surface scripts that fit your slate. New matches delivered as writers submit.
              </p>
            </div>
            <div className="p-5 rounded-2xl card-glass">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-400/5 border border-emerald-400/30 flex items-center justify-center mb-3">
                <FileText size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold mb-1.5">Request a Read</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Found something interesting? Request the full screenplay directly through GEM. The writer gets notified and you get the PDF — no agents, no middlemen.
              </p>
            </div>
          </div>
        </section>
      </TrackSection>

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* ─── SAMPLE REPORTS — proof of Selznick quality ─── */}
      {featuredSamples.length > 0 && (
        <TrackSection name="producer_samples">
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-10 sm:py-16">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Sparkles size={14} className="text-violet-400" />
              <p className="text-xs sm:text-sm uppercase tracking-widest text-violet-400 font-medium">See Selznick in Action</p>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 font-[family-name:var(--font-display)]">
              What if you had this report before reading the script?
            </h2>
            <p className="text-sm text-[var(--gem-gray-400)] mb-6 sm:mb-8 max-w-2xl leading-relaxed">
              Every script on GEM comes with a full Selznick evaluation — the same system that scored these produced screenplays. Click any to see the full report.
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
                      <div className="text-[8px] uppercase tracking-wider text-[var(--gem-gray-500)]">Score</div>
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
          </section>
        </TrackSection>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6"><div className="border-t border-[var(--gem-gray-700)]" /></div>

      {/* ─── BLURRED SCRIPT DATABASE TEASER ─── */}
      <TrackSection name="producer_database_teaser">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4 sm:py-16">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Users size={14} className="text-[var(--gem-gold)]" />
            <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--gem-gold)] font-medium">Script Database</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 font-[family-name:var(--font-display)]">
            Scripts evaluated and ready to read.
          </h2>
          <p className="text-sm text-[var(--gem-gray-400)] mb-6 sm:mb-8 max-w-2xl leading-relaxed">
            Every script below has a full Selznick report — genre, score, development notes, comparable titles, and production analysis. Apply for producer access to search, filter, and request reads.
          </p>
        </section>
      </TrackSection>

      {/* Search + Grid — visible but with overlay CTA */}
      <div className="max-w-5xl mx-auto px-4 relative">
        <SearchBar
          initialQuery={params.q ?? ''}
          initialGenre={params.genre ?? ''}
          initialFormat={params.format ?? ''}
          initialSort={params.sort ?? 'score'}
          genres={genres}
          formats={formats}
        />

        {scripts.length > 0 ? (
          <div className="relative">
            <ScriptGrid scripts={scripts} userLikes={Array.from(userLikes)} loggedIn={!!user} />
            {/* Gradient fade overlay + CTA */}
            <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[var(--gem-bg)] via-[var(--gem-bg)]/90 to-transparent flex flex-col items-center justify-end pb-8">
              <p className="text-sm text-[var(--gem-gray-300)] mb-4 text-center max-w-md">
                Want full access to every script, report, and writer contact?
              </p>
              <TrackedCTA
                href="mailto:anuj@gem.studio?subject=Producer%20access%20request"
                event="cta_clicked"
                properties={{ location: 'database_overlay', label: 'Apply for access' }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
              >
                Apply for producer access
                <ArrowRight size={16} />
              </TrackedCTA>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[var(--gem-gray-400)] text-sm">
              {params.q ? 'No scripts match your search.' : 'Scripts are being added daily. Check back soon.'}
            </p>
          </div>
        )}
      </div>

      {/* ─── WRITER CTA — the real conversion play ─── */}
      <TrackSection name="writer_cta_on_producer_page">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
          <div className="rounded-2xl card-glass p-8 sm:p-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 font-[family-name:var(--font-display)]">
              This is where producers come to find scripts.
            </h2>
            <p className="text-sm sm:text-base text-[var(--gem-gray-400)] max-w-lg mx-auto mb-6 leading-relaxed">
              Every script on this page was submitted by a writer on GEM. Get your evaluation, publish your script, and let producers find you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <TrackedCTA
                href="/submit"
                event="cta_clicked"
                properties={{ location: 'writer_cta_producer_page', label: 'Submit script' }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
              >
                Submit your script — free
                <ArrowRight size={16} />
              </TrackedCTA>
              <TrackedCTA
                href="/sample"
                event="cta_clicked"
                properties={{ location: 'writer_cta_producer_page', label: 'See samples' }}
                className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline font-medium"
              >
                See what your report looks like
                <ArrowRight size={14} />
              </TrackedCTA>
            </div>
          </div>
        </section>
      </TrackSection>
    </>
  )
}
