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

  // Fetch public leaderboard from view
  let query = supabase
    .from('leaderboard')
    .select('*')

  // Search by title or author
  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,author_name.ilike.%${params.q}%`)
  }

  // Filter by genre
  if (params.genre) {
    query = query.ilike('genre', `%${params.genre}%`)
  }

  // Filter by format
  if (params.format) {
    query = query.ilike('format', `%${params.format}%`)
  }

  // Sort
  if (params.sort === 'likes') {
    query = query.order('like_count', { ascending: false })
  } else if (params.sort === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else {
    // Default: score descending
    query = query.order('weighted_score', { ascending: false })
  }

  query = query.limit(50)

  const { data: entries } = await query
  const scripts = (entries ?? []) as LeaderboardEntry[]

  // Get user's likes so we can show filled hearts
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

  // Get distinct genres and formats for filters
  const genres = [...new Set(scripts.map(s => s.genre).filter(Boolean))]
  const formats = [...new Set(scripts.map(s => s.format).filter(Boolean))]

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-1 font-[family-name:var(--font-display)]">Leaderboard</h1>
          <p className="text-sm text-[var(--gem-gray-400)]">
            The best scripts scored by GEM — updated live
          </p>
        </div>

        <SearchBar
          initialQuery={params.q ?? ''}
          initialGenre={params.genre ?? ''}
          initialFormat={params.format ?? ''}
          initialSort={params.sort ?? 'score'}
          genres={genres}
          formats={formats}
        />

        {scripts.length > 0 ? (
          <ScriptGrid scripts={scripts} userLikes={Array.from(userLikes)} loggedIn={!!user} />
        ) : (
          <div className="text-center py-20">
            <p className="text-[var(--gem-gray-400)] text-sm">
              {params.q
                ? 'No scripts match your search.'
                : 'No public scripts yet. Submit your script and make it public to appear here.'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
