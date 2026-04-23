// Industry page (route kept at /discover for backward-compat with existing
// share links + SEO — Anuj 2026-04-23). Rebrand from "Discover" → "Industry".
//
// Tabs:
//   - Recent — all qualified, public scripts (score ≥ 50), sorted by newest.
//     Every script here has already qualified; the feed is a clean list of
//     writer-curated work in front of industry partners.
//   - Recommended for you — gated. Shown to everyone as an apply-for-access
//     teaser. Phase 2 will wire the industry_user role + ranked results.
//
// Scores never leak publicly; they only ever drive who's ELIGIBLE to be
// in the feed, which is the leaderboard view's own is_public gate + the
// qualification threshold.
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { InfiniteScriptGrid } from '@/components/discover/infinite-script-grid'
import { SearchBar } from '@/components/discover/search-bar'
import { RecommendedGate } from '@/components/discover/recommended-gate'
import type { LeaderboardEntry } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

// Public columns — never include weighted_score or tier. Users must not know
// each other's scores; binary qualification is the only public signal.
const PUBLIC_COLS =
  'evaluation_id, submission_id, title, user_id, author_name, avatar_url, format, genre, tone, genre_tags, logline, positioning_hook, overall_take, like_count, created_at'

type TabKey = '' | 'recommended'

interface PageProps {
  searchParams: Promise<{
    q?: string
    genre?: string
    format?: string
    tab?: string
  }>
}

export default async function IndustryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab: TabKey = params.tab === 'recommended' ? 'recommended' : ''
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Filter option universe — full set regardless of current tab/query so
  // dropdowns don't shrink on active filters.
  const { data: allForFilters } = await supabase
    .from('leaderboard')
    .select('genre, format')
    .limit(1000)

  const applyTextFilters = <T,>(q: T): T => {
    let out = q as any
    if (params.q) {
      out = out.or(`title.ilike.%${params.q}%,author_name.ilike.%${params.q}%`)
    }
    if (params.genre) out = out.ilike('genre', `%${params.genre}%`)
    if (params.format) out = out.ilike('format', `%${params.format}%`)
    return out as T
  }

  // One count query now — the Recent feed total. Recommended tab is gated
  // so it shows no count.
  const recentCountQ = applyTextFilters(
    supabase.from('leaderboard').select('*', { count: 'exact', head: true })
  )
  const recentRes = await recentCountQ
  const counts = { recent: recentRes.count ?? 0 }

  // Fetch the Recent page only — Recommended renders the gate without a
  // DB query.
  let scripts: LeaderboardEntry[] = []
  let initialLikes: string[] = []
  if (tab !== 'recommended') {
    const query = applyTextFilters(
      supabase.from('leaderboard').select(PUBLIC_COLS)
    )
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    const { data: entries } = await query
    scripts = (entries ?? []) as LeaderboardEntry[]

    if (user && scripts.length > 0) {
      const ids = scripts.map((s) => s.evaluation_id)
      const { data: likes } = await supabase
        .from('script_likes')
        .select('evaluation_id')
        .eq('user_id', user.id)
        .in('evaluation_id', ids)
      initialLikes = (likes ?? []).map((l) => l.evaluation_id)
    }
  }

  const filterPool = (allForFilters ?? []) as {
    genre: string | null
    format: string | null
  }[]
  const genres = [...new Set(filterPool.map((s) => s.genre).filter(Boolean) as string[])]
  const formats = [...new Set(filterPool.map((s) => s.format).filter(Boolean) as string[])]

  const emptyCopy = params.q
    ? 'No scripts match your search.'
    : 'Nothing posted yet. Submit a script and publish it to get listed.'

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        {/* Hero */}
        <div className="mb-10">
          <div
            className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-3"
            style={{ color: 'var(--gem-gold)' }}
          >
            Industry
          </div>
          <h1
            className="font-semibold leading-[1.05] tracking-tight mb-4 text-[var(--gem-gray-50)]"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(34px, 5.5vw, 52px)',
            }}
          >
            Scripts qualified for industry visibility.
          </h1>
          <p className="text-[15px] sm:text-[17px] text-[var(--gem-gray-300)] leading-[1.6] max-w-[62ch] m-0">
            Every script here has cleared GEM&apos;s quality bar and been put
            forward by its writer. No cold feed, no slush — a curated cross-section
            of what writers are showing industry right now.
          </p>
          {counts.recent > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-[var(--gem-gray-200)]">
                {counts.recent.toLocaleString()} scripts live
              </span>
            </div>
          )}
        </div>

        <SearchBar
          initialQuery={params.q ?? ''}
          initialGenre={params.genre ?? ''}
          initialFormat={params.format ?? ''}
          initialTab={tab}
          genres={genres}
          formats={formats}
          counts={counts}
        />

        {tab === 'recommended' ? (
          <RecommendedGate />
        ) : scripts.length > 0 ? (
          <InfiniteScriptGrid
            // Re-mount on filter change so useState re-initializes with the
            // fresh server-fetched page.
            key={`${tab}|${params.q ?? ''}|${params.genre ?? ''}|${params.format ?? ''}`}
            initialScripts={scripts}
            initialLikes={initialLikes}
            loggedIn={!!user}
            filters={{
              q: params.q ?? '',
              genre: params.genre ?? '',
              format: params.format ?? '',
              tab,
            }}
            hasMoreInitial={scripts.length === PAGE_SIZE}
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-[var(--gem-gray-500)] text-sm">{emptyCopy}</p>
          </div>
        )}
      </div>
    </>
  )
}
