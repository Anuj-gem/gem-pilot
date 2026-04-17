// Paginated discover feed — powers infinite scroll on /discover.
// Returns a page of leaderboard entries filtered by q/genre/format.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const genre = url.searchParams.get('genre') ?? ''
  const format = url.searchParams.get('format') ?? ''
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? '0'))

  const supabase = await createClient()
  let query = supabase.from('leaderboard').select('*')

  if (q) {
    query = query.or(`title.ilike.%${q}%,author_name.ilike.%${q}%`)
  }
  if (genre) query = query.ilike('genre', `%${genre}%`)
  if (format) query = query.ilike('format', `%${format}%`)

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
