// /w/[handle]/followers — public list of people who follow this writer.
// Anuj 2026-04-29 v0.5 Phase B.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { FollowButton } from '@/components/follow-button'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const dynamic = 'force-dynamic'

export default async function FollowersPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const service = svc()
  const auth = await createClient()
  const { data: { user: viewer } } = await auth.auth.getUser()

  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, handle, headline, avatar_url')
    .ilike('handle', handle)
    .maybeSingle<{ id: string; full_name: string | null; handle: string | null; headline: string | null; avatar_url: string | null }>()
  if (!profile) notFound()

  const { data: follows } = await service
    .from('follows')
    .select('id, created_at, follower:profiles!follows_follower_id_fkey ( id, full_name, handle, headline, avatar_url )')
    .eq('followee_id', profile.id)
    .order('created_at', { ascending: false })

  const list = ((follows as any[]) || [])
    .map((r) => r.follower)
    .filter(Boolean) as Array<{ id: string; full_name: string | null; handle: string | null; headline: string | null; avatar_url: string | null }>

  // Viewer's follow state for each
  const viewerFollowing = new Set<string>()
  if (viewer) {
    const { data: rels } = await service
      .from('follows')
      .select('followee_id')
      .eq('follower_id', viewer.id)
    for (const r of (rels as any[]) || []) viewerFollowing.add(r.followee_id)
  }

  return <FollowList kind="followers" profile={profile} list={list} viewerFollowing={viewerFollowing} viewerId={viewer?.id ?? null} />
}

export function FollowList({
  kind, profile, list, viewerFollowing, viewerId,
}: {
  kind: 'followers' | 'following'
  profile: { handle: string | null; full_name: string | null }
  list: Array<{ id: string; full_name: string | null; handle: string | null; headline: string | null; avatar_url: string | null }>
  viewerFollowing: Set<string>
  viewerId: string | null
}) {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-2">
          <Link href={profile.handle ? `/w/${profile.handle}` : '/dashboard'} className="text-xs font-semibold text-gray-500 hover:text-gray-900">
            ← {profile.full_name || profile.handle}'s profile
          </Link>
        </div>
        <header className="mb-7">
          <h1 className="text-[24px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            {kind === 'followers' ? 'Followers' : 'Following'}
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">{list.length} {list.length === 1 ? 'writer' : 'writers'}</p>
        </header>
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((f) => {
              const ini = (f.full_name || f.handle || '·').split(/\s+/).slice(0,2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Link href={f.handle ? `/w/${f.handle}` : '#'} className="flex items-center gap-3 flex-1 min-w-0">
                    {f.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100" />
                    ) : (
                      <div className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-[13px]" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>{ini}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14px] text-gray-900 truncate">{f.full_name || f.handle}{' '}<span className="text-gray-400 font-normal text-[12px]">@{f.handle}</span></div>
                      {f.headline && <div className="text-[12px] text-gray-600 truncate">{f.headline}</div>}
                    </div>
                  </Link>
                  {viewerId && viewerId !== f.id && (
                    <FollowButton followeeId={f.id} initiallyFollowing={viewerFollowing.has(f.id)} size="sm" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
