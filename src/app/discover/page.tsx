// Discover — positioning-first feed, sorted by recency with infinite scroll.
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { InfiniteScriptGrid } from '@/components/discover/infinite-script-grid'
import { SearchBar } from '@/components/discover/search-bar'
import type { LeaderboardEntry } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ q?: string; genre?: string; format?: string }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch filter option universe (all genres/formats across the board) so the
  // pills don't shrink with the first PAGE_SIZE results.
  const { data: allForFilters } = await supabase
    .from('leaderboard')
    .select('genre, format')
    .limit(1000)

  // Total count of scripts on the board — shown as a prominent stat.
  const { count: totalCount } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })

  // Initial page — first PAGE_SIZE rows, recency-ordered.
  let query = supabase.from('leaderboard').select('*')
  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,author_name.ilike.%${params.q}%`)
  }
  if (params.genre) query = query.ilike('genre', `%${params.genre}%`)
  if (params.format) query = query.ilike('format', `%${params.format}%`)
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

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] m-0">
              The Discovery Board
            </h1>
            {typeof totalCount === 'number' && totalCount > 0 && (
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
                {totalCount.toLocaleString()} scripts live
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
          genres={genres}
          formats={formats}
        />

        {scripts.length > 0 ? (
          <InfiniteScriptGrid
            initialScripts={scripts}
            initialLikes={initialLikes}
            loggedIn={!!user}
            filters={{
              q: params.q ?? '',
              genre: params.genre ?? '',
              format: params.format ?? '',
            }}
            hasMoreInitial={scripts.length === PAGE_SIZE}
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-[var(--gem-gray-500)] text-sm">
              {params.q
                ? 'No scripts match your search.'
                : 'Nothing posted yet. Submit a script and publish it to get listed.'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
