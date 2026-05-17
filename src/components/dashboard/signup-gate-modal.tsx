'use client'

// SignupGateModal — overlay modal triggered when anonymous users try to
// take actions that require an account (Apply, Share on Leaderboard, etc).
// Listens for 'gem:open-signup-gate' custom event with optional contextMessage.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export function SignupGateModal() {
  const [open, setOpen] = useState(false)
  const [contextMessage, setContextMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent).detail || {}
      setContextMessage(detail.contextMessage || 'Create an account to save your scripts, post to the leaderboard, and apply for opportunities.')
      setOpen(true)
      setError('')
    }
    window.addEventListener('gem:open-signup-gate', handleOpen)
    return () => window.removeEventListener('gem:open-signup-gate', handleOpen)
  }, [])

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`
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

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Claim anonymous uploads
    const anonCookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('gem_anon_scripts='))
      ?.split('=')[1]
    if (anonCookie && data.user?.id) {
      fetch('/api/claim-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, script_ids: anonCookie.split(',') }),
        keepalive: true,
      }).catch(() => {})
      document.cookie = 'gem_anon_scripts=;path=/;max-age=0'
    }

    // Fire welcome email
    if (data.user?.id) {
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, email }),
        keepalive: true,
      }).catch(() => {})
    }

    setOpen(false)
    router.refresh()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-8">
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors border-0 cursor-pointer bg-transparent"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        {/* Context message */}
        <p className="text-[15px] font-semibold text-gray-900 m-0 mb-6 pr-8 leading-snug">
          {contextMessage}
        </p>

        {/* Google signup */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[14px] font-semibold border cursor-pointer transition-colors hover:bg-gray-50 disabled:opacity-50 mb-4"
          style={{ background: 'white', borderColor: '#e5e7eb', color: '#374151' }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[12px] text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email signup form */}
        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border text-[14px] outline-none focus:border-purple-400 transition-colors"
            style={{ borderColor: '#e5e7eb' }}
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border text-[14px] outline-none focus:border-purple-400 transition-colors"
            style={{ borderColor: '#e5e7eb' }}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border text-[14px] outline-none focus:border-purple-400 transition-colors"
            style={{ borderColor: '#e5e7eb' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3.5 py-2.5 rounded-lg border text-[14px] outline-none focus:border-purple-400 transition-colors"
            style={{ borderColor: '#e5e7eb' }}
          />

          {error && (
            <p className="text-[13px] text-red-600 m-0">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-[14px] font-bold text-white border-0 cursor-pointer transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-[12px] text-gray-400 text-center mt-4 mb-0">
          Already have an account?{' '}
          <a href="/login" className="text-purple-600 font-medium hover:text-purple-800">Log in</a>
        </p>
      </div>
    </div>
  )
}
