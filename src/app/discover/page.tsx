// Discover — tabbed feed (Recent · GEM Select · Promising).
// All tabs sort by recency. Scores never leak onto public cards.
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { InfiniteScriptGrid } from '@/components/discover/infinite-script-grid'
import { SearchBar } from '@/components/discover/search-bar'
import { GEM_SELECT_MIN } from '@/lib/designation'
import type { LeaderboardEntry } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

// Public columns — never include weighted_score or tier. Users must not know
// each other's scores; bucket membership is the only signal.
const PUBLIC_COLS =
  'evaluation_id, submission_id, title, user_id, author_name, avatar_url, format, genre, tone, genre_tags, logline, positioning_hook, overall_take, like_count, created_at'

type TabKey = '' | 'gem-select'

interface PageProps {
  searchParams: Promise<{
    q?: string
    genre?: string
    format?: string
    tab?: string
  }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab: TabKey = params.tab === 'gem-select' ? params.tab : ''
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch filter option universe so the dropdowns don't shrink with the
  // current tab/query.
  const { data: allForFilters } = await supabase
    .from('leaderboard')
    .select('genre, format')
    .limit(1000)

  // Build the base filter closure so all four queries (3 counts + 1 page)
  // apply q/genre/format consistently.
  const applyTextFilters = <T,>(q: T): T => {
    let out = q as any
    if (params.q) {
      out = out.or(`title.ilike.%${params.q}%,author_name.ilike.%${params.q}%`)
    }
    if (params.genre) out = out.ilike('genre', `%${params.genre}%`)
    if (params.format) out = out.ilike('format', `%${params.format}%`)
    return out as T
  }

  // Count queries (head:true — no rows returned, just counts).
  const recentCountQ = applyTextFilters(
    supabase.from('leaderboard').select('*', { count: 'exact', head: true })
  )
  const gemSelectCountQ = applyTextFilters(
    supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .gte('weighted_score', GEM_SELECT_MIN)
  )

  const [recentRes, gemSelectRes] = await Promise.all([
    recentCountQ,
    gemSelectCountQ,
  ])

  const counts = {
    recent: recentRes.count ?? 0,
    gemSelect: gemSelectRes.count ?? 0,
  }

  // Initial page — apply the tab's bucket filter, but NEVER include
  // weighted_score / tier in the SELECT list. We still filter by them
  // server-side via .gte()/.lt() — those are filters, not projections.
  let query = applyTextFilters(supabase.from('leaderboard').select(PUBLIC_COLS))
  if (tab === 'gem-select') {
    query = query.gte('weighted_score', GEM_SELECT_MIN)
  }
  query = query.order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1)

  const { data: entries } = await query
  const scripts = (entries ?? []) as LeaderboardEntry[]

  let initialLikes: string[] = []
  if (user && scripts.length > 0) {
    const ids = scripts.map((s) => s.evaluation_id)
    const { data: likes } = await supabase
      .from('script_likes')
      .select('evaluation_id')
      .eq('user_id', user.id)
      .in('evaluation_id', ids)
    initialLikes = (likes ?? []).map((l) => l.evaluation_id)
  }

  const filterPool = (allForFilters ?? []) as { genre: string | null; format: string | null }[]
  const genres = [...new Set(filterPool.map((s) => s.genre).filter(Boolean) as string[])]
  const formats = [...new Set(filterPool.map((s) => s.format).filter(Boolean) as string[])]

  // Tab-scoped empty-state copy.
  const emptyCopy = params.q
    ? 'No scripts match your search.'
    : tab === 'gem-select'
      ? 'No GEM Select scripts yet. Keep an eye on this tab — scoring rolls out as new scripts post.'
      : 'Nothing posted yet. Submit a script and publish it to get listed.'

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] m-0">
              The Discovery Board
            </h1>
            {counts.recent > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  color: 'var(--gem-gold)',
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {counts.recent.toLocaleString()} scripts live
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--gem-gray-500)]">
            Scripts writers are putting in front of producers right now.
          </p>
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

        {scripts.length > 0 ? (
          <InfiniteScriptGrid
            // Re-mount when filters change so useState re-initializes with the
            // new server-fetched page. Without this key, switching tabs updates
            // the URL + server data but the client keeps showing the old list
            // until a hard refresh.
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
