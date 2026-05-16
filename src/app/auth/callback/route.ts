import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/submit'
  // Surface the upstream OAuth error if Google bounced back with one
  // (e.g. user denied consent, invalid client). Otherwise we lose all
  // context and the user gets a generic "auth_callback_error".
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')

  if (oauthError) {
    console.error('[auth/callback] upstream OAuth error:', oauthError, oauthErrorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_error&reason=${encodeURIComponent(oauthError)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Fire post_signup welcome email — server-side, idempotent via dedupeKey.
      // Runs every time a user authenticates; sendEmail's dedupe (unique on
      // template_alias + dedupe_key) guarantees only the first sign-in actually
      // sends. This covers OAuth signups end-to-end without depending on the
      // client to fire a fetch (which races with navigation + cookie sync).
      const user = data?.user
      if (user) {
        try {
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
          )
          const { data: profile } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', user.id)
            .single()
          const email = (profile as any)?.email || user.email
          if (email) {
            const fullName: string | null = (profile as any)?.full_name ?? null
            const firstName = (fullName?.split(' ')[0] || email.split('@')[0]).trim() || 'there'
            await sendEmail(
              {
                templateAlias: 'post_signup',
                to: email,
                variables: { first_name: firstName },
                dedupeKey: user.id,
                tag: 'post_signup',
                userId: user.id,
              },
              adminClient
            )
          }
        } catch (e) {
          // Never let an email failure block sign-in. The failure-alert system
          // in lib/email.ts will surface this if Postmark itself errored.
          console.error('[auth/callback] post_signup send failed:', e)
        }
      }

      // ── Claim anonymous scripts from cookie ──
      if (user) {
        try {
          const cookieStore = await cookies()
          const anonCookie = cookieStore.get('gem_anon_scripts')?.value
          if (anonCookie) {
            const anonIds = anonCookie.split(',').filter(Boolean)
            if (anonIds.length > 0) {
              const adminClient2 = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                { auth: { persistSession: false } }
              )
              await adminClient2
                .from('script_submissions')
                .update({ user_id: user.id, expires_at: null })
                .in('id', anonIds)
                .is('user_id', null)
            }
            // Clear the cookie
            cookieStore.set('gem_anon_scripts', '', { path: '/', maxAge: 0 })
          }
        } catch (e) {
          console.error('[auth/callback] claim-scripts failed:', e)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
    // Log the exact error so we can diagnose. Most common causes are PKCE
    // verifier missing (cookies blocked or different browser context),
    // expired code, or redirect_uri mismatch in the Google client config.
    console.error('[auth/callback] exchangeCodeForSession failed:', {
      message: error.message,
      status: (error as any).status,
      name: error.name,
      origin,
    })
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_error&reason=${encodeURIComponent(error.message.slice(0, 80))}`
    )
  }

  console.error('[auth/callback] no code in URL — likely user opened the page directly')
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error&reason=no_code`)
}

// Suppress unused import lint — `createServerClient` is intentionally kept so
// future cookie-based extensions don't have to rewire imports.
void createServerClient
