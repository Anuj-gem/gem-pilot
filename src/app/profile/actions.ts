'use server'

// Profile-edit server actions. Anuj 2026-04-29 (writer profiles v0.3).

import { createClient } from '@/lib/supabase-server'

interface UpdateInput {
  full_name?: string
  handle?: string
  headline?: string | null
  bio?: string | null
  imdb_url?: string | null
  avatar_url?: string | null
}

const HANDLE_RE = /^[a-z0-9-]{3,32}$/

export async function updateProfile(input: UpdateInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const updates: Record<string, any> = {}
  if (input.full_name !== undefined) {
    const v = (input.full_name || '').trim()
    if (!v) return { error: 'Name is required.' }
    if (v.length > 80) return { error: 'Name is too long.' }
    updates.full_name = v
  }
  if (input.handle !== undefined) {
    const v = (input.handle || '').trim().toLowerCase()
    if (!v || !HANDLE_RE.test(v)) {
      return { error: 'Handle must be 3–32 characters, lowercase letters/numbers/dashes.' }
    }
    // Uniqueness check
    const { data: clash } = await supabase
      .from('profiles')
      .select('id')
      .ilike('handle', v)
      .neq('id', user.id)
      .maybeSingle<{ id: string }>()
    if (clash) return { error: 'That handle is already taken.' }
    updates.handle = v
  }
  if (input.headline !== undefined) {
    const v = (input.headline || '').trim()
    if (v.length > 120) return { error: 'Headline must be 120 characters or less.' }
    updates.headline = v || null
  }
  if (input.bio !== undefined) {
    const v = (input.bio || '').trim()
    if (v.length > 600) return { error: 'Bio must be 600 characters or less.' }
    updates.bio = v || null
  }
  if (input.imdb_url !== undefined) {
    const v = (input.imdb_url || '').trim()
    if (v && !/^https?:\/\/.+/i.test(v)) return { error: 'IMDb URL must start with https://' }
    updates.imdb_url = v || null
  }
  if (input.avatar_url !== undefined) {
    updates.avatar_url = input.avatar_url || null
  }

  if (Object.keys(updates).length === 0) return { error: 'Nothing to update.' }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
  if (error) return { error: error.message }
  return { ok: true }
}
