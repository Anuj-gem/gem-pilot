// SocialDashboardTop — v0.4 social-feel section that lives at the top of
// the dashboard. Renders profile hero, action-needed strip, following feed,
// and a Discover preview. Anuj 2026-04-29.
//
// This is a server component that handles its own queries so the existing
// dashboard page stays lean. Everything routes via real /report/[id] and
// /w/[handle] links so all the velocity points the user asked for hold.

import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'

interface ProfileShape {
  id: string
  full_name: string | null
  handle: string | null
  headline: string | null
  avatar_url: string | null
}

interface Props {
  user: { id: string; email?: string | null }
  profile: ProfileShape
}

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

function avatarStyle(seed: string) {
  // Simple deterministic gradient pair from a seed string
  const palettes = [
    ['#7c3aed', '#ec4899'],
    ['#a855f7', '#c084fc'],
    ['#f59e0b', '#fbbf24'],
    ['#ec4899', '#f472b6'],
    ['#0ea5e9', '#38bdf8'],
    ['#10b981', '#34d399'],
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const [a, b] = palettes[Math.abs(h) % palettes.length]
  return { background: `linear-gradient(135deg, ${a}, ${b})` }
}

function initials(s: string | null) {
  if (!s) return '·'
  return s.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
}

function ago(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export async function SocialDashboardTop({ user, profile }: Props) {
  const service = svc()

  // Stats
  const [
    { count: followerCount },
    { count: followingCount },
    { count: reviewCount },
    { count: scriptCount },
  ] = await Promise.all([
    service.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', user.id),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    service.from('peer_reviews').select('id', { count: 'exact', head: true }).eq('reviewer_id', user.id).is('deleted_at', null),
    service.from('script_submissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
  ])

  // Action-needed: pending review invites for this user + recent peer reviews on user's scripts
  const { data: invites } = await service
    .from('review_invites')
    .select(`
      id, submission_id,
      script_submissions ( id, title, script_evaluations ( id ), profiles ( handle, full_name ) )
    `)
    .eq('invited_user_id', user.id)
    .eq('status', 'accepted')
    .limit(5)

  const { data: recentReviews } = await service
    .from('peer_reviews')
    .select(`
      id, score, created_at, submission_id,
      script_submissions ( id, title, user_id, script_evaluations ( id ) ),
      profiles!peer_reviews_reviewer_id_fkey ( handle, full_name )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const myReviewNotices = ((recentReviews as any[]) || [])
    .filter((r) => r.script_submissions?.user_id === user.id)
    .slice(0, 5)

  // Followed users → activity feed
  const { data: followsRows } = await service
    .from('follows')
    .select('followee_id')
    .eq('follower_id', user.id)
  const followedIds = (followsRows || []).map((r: any) => r.followee_id) as string[]

  let feed: Array<{
    type: 'script' | 'review' | 'follow'
    when: string
    actor: { name: string; handle: string | null }
    payload: any
  }> = []

  if (followedIds.length > 0) {
    const [{ data: pubScripts }, { data: pubReviews }] = await Promise.all([
      service
        .from('script_submissions')
        .select(`
          id, title, declared_format, created_at, user_id,
          script_evaluations ( id, weighted_score ),
          profiles ( handle, full_name )
        `)
        .in('user_id', followedIds)
        .eq('is_public', true)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(15),
      service
        .from('peer_reviews')
        .select(`
          id, score, body, created_at, reviewer_id, submission_id,
          script_submissions ( id, title, script_evaluations ( id ), profiles ( handle, full_name ) ),
          profiles!peer_reviews_reviewer_id_fkey ( handle, full_name )
        `)
        .in('reviewer_id', followedIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(15),
    ])
    for (const s of (pubScripts as any[]) || []) {
      feed.push({
        type: 'script', when: s.created_at,
        actor: { name: s.profiles?.full_name || 'Writer', handle: s.profiles?.handle ?? null },
        payload: { script_id: s.id, eval_id: s.script_evaluations?.[0]?.id ?? null, title: s.title, format: s.declared_format, score: s.script_evaluations?.[0]?.weighted_score ?? null },
      })
    }
    for (const r of (pubReviews as any[]) || []) {
      feed.push({
        type: 'review', when: r.created_at,
        actor: { name: r.profiles?.full_name || 'Reviewer', handle: r.profiles?.handle ?? null },
        payload: {
          score: r.score, body: r.body, eval_id: r.script_submissions?.script_evaluations?.[0]?.id ?? null,
          script_title: r.script_submissions?.title ?? '—',
          writer_handle: r.script_submissions?.profiles?.handle ?? null,
          writer_name: r.script_submissions?.profiles?.full_name ?? null,
        },
      })
    }
    feed.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    feed = feed.slice(0, 8)
  }

  // Discover preview — 3 most recent public scripts
  const { data: discoverScripts } = await service
    .from('script_submissions')
    .select(`
      id, title, declared_format, created_at,
      script_evaluations ( id, weighted_score ),
      profiles ( handle )
    `)
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="bg-white text-[#0f0f0f]">
      {/* Profile hero */}
      <div style={{ background: 'linear-gradient(180deg,#faf8ff 0%,#fff 100%)' }} className="px-5 sm:px-6 py-6 rounded-2xl border border-gray-200 mb-5">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover bg-gray-100" />
          ) : (
            <div className="w-14 h-14 rounded-full text-white flex items-center justify-center font-bold text-lg" style={avatarStyle(profile.id)}>{initials(profile.full_name || profile.handle)}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold leading-tight">
              {profile.full_name || 'You'}{' '}
              <span className="text-purple-700 font-medium text-[14px]">@{profile.handle}</span>
            </div>
            {profile.headline ? (
              <div className="text-[13px] text-gray-600 mt-1 truncate">{profile.headline}</div>
            ) : (
              <Link href="/profile" className="text-[13px] text-purple-700 font-semibold hover:underline mt-1 inline-block">
                Add a headline →
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <StatChip label="Followers" value={followerCount ?? 0} />
            <StatChip label="Reviews" value={reviewCount ?? 0} />
            <StatChip label="Scripts" value={scriptCount ?? 0} />
          </div>
        </div>
      </div>

      {/* Action needed */}
      {(invites && invites.length > 0) || myReviewNotices.length > 0 ? (
        <div style={{ background: '#fdfbff', border: '1px solid #f1edff' }} className="rounded-xl px-5 py-4 mb-6 flex flex-col gap-2">
          {((invites as any[]) || []).map((iv) => {
            const evId = iv.script_submissions?.script_evaluations?.[0]?.id
            const owner = iv.script_submissions?.profiles?.full_name || 'A writer'
            const title = iv.script_submissions?.title || 'a script'
            return (
              <Link key={iv.id} href={evId ? `/review/${iv.submission_id}` : '#'} className="flex items-center justify-between gap-3 hover:opacity-80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold">★</div>
                  <span className="text-[13.5px] truncate"><span className="font-semibold">{owner}</span> wants you to review <em className="text-gray-800">{title}</em></span>
                </div>
                <span className="text-[12px] font-semibold text-purple-700 shrink-0">Open →</span>
              </Link>
            )
          })}
          {myReviewNotices.map((r: any) => {
            const evId = r.script_submissions?.script_evaluations?.[0]?.id
            const reviewer = r.profiles?.full_name || 'A reviewer'
            return (
              <Link key={r.id} href={evId ? `/report/${evId}` : '#'} className="flex items-center justify-between gap-3 hover:opacity-80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-400 text-white flex items-center justify-center text-[11px] font-bold">★</div>
                  <span className="text-[13.5px] truncate"><span className="font-semibold">{reviewer}</span> reviewed <em className="text-gray-800">{r.script_submissions?.title || 'your script'}</em> · scored {r.score}</span>
                </div>
                <span className="text-[12px] font-semibold text-purple-700 shrink-0">See it →</span>
              </Link>
            )
          })}
        </div>
      ) : null}

      {/* Following feed */}
      <SectionLabel>Following</SectionLabel>
      {feed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-7 mb-7 text-center">
          <p className="text-sm text-gray-500 mb-3">You're not following anyone yet.</p>
          <Link href="/discover" className="inline-block px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700">Browse Discover →</Link>
        </div>
      ) : (
        <div className="mb-7">
          {feed.map((item, i) => {
            if (item.type === 'script') {
              const p = item.payload
              const score = p.score != null ? Math.round(Number(p.score)) : null
              return (
                <FeedRow key={`s-${i}`} actor={item.actor} when={item.when} verb="published a new spec." href={p.eval_id ? `/report/${p.eval_id}` : '#'}>
                  <div className="flex items-center gap-3 mt-2 p-3 rounded-lg border border-gray-200 bg-white">
                    {score != null && (
                      <div className="w-10 h-10 rounded-md text-white flex items-center justify-center font-extrabold text-[15px]" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>{score}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14px] truncate" style={{ fontFamily: 'Georgia, serif' }}>{p.title}</div>
                      <div className="text-[11.5px] text-gray-500 mt-0.5 truncate">{p.format || '—'}</div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 px-2 py-1 border border-purple-200 rounded-md">Read</span>
                  </div>
                </FeedRow>
              )
            }
            if (item.type === 'review') {
              const p = item.payload
              return (
                <FeedRow key={`r-${i}`} actor={item.actor} when={item.when} verb={
                  <>reviewed <em className="text-gray-800">{p.script_title}</em>{p.writer_handle ? <> by <span className="text-purple-700 font-semibold">@{p.writer_handle}</span></> : null}</>
                } href={p.eval_id ? `/report/${p.eval_id}` : '#'}>
                  <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Their review</span>
                      <span className="text-[12px] font-extrabold tabular-nums">Score {p.score}</span>
                    </div>
                    <p className="text-[12.5px] text-gray-700 line-clamp-3 leading-snug">{p.body}</p>
                  </div>
                </FeedRow>
              )
            }
            return null
          })}
        </div>
      )}

      {/* Discover preview */}
      <div className="flex items-center justify-between mb-3">
        <SectionLabel inline>Discover</SectionLabel>
        <Link href="/discover" className="text-[12px] font-bold text-purple-700 hover:underline">All scripts →</Link>
      </div>
      <div className="mb-8 flex flex-col gap-2">
        {((discoverScripts as any[]) || []).map((s) => {
          const ev = s.script_evaluations?.[0]
          const score = ev?.weighted_score != null ? Math.round(Number(ev.weighted_score)) : null
          return (
            <Link key={s.id} href={ev ? `/report/${ev.id}` : '#'} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-md text-white flex items-center justify-center font-extrabold text-[15px]" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>{score ?? '—'}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px] truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
                <div className="text-[11.5px] text-gray-500 mt-0.5 truncate">
                  {s.declared_format || '—'}
                  {s.profiles?.handle && <> · <span className="text-purple-700 font-semibold">@{s.profiles.handle}</span></>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center px-2 sm:px-3 border-r border-gray-200 last:border-r-0">
      <div className="text-[16px] sm:text-[18px] font-extrabold leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.12em] font-bold text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function SectionLabel({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <div className={`text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500 ${inline ? '' : 'mb-3'}`}>{children}</div>
  )
}

function FeedRow({
  actor, when, verb, href, children,
}: {
  actor: { name: string; handle: string | null }
  when: string
  verb: React.ReactNode
  href: string
  children?: React.ReactNode
}) {
  return (
    <Link href={href} className="flex gap-3 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-lg">
      <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-[12px] shrink-0" style={avatarStyle(actor.name)}>{initials(actor.name)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px]">
          <span className="font-bold">{actor.name}</span>
          {actor.handle && <span className="text-gray-400"> @{actor.handle}</span>}
          <span className="text-gray-400"> · {ago(when)}</span>
        </div>
        <div className="text-[13px] text-gray-600 mt-0.5">{verb}</div>
        {children}
      </div>
    </Link>
  )
}
