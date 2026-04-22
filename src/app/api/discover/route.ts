// Paginated discover feed — powers infinite scroll on /discover.
// Returns a page of leaderboard entries filtered by q/genre/format/tab.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

// Public columns — never include weighted_score / tier. Bucket membership is
// derived server-side; scores never leak onto public cards.
const PUBLIC_COLS =
  'evaluation_id, submission_id, title, user_id, author_name, avatar_url, format, genre, tone, genre_tags, logline, positioning_hook, overall_take, like_count, created_at'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const genre = url.searchParams.get('genre') ?? ''
  const format = url.searchParams.get('format') ?? ''
  const tabRaw = url.searchParams.get('tab') ?? ''
  const tab: '' | 'gem-select' = tabRaw === 'gem-select' ? tabRaw : ''
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? '0'))

  const supabase = await createClient()
  let query = supabase.from('leaderboard').select(PUBLIC_COLS)

  if (q) {
    query = query.or(`title.ilike.%${q}%,author_name.ilike.%${q}%`)
  }
  if (genre) query = query.ilike('genre', `%${genre}%`)
  if (format) query = query.ilike('format', `%${format}%`)
  if (tab === 'gem-select') {
    query = query.gte('weighted_score', 75)
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entries = data ?? []
  const { data: { user } } = await supabase.auth.getUser()
  let likedIds: string[] = []
  if (user && entries.length > 0) {
    const ids = entries.map((e: any) => e.evaluation_id)
    const { data: likes } = await supabase
      .from('script_likes')
      .select('evaluation_id')
      .eq('user_id', user.id)
      .in('evaluation_id', ids)
    likedIds = (likes ?? []).map((l: any) => l.evaluation_id)
  }

  return NextResponse.json({
    entries,
    likedIds,
    hasMore: entries.length === PAGE_SIZE,
  })
}
