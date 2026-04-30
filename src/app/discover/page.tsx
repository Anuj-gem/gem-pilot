// /discover — community surface (login-gated).
// v0.5 Phase B: tabs (Recent / Top Selznick / Top Community / Most Reviewed),
// format filter (Feature / Series / All), sidebar leaderboards (Prolific +
// Top Reviewers), and a Featured row at top.
//
// Anuj 2026-04-29.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ sort?: string; format?: string }>
}

const SORTS = [
  { id: 'recent', label: 'Recent' },
  { id: 'top_selznick', label: 'Top Selznick' },
  { id: 'top_community', label: 'Top community' },
  { id: 'most_reviewed', label: 'Most reviewed' },
] as const
type SortId = (typeof SORTS)[number]['id']

const FORMATS = [
  { id: 'all', label: 'All' },
  { id: 'feature', label: 'Features' },
  { id: 'series', label: 'Series' },
] as const

export default async function DiscoverPage({ searchParams }: PageProps) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/discover')

  const sp = await searchParams
  const sort: SortId = (SORTS.some((s) => s.id === sp.sort) ? sp.sort : 'recent') as SortId
  const format = (FORMATS.some((f) => f.id === sp.format) ? sp.format : 'all') as 'all' | 'feature' | 'series'

  const service = svc()

  // Pull a wide pool of public scripts. We sort and filter client-side so we
  // can apply community-stat-based sorts without nasty SQL.
  let baseQuery = service
    .from('script_submissions')
    .select(`
      id, title, declared_format, created_at, user_id,
      script_evaluations ( id, weighted_score ),
      profiles ( handle, full_name, avatar_url, headline )
    `)
    .eq('is_public', true)
    .eq('status', 'completed')
    .limit(200)
  if (format !== 'all') {
    baseQuery = baseQuery.eq('declared_format', format)
  }
  const { data: rows } = await baseQuery

  type Row = {
    id: string; title: string; declared_format: string | null
    created_at: string; user_id: string | null
    script_evaluations: { id: string; weighted_score: number | null }[] | null
    profiles: { handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null } | null
  }
  const scripts = (rows as Row[] | null) || []
  const stats = await getScriptStats(scripts.map((s) => s.id))

  // Build card data with stats
  const cards = scripts.map((s) => {
    const ev = s.script_evaluations?.[0]
    const st = stats.get(s.id)
    return {
      sortable: {
        recent: new Date(s.created_at).getTime(),
        selznick: ev?.weighted_score ?? 0,
        community: st?.avgPeerScore ?? 0,
        reviews: st?.reviewCount ?? 0,
      },
      data: {
        submission_id: s.id,
        evaluation_id: ev?.id ?? null,
        title: s.title,
        format: s.declared_format,
        selznick_score: ev?.weighted_score ?? null,
        writer_handle: s.profiles?.handle ?? null,
        writer_name: s.profiles?.full_name ?? null,
        review_count: st?.reviewCount ?? 0,
        avg_peer_score: st?.avgPeerScore ?? null,
      } as ScriptCardData,
    }
  })

  // Apply sort
  const sortKey: keyof typeof cards[0]['sortable'] =
    sort === 'top_selznick' ? 'selznick'
    : sort === 'top_community' ? 'community'
    : sort === 'most_reviewed' ? 'reviews'
    : 'recent'
  const sortedCards = [...cards].sort((a, b) => b.sortable[sortKey] - a.sortable[sortKey])
  const visibleCards = sortedCards.slice(0, 60)

  // Featured row — this week's top Selznick + this week's most reviewed
  const weekAgo = Date.now() - 7 * 86_400_000
  const thisWeek = cards.filter((c) => c.sortable.recent >= weekAgo)
  const featuredTopScore = [...thisWeek].sort((a, b) => b.sortable.selznick - a.sortable.selznick)[0]
  const featuredMostReviewed = [...thisWeek].sort((a, b) => b.sortable.reviews - a.sortable.reviews)[0]
  const showFeatured = featuredTopScore || featuredMostReviewed

  // Most prolific writers — count public scripts per user
  const { data: allPublic } = await service
    .from('script_submissions')
    .select('user_id, profiles ( handle, full_name, avatar_url )')
    .eq('is_public', true)
    .eq('status', 'completed')
    .limit(2000)
  type ProWriter = { id: string; handle: string | null; full_name: string | null; avatar_url: string | null; count: number }
  const byUser = new Map<string, ProWriter>()
  for (const r of (allPublic as any[] | null) || []) {
    if (!r.user_id || !r.profiles) continue
    const cur = byUser.get(r.user_id)
    if (cur) cur.count += 1
    else byUser.set(r.user_id, {
      id: r.user_id, handle: r.profiles.handle ?? null, full_name: r.profiles.full_name ?? null,
      avatar_url: r.profiles.avatar_url ?? null, count: 1,
    })
  }
  const prolific = Array.from(byUser.values()).sort((a, b) => b.count - a.count).slice(0, 10)

  // Top reviewers — count peer_reviews per reviewer
  const { data: revRows } = await service
    .from('peer_reviews')
    .select('reviewer_id, profiles!peer_reviews_reviewer_id_fkey ( handle, full_name, avatar_url )')
    .is('deleted_at', null)
    .limit(2000)
  type Reviewer = { id: string; handle: string | null; full_name: string | null; avatar_url: string | null; count: number }
  const byReviewer = new Map<string, Reviewer>()
  for (const r of (revRows as any[] | null) || []) {
    if (!r.reviewer_id || !r.profiles) continue
    const cur = byReviewer.get(r.reviewer_id)
    if (cur) cur.count += 1
    else byReviewer.set(r.reviewer_id, {
      id: r.reviewer_id, handle: r.profiles.handle ?? null, full_name: r.profiles.full_name ?? null,
      avatar_url: r.profiles.avatar_url ?? null, count: 1,
    })
  }
  const topReviewers = Array.from(byReviewer.values()).sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-7">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-2">Discover</p>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            What the GEM community is making.
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar leaderboards */}
          <aside className="space-y-7">
            <Leaderboard title="Most prolific" rows={prolific.map((w) => ({ ...w, secondary: `${w.count} ${w.count === 1 ? 'script' : 'scripts'}` }))} />
            <Leaderboard title="Top reviewers" rows={topReviewers.map((w) => ({ ...w, secondary: `${w.count} ${w.count === 1 ? 'review' : 'reviews'}` }))} />
          </aside>

          {/* Main column */}
          <section>
            {/* Featured row */}
            {showFeatured && (
              <div className="mb-7">
                <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber-700 mb-3">This week</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featuredTopScore && (
                    <FeaturedCard label="Top score" data={featuredTopScore.data} accent="purple" />
                  )}
                  {featuredMostReviewed && featuredMostReviewed.data.submission_id !== featuredTopScore?.data.submission_id && (
                    <FeaturedCard label="Most reviewed" data={featuredMostReviewed.data} accent="amber" />
                  )}
                </div>
              </div>
            )}

            {/* Sort + filter tabs */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-1">
                {SORTS.map((s) => {
                  const active = s.id === sort
                  const params = new URLSearchParams()
                  params.set('sort', s.id)
                  if (format !== 'all') params.set('format', format)
                  return (
                    <Link
                      key={s.id}
                      href={`/discover?${params.toString()}`}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-bold ${active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {s.label}
                    </Link>
                  )
                })}
              </div>
              <div className="flex items-center gap-1">
                {FORMATS.map((f) => {
                  const active = f.id === format
                  const params = new URLSearchParams()
                  if (sort !== 'recent') params.set('sort', sort)
                  if (f.id !== 'all') params.set('format', f.id)
                  return (
                    <Link
                      key={f.id}
                      href={`/discover${params.toString() ? '?' + params.toString() : ''}`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      {f.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            {visibleCards.length === 0 ? (
              <Empty>No scripts here yet.</Empty>
            ) : (
              <div className="space-y-1">
                {visibleCards.map((c) => (
                  <ScriptCard key={c.data.submission_id} s={c.data} density="list" />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function Leaderboard({
  title, rows,
}: {
  title: string
  rows: { id: string; handle: string | null; full_name: string | null; avatar_url: string | null; secondary: string }[]
}) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500 mb-3">{title}</div>
      {rows.length === 0 ? (
        <Empty>None yet.</Empty>
      ) : (
        <div className="space-y-1">
          {rows.map((w) => {
            const ini = (w.full_name || w.handle || '·').split(/\s+/).slice(0,2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
            return (
              <Link
                key={w.id}
                href={w.handle ? `/w/${w.handle}` : '#'}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {w.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100" />
                ) : (
                  <div className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-[12px]" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>{ini}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13.5px] text-gray-900 truncate">{w.full_name || w.handle}</div>
                  <div className="text-[11.5px] text-gray-500">{w.secondary}</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FeaturedCard({ label, data, accent }: { label: string; data: ScriptCardData; accent: 'purple' | 'amber' }) {
  const ev = data.evaluation_id
  if (!ev) return null
  const score = data.selznick_score != null ? Math.round(Number(data.selznick_score)) : null
  const accentBg = accent === 'amber'
    ? 'linear-gradient(135deg,#d4a017,#f59e0b)'
    : 'linear-gradient(135deg,#7c3aed,#a855f7)'
  const ringClass = accent === 'amber' ? 'border-amber-300' : 'border-purple-300'
  return (
    <Link
      href={`/report/${ev}`}
      className={`block rounded-xl border-2 ${ringClass} bg-white p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-3">
        {score != null && (
          <div className="shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-white font-extrabold text-[20px]" style={{ background: accentBg }}>{score}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] font-bold tracking-[0.16em] uppercase ${accent === 'amber' ? 'text-amber-700' : 'text-purple-700'} mb-1`}>{label}</div>
          <div className="text-[15px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{data.title}</div>
          <div className="text-[12px] text-gray-500 mt-1 truncate">
            {data.format || '—'}
            {data.writer_handle && (<> · <span className="text-purple-700 font-semibold">@{data.writer_handle}</span></>)}
            {(data.review_count ?? 0) > 0 && <> · <strong>{data.review_count}</strong> reviews</>}
          </div>
        </div>
      </div>
    </Link>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400">{children}</div>
  )
}
