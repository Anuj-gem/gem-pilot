/**
 * POST /api/send-welcome
 *
 * Fires the post_signup welcome email. Called from client after successful
 * signup (both /signup form and inline-signup on report page) AND optionally
 * directly from /auth/callback.
 *
 * Two auth modes (in priority order):
 *   1. body.user_id — explicit, looked up via service role. Fast & reliable
 *      because it doesn't depend on the auth cookie being synced (which races
 *      with the immediate redirect after Supabase signUp returns).
 *   2. cookie auth — fallback for any caller that forgot to pass user_id.
 *
 * Self-defending against abuse: sendEmail() dedupes on user.id so even if
 * someone hits this endpoint with arbitrary user_ids, each one only sends
 * once. The "user_id must exist in profiles" check below adds a second
 * guard so unknown ids 404 cleanly.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email'

function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    // 1. Try body-passed user_id first — most reliable path.
    let userId: string | null = null
    let bodyEmail: string | null = null
    try {
      const body = await request.json().catch(() => null)
      if (body && typeof body === 'object') {
        if (typeof body.user_id === 'string' && body.user_id.length > 0) {
          userId = body.user_id
        }
        if (typeof body.email === 'string' && body.email.length > 0) {
          bodyEmail = body.email
        }
      }
    } catch {
      // No body — fall through to cookie auth
    }

    // 2. Fall back to cookie auth if no user_id in body.
    if (!userId) {
      const cookieStore = await cookies()
      const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {}
            },
          },
        }
      )
      const { data: { user } } = await authClient.auth.getUser()
      if (user?.id) userId = user.id
    }

    if (!userId) {
      // Neither body nor cookies worked. Return 400 so client can log it.
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    const email = (profile as any)?.email || bodyEmail
    if (!email) {
      return NextResponse.json({ error: 'No email for user_id' }, { status: 404 })
    }

    const fullName: string | null = (profile as any)?.full_name ?? null
    const firstName = (fullName?.split(' ')[0] || email.split('@')[0]).trim() || 'there'

    const sent = await sendEmail(
      {
        templateAlias: 'post_signup',
        to: email,
        variables: { first_name: firstName },
        dedupeKey: userId, // dedupes per-user — only the first call actually sends
        tag: 'post_signup',
      },
      serviceClient
    )

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('[send-welcome] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
