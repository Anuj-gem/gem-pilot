'use client'

// EvaluatingClient — progress bar + inline signup form.
// Signup fields are visible immediately. Progress runs in parallel.
// CTA: "Create your account" while processing → "View your report" when done.
// After signup, redirects to /dashboard (which shows their report + opportunities).

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, Sparkles, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import { GoogleMark } from '@/components/auth/google-mark'

export function EvaluatingClient() {
  const router = useRouter()
  const supabase = createClient()
  const [done, setDone] = useState(false)
  const [title, setTitle] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Signup form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Read submission ID from cookie + start polling
  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('gem_anon_scripts='))
      ?.split('=')[1]
    const ids = cookie?.split(',').filter(Boolean) ?? []
    const lastId = ids[ids.length - 1] ?? null

    if (!lastId) {
      router.push('/')
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/submission-status?id=${lastId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.title) setTitle(data.title)
        if (data.status === 'completed') {
          setDone(true)
          setProgress(100)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {}
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router])

  // Animate progress bar
  useEffect(() => {
    if (done) return
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p
        const increment = p < 30 ? 3 : p < 60 ? 1.5 : 0.5
        return Math.min(p + increment, 90)
      })
    }, 500)
    return () => clearInterval(timer)
  }, [done])

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    // After Google OAuth, /auth/callback will redirect to /start which claims scripts → dashboard
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/start')}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    trackSignupStart()

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user?.id) {
      identifyUser(data.user.id, { email, full_name: fullName })

      if (phone.trim()) {
        await supabase
          .from('profiles')
          .update({ phone: phone.trim() })
          .eq('id', data.user.id)
      }
    }

    trackSignupComplete()
    gtagSignupCompleted()

    // Fire welcome email
    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user?.id, email }),
      keepalive: true,
    }).catch(() => {})

    // Claim anonymous scripts via API, then go to dashboard
    await fetch('/api/claim-scripts', { method: 'POST' }).catch(() => {})
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-sm mx-auto px-5 pt-16 sm:pt-24 pb-16">
      {/* ── Progress section ── */}
      <div className="text-center mb-8">
        <span
          className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4 transition-all duration-500"
          style={done ? {
            background: 'rgba(22,163,74,0.08)',
            border: '1.5px solid rgba(22,163,74,0.20)',
          } : {
            background: 'rgba(124,58,237,0.08)',
            border: '1.5px solid rgba(124,58,237,0.20)',
          }}
        >
          {done
            ? <CheckCircle size={22} style={{ color: '#16a34a' }} />
            : <Sparkles size={22} style={{ color: 'var(--gem-accent)' }} />
          }
        </span>

        <h1
          className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-2 text-[var(--gem-gray-50)]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {done ? 'Your evaluation is ready.' : 'Evaluating your script'}
        </h1>

        {title && (
          <p className="text-[13px] font-medium text-[var(--gem-gray-300)] mb-1 flex items-center justify-center gap-2">
            <FileText size={13} className="shrink-0" />
            {title}
          </p>
        )}

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden mt-3" style={{ background: 'var(--gem-gray-800)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: done
                ? '#16a34a'
                : 'linear-gradient(90deg, var(--gem-accent), #a78bfa)',
            }}
          />
        </div>
        <p className="text-[11px] text-[var(--gem-gray-500)] tabular-nums mt-1">
          {done ? 'Complete' : `${Math.round(progress)}%`}
        </p>
      </div>

      {/* ── Signup form — always visible ── */}
      <div className="rounded-2xl p-5 sm:p-6" style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}>
        <p className="text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1 text-center">
          Create your account
        </p>
        <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mb-4 text-center">
          {done ? 'Sign up to view your full report.' : 'Fill in your details while we finish evaluating.'}
        </p>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mb-3 rounded-lg text-[13px] font-semibold transition-all hover:brightness-110 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-0"
          style={{
            background: 'var(--gem-gray-800)',
            color: 'var(--gem-gray-100)',
          }}
        >
          {googleLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Opening Google…
            </>
          ) : (
            <>
              <GoogleMark />
              Continue with Google
            </>
          )}
        </button>

        <div className="flex items-center gap-3 my-3 text-[11px] text-[var(--gem-gray-500)]">
          <div className="flex-1 h-px" style={{ background: 'var(--gem-gray-700)' }} />
          or
          <div className="flex-1 h-px" style={{ background: 'var(--gem-gray-700)' }} />
        </div>

        <form onSubmit={handleSignup} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Full name"
                className="w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 border-0"
                style={{
                  background: 'var(--gem-gray-800)',
                  color: 'var(--gem-gray-50)',
                  // @ts-expect-error CSS custom prop
                  '--tw-ring-color': 'var(--gem-accent)',
                }}
              />
            </div>
            <div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder="Phone"
                className="w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 border-0"
                style={{
                  background: 'var(--gem-gray-800)',
                  color: 'var(--gem-gray-50)',
                  // @ts-expect-error CSS custom prop
                  '--tw-ring-color': 'var(--gem-accent)',
                }}
              />
            </div>
          </div>
          <div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 border-0"
              style={{
                background: 'var(--gem-gray-800)',
                color: 'var(--gem-gray-50)',
                // @ts-expect-error CSS custom prop
                '--tw-ring-color': 'var(--gem-accent)',
              }}
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Password (6+ characters)"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 border-0"
              style={{
                background: 'var(--gem-gray-800)',
                color: 'var(--gem-gray-50)',
                // @ts-expect-error CSS custom prop
                '--tw-ring-color': 'var(--gem-accent)',
              }}
            />
          </div>

          {error && <p className="text-[12px] text-red-400 m-0">{error}</p>}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 rounded-lg text-white font-semibold text-[13px] disabled:opacity-50 transition-all active:scale-[0.985] border-0 cursor-pointer hover:brightness-110 mt-1"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
            }}
          >
            {loading
              ? 'Creating account…'
              : done
                ? 'View your report'
                : 'Create your account'
            }
          </button>
        </form>

        <p className="text-center text-[11px] text-[var(--gem-gray-500)] mt-3 m-0">
          Already have an account?{' '}
          <a href="/login" className="font-semibold" style={{ color: 'var(--gem-accent)' }}>
            Log in
          </a>
        </p>
      </div>
    </div>
  )
}
