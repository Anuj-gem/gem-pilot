/**
 * POST /api/send-welcome
 *
 * Fires the post_signup welcome email. Called from client after successful
 * signup (both /signup form and inline-signup on report page).
 *
 * Idempotent via email_outbox dedupe on user_id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Auth check — only send to the currently signed-in user
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
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const email = profile?.email || user.email
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 })
    }

    const firstName = profile?.full_name?.split(' ')[0] || 'there'

    await sendEmail(
      {
        templateAlias: 'post_signup',
        to: email,
        variables: { first_name: firstName },
        dedupeKey: user.id,
        tag: 'post_signup',
      },
      serviceClient
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-welcome] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
