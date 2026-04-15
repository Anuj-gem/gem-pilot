// Discover — v4 positioning-first feed. Cards lead with the positioning_hook,
// not a score or tier. Default sort is recency; "Most liked" is optional.
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { ScriptGrid } from '@/components/discover/script-grid'
import { SearchBar } from '@/components/discover/search-bar'
import type { LeaderboardEntry } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; genre?: string; format?: string; sort?: string }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase.from('leaderboard').select('*')

  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,author_name.ilike.%${params.q}%`)
  }
  if (params.genre) query = query.ilike('genre', `%${params.genre}%`)
  if (params.format) query = query.ilike('format', `%${params.format}%`)

  // Default: most recent. "liked" = most liked. Score-sort removed.
  if (params.sort === 'liked') {
    query = query.order('like_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
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
    if (likes) userLikes = new Set(likes.map((l) => l.evaluation_id))
  }

  const genres = [...new Set(scripts.map((s) => s.genre).filter(Boolean))]
  const formats = [...new Set(scripts.map((s) => s.format).filter(Boolean))]

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-1 font-[family-name:var(--font-display)]">
            The Discovery Board
          </h1>
          <p className="text-sm text-[var(--gem-gray-500)]">
            Scripts writers are putting in front of producers right now.
          </p>
        </div>

        <SearchBar
          initialQuery={params.q ?? ''}
          initialGenre={params.genre ?? ''}
          initialFormat={params.format ?? ''}
          initialSort={params.sort ?? 'recent'}
          genres={genres}
          formats={formats}
        />

        {scripts.length > 0 ? (
          <ScriptGrid
            scripts={scripts}
            userLikes={Array.from(userLikes)}
            loggedIn={!!user}
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
