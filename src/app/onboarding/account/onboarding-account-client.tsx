'use client'

// OnboardingAccountClient — Path B account creation.
//
// Layout: Google button (alt path, inline) + email/name/password form.
// Continue lives in the OnboardingShell action bar — clicking it submits
// the email form. Form is also submittable via Enter from any field.
//
// Anuj 2026-04-30 v0.10.8.

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { identifyUser, trackSignupComplete } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import type { ChecklistItem } from '@/components/onboarding/onboarding-checklist'

const PATH_B_NEXT_KEY = 'gem_onboarding_next'

export function OnboardingAccountClient() {
  const router = useRouter()
  const supabase = createClient()
  const formRef = useRef<HTMLFormElement>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingUp, setSigningUp] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError(null)
    try {
      window.localStorage.setItem(PATH_B_NEXT_KEY, '/onboarding')
    } catch {}
    const redirectTo = `${window.location.origin}/auth/callback?next=/onboarding`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      try { window.localStorage.removeItem(PATH_B_NEXT_KEY) } catch {}
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  async function handleEmailSignup(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!email || !password || !fullName) {
      setError('Fill in your name, email, and password.')
      return
    }
    setSigningUp(true)
    setError(null)

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signupError) {
      setError(signupError.message)
      setSigningUp(false)
      return
    }
    if (signupData.user && !signupData.session) {
      setError('Check your email to confirm your account, then log back in.')
      setSigningUp(false)
      return
    }

    if (signupData.user?.id) {
      identifyUser(signupData.user.id, { email, full_name: fullName })
    }
    trackSignupComplete()
    gtagSignupCompleted()

    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: signupData.user?.id, email }),
      keepalive: true,
    }).catch(() => {})

    router.push('/onboarding/privacy')
  }

  const checklistItems: ChecklistItem[] = [
    { label: 'Create your account', state: 'current' },
    { label: 'Confirm privacy', state: 'pending' },
    { label: 'Polish your profile', state: 'pending', hint: 'Skippable' },
    { label: 'Open your dashboard', state: 'pending' },
  ]

  return (
    <OnboardingShell
      checklistTitle="Your GEM account"
      checklistItems={checklistItems}
      framingBanner="Get your account set up. Two quick steps."
      heading="Create your writer account."
      subhead="Free forever — first script eval included. No card."
      actionBar={{
        onContinue: () => handleEmailSignup(),
        continueLabel: 'Create account',
        continueDisabled: !fullName || !email || !password || password.length < 6,
        continueLoading: signingUp,
        label: 'Account',
      }}
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--gem-accent)] hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <div className="max-w-[420px]">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={signingUp || googleLoading}
          className="w-full rounded-xl px-4 py-3 mb-3 flex items-center justify-center gap-2.5 text-[14px] font-semibold transition-all duration-150 hover:bg-[var(--gem-gray-900)] active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'var(--gem-black)',
            border: '1px solid var(--gem-gray-600)',
            color: 'var(--gem-gray-50)',
          }}
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

        <div className="text-center text-[12px] text-[var(--gem-gray-500)] my-3.5">— or —</div>

        <form ref={formRef} onSubmit={handleEmailSignup} className="space-y-2.5">
          <input
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-xl px-4 py-3 text-[14px]"
            style={{ background: '#fff', border: '1px solid var(--gem-gray-700)', color: '#111' }}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl px-4 py-3 text-[14px]"
            style={{ background: '#fff', border: '1px solid var(--gem-gray-700)', color: '#111' }}
          />
          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-xl px-4 py-3 text-[14px]"
            style={{ background: '#fff', border: '1px solid var(--gem-gray-700)', color: '#111' }}
          />
          {error && (
            <div
              className="rounded-lg px-3 py-2 flex items-start gap-2 text-[13px]"
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.25)',
                color: '#fda4af',
              }}
            >
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {/* Submit button hidden — Enter still submits the form, and the
              top action bar Continue button calls handleEmailSignup(). */}
          <button type="submit" className="sr-only" tabIndex={-1}>Submit</button>
        </form>
      </div>
    </OnboardingShell>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.2 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.6 27 35.5 24 35.5c-5.1 0-9.5-3.3-11.2-7.9l-6.5 5C9.6 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.6 5.6C40.3 35.6 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}
