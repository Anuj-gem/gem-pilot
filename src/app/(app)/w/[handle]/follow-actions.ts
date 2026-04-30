'use server'

// Follow / unfollow server actions. Anuj 2026-04-29 (v0.4).

import { createClient } from '@/lib/supabase-server'

export async function followUser({ followeeId }: { followeeId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  if (user.id === followeeId) return { error: "You can't follow yourself." }
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, followee_id: followeeId })
  if (error && error.code !== '23505') return { error: error.message }
  return { ok: true }
}

export async function unfollowUser({ followeeId }: { followeeId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('followee_id', followeeId)
  if (error) return { error: error.message }
  return { ok: true }
}
