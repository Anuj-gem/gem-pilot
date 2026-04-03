'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/nav'

export default function CompleteSignupPage() {
  return (
    <Suspense>
      <CompleteSignupInner />
    </Suspense>
  )
}

function CompleteSignupInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const reportId = searchParams.get('report')

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!sessionId) {
    return (
      <>
        <Nav />
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
          <p className="text-[var(--gem-gray-400)]">Invalid signup link. Please try subscribing again.</p>
        </div>
      </>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          password,
          full_name: fullName || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      if (data.login_failed) {
        // Account created but auto-login failed — send to login
        router.push(reportId ? `/login?redirect=/report/${reportId}` : '/login')
        return
      }

      // Success — go to the full report
      const redirectTo = data.redirect_report
        ? `/report/${data.redirect_report}?subscribed=true`
        : '/dashboard'

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Nav />
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
              Payment successful
            </div>
            <h1 className="text-2xl font-bold">Set up your account</h1>
            <p className="text-sm text-[var(--gem-gray-400)] mt-1">
              Choose a password to access your reports anytime.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
                Full name <span className="text-[var(--gem-gray-500)]">(optional)</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
                Password
              </label>
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
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Setting up...' : 'View my full report'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
