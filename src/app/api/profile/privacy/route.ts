// PUT /api/profile/privacy — save the user's privacy_defaults +
// stamp privacy_confirmed_at. Used by the onboarding step, the
// dashboard's mandatory prompt, and the standalone /profile/privacy
// settings page.
//
// Body shape:
//   { ...PrivacyDefaults, apply_to_all?: boolean }
//
// When `apply_to_all` is true, the new `allow_reviews` + `allow_industry`
// values are also written to every one of the user's script_submissions
// so existing posts inherit the change (Anuj 2026-04-30 v0.10.1 — the
// account-level toggle was leaving old posts in their previous state,
// which surprised writers who expected "off" to mean off everywhere).
// The form passes apply_to_all=true after a confirm dialog.
//
// Anuj 2026-04-30 v0.10.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { normalizePrivacyDefaults } from '@/lib/privacy-defaults'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) {
          try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* called from server component */ }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const applyToAll = body?.apply_to_all === true
  const privacy = normalizePrivacyDefaults(body)

  const { error } = await supabase
    .from('profiles')
    .update({
      privacy_defaults: privacy,
      privacy_confirmed_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Propagate the two per-post toggles to every script the user owns.
  // We use a service-role client so RLS doesn't get in the way, but we
  // scope the UPDATE by user_id so it can only touch this user's rows.
  // Failures here are logged but don't fail the request — the account
  // setting already saved, which is the user's primary intent.
  let propagatedCount: number | null = null
  if (applyToAll) {
    try {
      const svc = createServiceClient()
      const { data: updated, error: updErr } = await svc
        .from('script_submissions')
        .update({
          allow_reviews: privacy.allow_reviews,
          allow_industry: privacy.allow_industry,
        })
        .eq('user_id', user.id)
        .select('id')
      if (updErr) throw updErr
      propagatedCount = updated?.length ?? 0

      // If allow_industry just flipped off, mirror the per-script API:
      // pull the user's scripts out of every active producer inbox by
      // stamping unmatched_at on open script_matches rows.
      if (privacy.allow_industry === false && updated && updated.length > 0) {
        const ids = updated.map((r) => r.id)
        await svc
          .from('script_matches')
          .update({
            unmatched_at: new Date().toISOString(),
            unmatched_by: 'writer',
            unmatch_reason: 'industry_access_off',
          })
          .in('submission_id', ids)
          .is('unmatched_at', null)
      }
    } catch (propErr) {
      console.error('[profile/privacy] propagate-to-all failed:', propErr)
    }
  }

  return NextResponse.json({ ok: true, privacy, propagated: propagatedCount })
}
