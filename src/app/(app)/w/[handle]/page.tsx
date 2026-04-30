// /w/[handle] — public writer profile.
// Anuj 2026-04-29 (v0.3).

import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import Nav from '@/components/nav'
import { WriterCard } from '@/components/writer-card'
import { FollowButton } from '@/components/follow-button'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'

interface PageProps { params: Promise<{ handle: string }> }

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function PublicProfile({ params }: PageProps) {
  const { handle } = await params
  const service = svc()
  const auth = await createClient()
  const { data: { user: viewer } } = await auth.auth.getUser()

  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, handle, headline, bio, imdb_url, avatar_url, created_at')
    .ilike('handle', handle)
    .maybeSingle<{
      id: string; full_name: string | null; handle: string | null
      headline: string | null; bio: string | null; imdb_url: string | null
      avatar_url: string | null; created_at: string
    }>()
  if (!profile) notFound()

  const isOwner = viewer?.id === profile.id

  // Public scripts (Discover-published) — used as the portfolio surface.
  // Two-pass query: pull submissions first, then evaluations in a batch.
  // The embedded `script_evaluations(...)` join was silently dropping
  // scripts because PostgREST has multiple FK paths from the eval table
  // to submissions (active + pending tables) and the embedded shape
  // came back empty for some scripts. Anuj 2026-04-30 fix.
  const { data: subs } = await service
    .from('script_submissions')
    .select('id, title, created_at, declared_format')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  type SubRow = { id: string; title: string; created_at: string; declared_format: string | null }
  const subRows = (subs as SubRow[] | null) || []

  type EvalRow = { id: string; submission_id: string; weighted_score: number | null; tier: string | null; evaluation: unknown }
  const evalBySub = new Map<string, EvalRow>()
  if (subRows.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, tier, evaluation')
      .in('submission_id', subRows.map((s) => s.id))
    for (const e of (evs as EvalRow[] | null) || []) evalBySub.set(e.submission_id, e)
  }

  type Script = {
    id: string; title: string; created_at: string; declared_format: string | null
    script_evaluations: { id: string; weighted_score: number | null; tier: string | null; evaluation: unknown }[] | null
  }
  const publicScripts: Script[] = subRows.map((s) => {
    const ev = evalBySub.get(s.id)
    return {
      id: s.id,
      title: s.title,
      created_at: s.created_at,
      declared_format: s.declared_format,
      script_evaluations: ev
        ? [{ id: ev.id, weighted_score: ev.weighted_score, tier: ev.tier, evaluation: ev.evaluation }]
        : null,
    }
  })

  // Batch script community stats (review count + avg peer score)
  const scriptStats = await getScriptStats(publicScripts.map((s) => s.id))

  // Reviews written — peer reviews this user has authored
  const { data: writtenRaw } = await service
    .from('peer_reviews')
    .select(`
      id, score, body, created_at, submission_id,
      script_submissions ( id, title, script_evaluations ( id ), profiles ( handle, full_name ) )
    `)
    .eq('reviewer_id', profile.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  const reviewsWritten = ((writtenRaw as any[]) || []).map((r) => ({
    id: r.id, score: r.score, body: r.body, created_at: r.created_at,
    script: r.script_submissions ? {
      id: r.script_submissions.id, title: r.script_submissions.title,
      eval_id: r.script_submissions.script_evaluations?.[0]?.id ?? null,
      writer_handle: r.script_submissions.profiles?.handle ?? null,
      writer_name: r.script_submissions.profiles?.full_name ?? null,
    } : null,
  }))

  // Follow counts + viewer's follow state
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    service.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', profile.id),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])
  let viewerFollows = false
  if (viewer && viewer.id !== profile.id) {
    const { data: rel } = await service
      .from('follows')
      .select('id')
      .eq('follower_id', viewer.id)
      .eq('followee_id', profile.id)
      .maybeSingle<{ id: string }>()
    viewerFollows = !!rel
  }

  // Stats
  const topScore = publicScripts.reduce((m, s) => {
    const w = s.script_evaluations?.[0]?.weighted_score ?? null
    return w != null && w > m ? w : m
  }, 0)
  // Community average across this writer's public scripts (only those with reviews)
  const scoresWithReviews: number[] = []
  for (const id of publicScripts.map((s) => s.id)) {
    const st = scriptStats.get(id)
    if (st && st.reviewCount > 0 && st.avgPeerScore != null) {
      scoresWithReviews.push(st.avgPeerScore)
    }
  }
  const writerCommunityAvg = scoresWithReviews.length
    ? scoresWithReviews.reduce((a, b) => a + b, 0) / scoresWithReviews.length
    : null
  const totalReviewsReceived = publicScripts.reduce(
    (sum, s) => sum + (scriptStats.get(s.id)?.reviewCount ?? 0),
    0
  )
  const stats = {
    publicScripts: publicScripts.length,
    topScore: topScore || null,
    communityAvg: writerCommunityAvg,
    reviewsReceived: totalReviewsReceived,
    reviewsWritten: reviewsWritten.length,
    followers: followerCount ?? 0,
    following: followingCount ?? 0,
  }

  // Activity recency — last published + last review given
  const lastPublishedAt = publicScripts[0]?.created_at ?? null
  const lastReviewWrittenAt = reviewsWritten[0]?.created_at ?? null
  function ago(iso: string | null): string | null {
    if (!iso) return null
    const d = Date.now() - new Date(iso).getTime()
    const day = 86_400_000
    const days = Math.floor(d / day)
    if (days < 1) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }
  const lastPub = ago(lastPublishedAt)
  const lastRev = ago(lastReviewWrittenAt)

  const displayName = profile.full_name || profile.handle || 'Anonymous writer'
  const initials = displayName.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '·'

  return (
    <div>
      <header className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex items-start gap-5">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover bg-gray-100 shrink-0 ring-2 ring-purple-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-3xl font-bold shrink-0 ring-2 ring-purple-100">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[28px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                {displayName}
              </h1>
              <div className="text-[14px] text-purple-700 font-mono mt-0.5">@{profile.handle}</div>
              {profile.headline && (
                <p className="text-[15px] text-gray-800 mt-3 leading-snug font-medium">{profile.headline}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {!isOwner && viewer && (
                  <FollowButton followeeId={profile.id} initiallyFollowing={viewerFollows} />
                )}
                {profile.imdb_url && (
                  <a
                    href={profile.imdb_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-100"
                  >
                    IMDb ↗
                  </a>
                )}
                {isOwner && (
                  <>
                    <Link href="/profile" className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                      Edit profile →
                    </Link>
                    <Link href="/following" className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                      Manage follows →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          {profile.bio && (
            <p className="text-[15px] text-gray-700 mt-5 leading-relaxed whitespace-pre-wrap border-t border-gray-100 pt-5">
              {profile.bio}
            </p>
          )}
          {(lastPub || lastRev) && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-[12px] text-gray-500 flex items-center gap-3 flex-wrap">
              {lastPub && (
                <span><span className="font-semibold text-gray-700">Last published</span> {lastPub}</span>
              )}
              {lastPub && lastRev && <span className="text-gray-300">·</span>}
              {lastRev && (
                <span><span className="font-semibold text-gray-700">Last review given</span> {lastRev}</span>
              )}
            </div>
          )}
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-10">
          <Stat label="Followers" value={stats.followers} href={`/w/${profile.handle}/followers`} />
          <Stat label="Following" value={stats.following} href={`/w/${profile.handle}/following`} />
          <Stat label="Scripts" value={stats.publicScripts} />
          <Stat label="Top GEM" value={stats.topScore != null ? Math.round(stats.topScore) : '—'} />
          <Stat label="Community avg" value={stats.communityAvg != null ? Math.round(stats.communityAvg) : '—'} />
          <Stat label="Reviews in" value={stats.reviewsReceived} />
        </div>

        {/* Earned tiers — derived from current stats */}
        {(() => {
          const badges: { label: string; cls: string }[] = []
          if (stats.publicScripts >= 1) badges.push({ label: 'Writer', cls: 'bg-purple-50 text-purple-700 border-purple-200' })
          if (stats.publicScripts >= 5) badges.push({ label: 'Prolific', cls: 'bg-purple-100 text-purple-800 border-purple-300' })
          if (stats.communityAvg != null && stats.communityAvg >= 80) badges.push({ label: 'Strong community score', cls: 'bg-purple-50 text-purple-800 border-purple-200' })
          if (stats.reviewsWritten >= 1) badges.push({ label: 'Reviewer', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' })
          if (stats.reviewsWritten >= 10) badges.push({ label: 'Top reviewer', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' })
          if (stats.followers >= 10) badges.push({ label: 'Followed', cls: 'bg-pink-50 text-pink-800 border-pink-200' })
          return badges.length ? (
            <div className="flex flex-wrap gap-2 -mt-7 mb-10">
              {badges.map((b) => (
                <span key={b.label} className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${b.cls}`}>{b.label}</span>
              ))}
            </div>
          ) : null
        })()}

        {/* Public scripts */}
        <Section title="Scripts">
          {publicScripts.length === 0 ? (
            <Empty>No public scripts yet.</Empty>
          ) : (
            <div className="space-y-3">
              {publicScripts.map((s) => {
                const ev = s.script_evaluations?.[0]
                if (!ev) return null
                const st = scriptStats.get(s.id)
                const evJson = ev.evaluation as any
                const logline = evJson?.format_detection?.logline_one_line || evJson?.positioning_hook || null
                const genre = evJson?.classification?.genre_primary || evJson?.format_detection?.genre_primary || null
                const cardData: ScriptCardData = {
                  submission_id: s.id,
                  evaluation_id: ev.id,
                  title: s.title,
                  format: s.declared_format,
                  genre,
                  logline,
                  selznick_score: ev.weighted_score,
                  tier: ev.tier,
                  writer_handle: profile.handle,
                  writer_name: profile.full_name,
                  review_count: st?.reviewCount ?? 0,
                  avg_peer_score: st?.avgPeerScore ?? null,
                }
                return <ScriptCard key={s.id} s={cardData} density="list" />
              })}
            </div>
          )}
        </Section>

        {/* Reviews written */}
        <Section title="Reviews written">
          {reviewsWritten.length === 0 ? (
            <Empty>No reviews written yet.</Empty>
          ) : (
            <div className="space-y-3">
              {reviewsWritten.map((r) => {
                const cardHref = r.script?.eval_id ? `/report/${r.script.eval_id}` : null
                const card = (
                  <div className={`rounded-xl border border-gray-200 bg-white p-4 ${cardHref ? 'hover:bg-gray-50 hover:border-purple-200 transition-colors cursor-pointer' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-[13px] text-gray-500 leading-snug">
                        Reviewed{' '}
                        <span className="font-semibold text-gray-900">
                          {r.script?.title ?? 'a script'}
                        </span>{' '}
                        by{' '}
                        {r.script?.writer_handle ? (
                          <span className="font-semibold text-purple-700">
                            {r.script.writer_name || `@${r.script.writer_handle}`}
                          </span>
                        ) : (
                          <span>{r.script?.writer_name || '—'}</span>
                        )}
                      </div>
                      <ScoreBadge score={r.score} />
                    </div>
                    <p className="text-[14px] text-gray-700 leading-relaxed line-clamp-3">{r.body}</p>
                    {r.script?.writer_handle && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                        View writer:{' '}
                        <Link
                          href={`/w/${r.script.writer_handle}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-purple-700 hover:underline"
                        >
                          @{r.script.writer_handle}
                        </Link>
                      </div>
                    )}
                  </div>
                )
                return cardHref ? (
                  <Link key={r.id} href={cardHref} className="block">
                    {card}
                  </Link>
                ) : (
                  <div key={r.id}>{card}</div>
                )
              })}
            </div>
          )}
        </Section>
    </div>
  )
}

function Stat({ label, value, href }: { label: string; value: number | string | null; href?: string }) {
  const inner = (
    <>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value ?? '—'}</div>
      <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-gray-500 mt-1">{label}</div>
    </>
  )
  if (href) {
    return (
      <Link href={href} className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-center hover:bg-gray-50 hover:border-purple-200 transition-colors">
        {inner}
      </Link>
    )
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-center">{inner}</div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400">
      {children}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="shrink-0 flex flex-col items-center justify-center rounded" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.30)', minWidth: 44, padding: '3px 8px' }}>
      <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-purple-700 leading-none">Score</span>
      <span className="text-[15px] font-bold text-gray-900 tabular-nums leading-none mt-0.5">{score}</span>
    </div>
  )
}
