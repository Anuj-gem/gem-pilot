'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { trackInlineSignupStarted, trackInlineSignupCompleted } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'

interface InlineSignupProps {
  submissionId: string
  evaluationId: string
}

export function InlineSignup({ submissionId, evaluationId }: InlineSignupProps) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    trackInlineSignupStarted({ evaluationId })

    // 1. Create the account
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

    // If email confirmation is required and no session was created
    if (data.user && !data.session) {
      setError('Check your email to confirm your account. Your report will be saved once you confirm.')
      setLoading(false)
      return
    }

    trackInlineSignupCompleted({ evaluationId })
    gtagSignupCompleted()

    // 2. Assign the anonymous submission to the new user
    try {
      await fetch('/api/assign-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })
    } catch {
      // Non-blocking — the report is still saved via the session
    }

    setSuccess(true)
    setLoading(false)

    // Refresh to re-render page with authenticated state
    router.refresh()
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-700 bg-emerald-950/30 p-4 sm:p-5">
        <p className="text-sm font-semibold text-emerald-300">Account created — your report is saved.</p>
        <p className="text-xs text-emerald-400/80 mt-1">
          Subscribe to unlock the full producer read and publish to the leaderboard.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--gem-gray-600)] bg-[var(--gem-gray-900)] p-4 sm:p-5">
      <h3 className="text-sm font-bold text-[var(--gem-white)] mb-1">
        Create your account to save this report
      </h3>
      <p className="text-xs text-[var(--gem-gray-400)] mb-4">
        Otherwise it expires when the timer runs out.
      </p>

      <form onSubmit={handleSignup} className="space-y-3">
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          placeholder="Full name"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Email address"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="Password (6+ characters)"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
        />

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Save my report
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
