import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
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
