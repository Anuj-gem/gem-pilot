// PUT /api/profile/privacy — save the user's privacy_defaults +
// stamp privacy_confirmed_at. Used by the onboarding step, the
// dashboard's mandatory prompt, and the standalone /profile/privacy
// settings page.
//
// Anuj 2026-04-30 v0.10.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { normalizePrivacyDefaults } from '@/lib/privacy-defaults'

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

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const privacy = normalizePrivacyDefaults(body)

  const { error } = await supabase
    .from('profiles')
    .update({
      privacy_defaults: privacy,
      privacy_confirmed_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, privacy })
}
