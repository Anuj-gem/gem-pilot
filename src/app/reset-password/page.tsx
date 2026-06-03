'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-[var(--gem-gray-400)]">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  // On mount, manually parse the recovery token from the URL hash
  // and set the session. Supabase auto-detection doesn't always work
  // after a client-side redirect.
  useEffect(() => {
    let cancelled = false

    async function init() {
      // First check if we already have a session
      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) { setReady(true); return }

      // Parse the hash fragment manually
      const hash = window.location.hash.substring(1) // remove #
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        // Manually set the session from the hash tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (data.session && !cancelled) {
          setReady(true)
          // Clean up the hash from the URL
          window.history.replaceState(null, '', '/reset-password')
          return
        }
        if (sessionError && !cancelled) {
          setError('This reset link has expired or already been used. Please request a new one.')
          return
        }
      }

      // Fallback: listen for auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if (session) setReady(true)
      })

      // Give it 30 seconds then show error
      setTimeout(() => {
        if (!cancelled) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setReady(true)
            else setError('Something went wrong verifying your link. Please try clicking the link in your email again, or request a new one.')
          })
        }
      }, 30000)

      return () => subscription.unsubscribe()
    }

    init()

    return () => {
      cancelled = true
      clearInterval(poll)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a0f35',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 16,
        padding: '40px 32px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 16, height: 16,
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              transform: 'rotate(45deg)',
              borderRadius: 2,
            }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1C1917' }}>GEM</span>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1C1917', margin: '0 0 12px' }}>Password updated</h2>
            <p style={{ fontSize: 15, color: '#57534E', margin: '0 0 20px' }}>Redirecting to your dashboard...</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1C1917', margin: '0 0 8px', textAlign: 'center' }}>
              Set a new password
            </h2>
            <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 24px', textAlign: 'center' }}>
              Enter your new password below.
            </p>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: '#991b1b',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#44403C', marginBottom: 6 }}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={!ready || loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 15,
                    border: '1px solid #d6d3d1',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#44403C', marginBottom: 6 }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={!ready || loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 15,
                    border: '1px solid #d6d3d1',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!ready || loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  background: ready && !loading ? '#7c3aed' : '#a8a29e',
                  border: 'none',
                  borderRadius: 8,
                  cursor: ready && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? 'Updating...' : !ready ? 'Verifying link...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
