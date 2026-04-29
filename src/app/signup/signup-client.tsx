'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import { GoogleMark } from '@/components/auth/google-mark'

// topScripts kept in the signature for backwards compat with the server
// page; the value-props + Discover tease blocks below were stripped to
// reduce noise on the signup page.
interface SignupPageClientProps {
  topScripts?: any[]
}

// Anuj 2026-04-28: producer signup is now invite-only — Anuj vets every
// industry partner and sends a personal invite. Producers reach the
// platform via /apply (form → email to Anuj) or via a personal invite
// link he sends after vetting. Public /signup is writer-only.

export function SignupPageClient({ topScripts }: SignupPageClientProps) {
  return (
    <Suspense>
      <SignupPageInner topScripts={topScripts} />
    </Suspense>
  )
}

function SignupPageInner({ topScripts: _topScripts }: SignupPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    // OAuth users default to 'writer' (account_type defaults in the DB).
    // Producer accounts are invite-only — they never come through this
    // public signup path.
    const next = redirect || '/submit'
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    trackSignupStart()

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Identify the user in PostHog so the person profile is created with
    // their email — required for downstream CDP functions (welcome email, etc.)
    if (data.user?.id) {
      identifyUser(data.user.id, {
        email,
        full_name: fullName,
      })
    }

    trackSignupComplete()
    gtagSignupCompleted()

    // Fire welcome email. Pass user_id explicitly so the endpoint doesn't
    // depend on auth cookies being synced (which races with router.push
    // below — page unloads before cookies make it into the outgoing request).
    // keepalive: true tells the browser to finish the request even after
    // navigation. The endpoint dedupes via user.id so it's safe to call once
    // here AND have the OAuth callback fire it server-side.
    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user?.id, email }),
      keepalive: true,
    }).catch(() => {})

    // Writers continue to the submit flow (or wherever they were headed).
    // Producers don't reach this path — invite-only.
    const destination = redirect || '/submit'
    router.push(destination)
    router.refresh()
  }

  return (
    <div className="min-h-[calc(100vh-56px)] px-4 py-8 sm:py-12">
      <div className="max-w-sm mx-auto">
        {/* Login link at top */}
        <p className="text-center text-sm text-[var(--gem-gray-400)] mb-6">
          Already have an account?{' '}
          <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className="text-[var(--gem-accent)] hover:underline font-medium">
            Log in
          </Link>
        </p>

        {/* Signup form */}
        <div className="rounded-2xl border border-[var(--gem-gray-700)] p-5 sm:p-6 mb-6">
          <h1 className="text-xl font-bold mb-1">Create your free account</h1>
          <p className="text-xs text-[var(--gem-gray-400)] mb-5">
            Free forever. No credit card required.
          </p>

          {/* Producer signup is invite-only — Anuj vets every industry
              partner. The link below routes producers to the application
              form. */}
          <p className="mb-4 text-[12px] text-[var(--gem-gray-400)] leading-snug">
            Are you a producer or rep?{' '}
            <Link href="/apply" className="text-[var(--gem-accent)] hover:underline font-medium">
              Apply for industry access →
            </Link>
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mb-3 rounded-lg border border-[var(--gem-gray-600)] bg-[var(--gem-black)] text-sm font-semibold text-[var(--gem-gray-50)] transition-all duration-150 hover:bg-[var(--gem-gray-900)] active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
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

          <div className="flex items-center gap-3 my-3.5 text-[12px] text-[var(--gem-gray-500)]">
            <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
            or
            <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
          </div>

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[var(--gem-gray-300)] mb-1">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--gem-gray-300)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--gem-gray-300)] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-all duration-150 active:scale-[0.985] glow-accent"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
