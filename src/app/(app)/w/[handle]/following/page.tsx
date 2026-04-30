// /w/[handle]/following — public list of writers this user follows.
// Anuj 2026-04-29 v0.5 Phase B.

import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { FollowList } from '../followers/page'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const dynamic = 'force-dynamic'

export default async function FollowingPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const service = svc()
  const auth = await createClient()
  const { data: { user: viewer } } = await auth.auth.getUser()

  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, handle')
    .ilike('handle', handle)
    .maybeSingle<{ id: string; full_name: string | null; handle: string | null }>()
  if (!profile) notFound()

  const { data: follows } = await service
    .from('follows')
    .select('id, created_at, followee:profiles!follows_followee_id_fkey ( id, full_name, handle, headline, avatar_url )')
    .eq('follower_id', profile.id)
    .order('created_at', { ascending: false })

  const list = ((follows as any[]) || [])
    .map((r) => r.followee)
    .filter(Boolean) as Array<{ id: string; full_name: string | null; handle: string | null; headline: string | null; avatar_url: string | null }>

  const viewerFollowing = new Set<string>()
  if (viewer) {
    const { data: rels } = await service.from('follows').select('followee_id').eq('follower_id', viewer.id)
    for (const r of (rels as any[]) || []) viewerFollowing.add(r.followee_id)
  }

  return <FollowList kind="following" profile={profile} list={list} viewerFollowing={viewerFollowing} viewerId={viewer?.id ?? null} />
}
