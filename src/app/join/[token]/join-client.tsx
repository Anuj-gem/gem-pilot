'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import { GoogleMark } from '@/components/auth/google-mark'
import SmsConsent from '@/components/sms-consent'

interface JoinClientProps {
  token: string
  scriptTitle: string
  formatGenre: string
  logline: string
  inviterName: string
  role: string
  evalId: string | null
  collaboratorEmail: string
}

export function JoinClient({
  token,
  scriptTitle,
  formatGenre,
  logline,
  inviterName,
  role,
  evalId,
  collaboratorEmail,
}: JoinClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [email, setEmail] = useState(collaboratorEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const destination = evalId ? `/report/${evalId}` : '/dashboard'

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    // After OAuth, redirect back to /join/[token] — the server page will
    // auto-accept and redirect to the report.
    const next = `/join/${token}`
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

    // After email-confirm, land back on join page to auto-accept
    const next = `/join/${token}`
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user?.id) {
      identifyUser(data.user.id, { email, full_name: fullName })

      if (phone.trim() || smsConsent) {
        await supabase
          .from('profiles')
          .update({ phone: phone.trim() || null, sms_consent: smsConsent })
          .eq('id', data.user.id)
      }
    }

    trackSignupComplete()
    gtagSignupCompleted()

    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user?.id, email }),
      keepalive: true,
    }).catch(() => {})

    // Accept the invite immediately (no email confirm flow assumption)
    const res = await fetch('/api/join/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (res.ok) {
      const json = await res.json()
      const dest = json.evalId ? `/report/${json.evalId}` : '/dashboard'
      router.push(dest)
    } else {
      router.push(destination)
    }
    router.refresh()
  }

  return (
    <div className="min-h-[calc(100vh-56px)] px-4 py-8 sm:py-12">
      <div className="max-w-sm mx-auto">
        {/* Login link at top */}
        <p className="text-center text-sm text-[var(--gem-gray-400)] mb-6">
          Already have an account?{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(`/join/${token}`)}`}
            className="text-[var(--gem-accent)] hover:underline font-medium"
          >
            Log in
          </Link>
        </p>

        {/* Collaboration context card */}
        <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] p-4 sm:p-5 mb-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--gem-gray-500)] font-semibold mb-2">
            You&apos;re invited to collaborate
          </p>
          <p className="text-[13px] text-[var(--gem-gray-300)] mb-1">
            <span className="font-semibold text-[var(--gem-gray-100)]">{inviterName}</span> invited you as{' '}
            <span className="font-semibold text-[var(--gem-gray-100)]">{role}</span>
          </p>
          <div className="mt-3 pt-3 border-t border-[var(--gem-gray-700)]">
            <p className="font-semibold text-[var(--gem-gray-50)] text-[15px] leading-snug mb-1">{scriptTitle}</p>
            {formatGenre && (
              <p className="text-[11px] text-[var(--gem-gray-500)] mb-2">{formatGenre}</p>
            )}
            {logline && (
              <p className="text-[12px] text-[var(--gem-gray-400)] leading-relaxed italic">&ldquo;{logline}&rdquo;</p>
            )}
          </div>
        </div>

        {/* Signup form */}
        <div className="rounded-2xl border border-[var(--gem-gray-700)] p-5 sm:p-6 mb-4">
          <h1 className="text-xl font-bold mb-1">Create your account to view this project</h1>
          <p className="text-xs text-[var(--gem-gray-400)] mb-5">
            Free forever. No credit card required.
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
              <label className="block text-xs font-medium text-[var(--gem-gray-300)] mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder="(555) 555-5555"
              />
              <p className="text-[10px] text-[var(--gem-gray-500)] mt-0.5">So our team can reach you if your work stands out</p>
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

            <SmsConsent checked={smsConsent} onChange={setSmsConsent} />

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

        {/* Skip link */}
        <p className="text-center text-xs text-[var(--gem-gray-500)]">
          Don&apos;t want to join?{' '}
          <Link href="/signup" className="text-[var(--gem-gray-400)] hover:underline">
            Create a regular account instead
          </Link>
        </p>
      </div>
    </div>
  )
}
