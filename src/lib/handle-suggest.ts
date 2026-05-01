// Handle suggestion + uniqueness helpers used by the onboarding flow.
//
// Anuj 2026-04-30 v0.10.15 — every new account gets a handle on signup
// so a brand-new user always has a working public profile, even when
// they skip /onboarding/profile entirely.

import { SupabaseClient } from '@supabase/supabase-js'

export const HANDLE_RE = /^[a-z0-9-]{3,32}$/

/** Slugify a string into a candidate handle. Lowercase, alphanumerics +
 *  dashes, collapsed. Returns "" when the input is empty so the caller
 *  doesn't surface a stupid placeholder ("writer") to the user.
 *  Anuj 2026-04-30 v0.10.17 — empty stays empty in the form. */
export function slugifyHandle(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

/** Server-side fallback for users who arrive without a handle (Google
 *  OAuth flow). Never returns empty — pads short slugs and uses a
 *  generic stem only when the input is truly unusable. */
export function fallbackHandle(input: string): string {
  const slug = slugifyHandle(input)
  if (slug.length >= 3) return slug
  return (slug || 'gem-writer').padEnd(3, '0').slice(0, 32)
}

/** Find a unique handle starting from a candidate. If the candidate is
 *  taken, append -2, -3, ... until we find one that isn't. Caps at 200
 *  attempts so a runaway loop can't eat into the request budget. */
export async function findAvailableHandle(
  client: SupabaseClient,
  candidate: string,
  excludeUserId?: string
): Promise<string> {
  const base = slugifyHandle(candidate)
  for (let i = 0; i < 200; i++) {
    const tryHandle = i === 0 ? base : `${base}-${i + 1}`.slice(0, 32)
    const q = client.from('profiles').select('id').ilike('handle', tryHandle)
    if (excludeUserId) q.neq('id', excludeUserId)
    const { data } = await q.maybeSingle<{ id: string }>()
    if (!data) return tryHandle
  }
  // Pathological fallback — extremely unlikely.
  return `${base}-${Math.floor(Math.random() * 1_000_000)}`.slice(0, 32)
}
