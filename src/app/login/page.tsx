'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { identifyUser } from '@/lib/posthog'
import { GoogleMark } from '@/components/auth/google-mark'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-[var(--gem-gray-400)]">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const urlError = searchParams.get('error')
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(
    urlError === 'auth_callback_error'
      ? "We couldn't sign you in with Google. Please try again — or sign in with email."
      : ''
  )
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
    // On success, the browser is mid-redirect to Google — keep the spinner up.
  }

  // Already-signed-in writers should go straight to their dashboard rather
  // than see another login form.
  //
  // EXCEPTION: if we're here because OAuth just failed (?error=auth_callback_error),
  // do NOT silently bounce into the existing session. The user just tried to
  // sign in with a DIFFERENT account; bouncing them into the previous account
  // looks exactly like a security bug ("did Google auth log me into someone
  // else's account?"). Sign the existing session out so the user can clearly
  // re-attempt OAuth or sign in with the right credentials.
  useEffect(() => {
    let cancelled = false
    if (urlError === 'auth_callback_error') {
      supabase.auth.signOut().catch(() => {})
      return () => { cancelled = true }
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled && user) router.replace(redirect)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Identify returning users in PostHog so their person profile is
      // kept in sync with their email (required for CDP email functions)
      if (data.user?.id) {
        identifyUser(data.user.id, {
          email: data.user.email ?? email,
          full_name: (data.user.user_metadata as { full_name?: string } | null)?.full_name,
        })
      }
      router.push(redirect)
      router.refresh()
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-[var(--gem-gray-400)] mb-6">Log in to your GEM account</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mb-4 rounded-lg border border-[var(--gem-gray-600)] bg-[var(--gem-black)] text-sm font-semibold text-[var(--gem-gray-50)] transition-all duration-150 hover:bg-[var(--gem-gray-900)] active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Opening Google…
            </>
          ) : (
            <>
              <GoogleMark />
              Continue with Google
            </>
          )}
        </button>

        <div className="flex items-center gap-3 my-4 text-[12px] text-[var(--gem-gray-500)]">
          <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
          or
          <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Your password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--gem-gray-400)]">
          Don&apos;t have an account?{' '}
          <Link href={redirect !== '/dashboard' ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'} className="text-[var(--gem-accent)] hover:underline">
            Join GEM
          </Link>
        </p>
      </div>
    </div>
  )
}
