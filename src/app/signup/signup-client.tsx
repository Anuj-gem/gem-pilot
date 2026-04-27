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

type AccountType = 'writer' | 'producer'

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
  const [accountType, setAccountType] = useState<AccountType>('writer')
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
    // They can change this in settings later if we add producer-OAuth flows.
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

    // If they picked producer, write account_type='producer' to the profile
    // row that was auto-created by the auth trigger. The default is 'writer'
    // so we only need to update on the producer path.
    if (accountType === 'producer' && data.user?.id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ account_type: 'producer' })
        .eq('id', data.user.id)
      if (updateError) {
        // Don't block signup on this — log and continue. The user can
        // re-attempt to set their account type from settings later.
        console.error('[signup] failed to set account_type=producer:', updateError)
      }
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

    // Producers go through a quick onboarding to populate their lane.
    // Writers continue to the submit flow (or wherever they were headed).
    const destination =
      accountType === 'producer'
        ? '/onboarding/producer'
        : redirect || '/submit'
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

          {/* Account type segmented toggle. Writer is the default. */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--gem-gray-300)] mb-1.5">
              I&apos;m a
            </label>
            <div
              role="radiogroup"
              aria-label="Account type"
              className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]"
            >
              {(['writer', 'producer'] as const).map(opt => {
                const isSelected = accountType === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setAccountType(opt)}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-150"
                    style={{
                      background: isSelected ? 'var(--gem-accent)' : 'transparent',
                      color: isSelected ? '#fff' : 'var(--gem-gray-300)',
                      boxShadow: isSelected
                        ? '0 1px 3px rgba(124,58,237,0.20)'
                        : 'none',
                    }}
                  >
                    {opt === 'writer' ? 'Writer' : 'Producer'}
                  </button>
                )
              })}
            </div>
          </div>

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
