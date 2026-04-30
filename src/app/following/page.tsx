// /following — list of writers the viewer follows, with unfollow controls.
// Anuj 2026-04-29 (v0.4).

import { redirect } from 'next/navigation'
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

export default async function FollowingPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/following')

  const service = svc()
  const { data: rows } = await service
    .from('follows')
    .select(`
      id, created_at,
      followee:profiles!follows_followee_id_fkey ( id, handle, full_name, headline, avatar_url )
    `)
    .eq('follower_id', user.id)
    .order('created_at', { ascending: false })

  type Row = {
    id: string; created_at: string
    followee: { id: string; handle: string | null; full_name: string | null; headline: string | null; avatar_url: string | null } | null
  }
  const list = ((rows as any[]) || []) as Row[]

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <header className="mb-7">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-2">Following</p>
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Writers you follow
          </h1>
          <p className="text-[14px] text-gray-600 mt-2">{list.length} {list.length === 1 ? 'writer' : 'writers'}.</p>
        </header>
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            You're not following anyone yet. Browse{' '}
            <Link href="/discover" className="text-purple-700 font-semibold hover:underline">Discover</Link> to find writers to follow.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((row) => {
              const f = row.followee
              if (!f) return null
              const initials = (f.full_name || f.handle || '·').split(/\s+/).slice(0,2).map(s => s[0]?.toUpperCase() ?? '').join('') || '·'
              return (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Link href={f.handle ? `/w/${f.handle}` : '#'} className="flex items-center gap-3 flex-1 min-w-0">
                    {f.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100" />
                    ) : (
                      <div className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-[13px]" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>{initials}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-[14px] truncate">{f.full_name || f.handle}{' '}
                        <span className="text-gray-400 font-normal text-[12px]">@{f.handle}</span>
                      </div>
                      {f.headline && <div className="text-[12px] text-gray-600 truncate">{f.headline}</div>}
                    </div>
                  </Link>
                  <FollowButton followeeId={f.id} initiallyFollowing={true} size="sm" />
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
