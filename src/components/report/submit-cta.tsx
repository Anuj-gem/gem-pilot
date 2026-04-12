'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, AlertCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { trackInlineSignupStarted, trackInlineSignupCompleted } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'

interface SubmitCtaProps {
  isLoggedIn: boolean
  submissionId: string
  evaluationId: string
  isAnonymousSubmission: boolean
}

/**
 * Primary CTA for free viewers on the report page.
 *
 * - Anonymous users: see account creation form. After signup, their report is
 *   claimed to their new account and they're redirected to the dashboard
 *   (where they see the claimed report + submit button).
 * - Logged-in free users: see a direct link to /submit.
 */
export function SubmitCta({ isLoggedIn, submissionId, evaluationId, isAnonymousSubmission }: SubmitCtaProps) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    trackInlineSignupStarted({ evaluationId })

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

    if (data.user && !data.session) {
      setError('Check your email to confirm your account, then come back to your dashboard.')
      setLoading(false)
      return
    }

    trackInlineSignupCompleted({ evaluationId })
    gtagSignupCompleted()

    // Claim the anonymous submission to the new account
    if (isAnonymousSubmission) {
      try {
        await fetch('/api/assign-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: submissionId }),
        })
      } catch {
        // Non-blocking
      }
    }

    // Redirect to dashboard — they'll see their claimed report + submit button
    router.push('/dashboard')
  }

  // Logged-in user: simple link to submit
  if (isLoggedIn) {
    return (
      <div className="rounded-xl border border-[var(--gem-accent)]/30 bg-[var(--gem-accent)]/5 p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileText size={16} className="text-[var(--gem-accent)]" />
          <h3 className="text-base font-bold text-[var(--gem-white)]">
            Think you can score higher?
          </h3>
        </div>
        <p className="text-sm text-[var(--gem-gray-400)] mb-4">
          Submit your latest draft or a new script — 60-second evaluation.
        </p>
        <a
          href="/submit"
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-semibold hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          Submit a script
          <ArrowRight size={14} />
        </a>
      </div>
    )
  }

  // Anonymous user: create account form
  return (
    <div className="rounded-xl border border-[var(--gem-accent)]/30 bg-[var(--gem-accent)]/5 p-5">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileText size={16} className="text-[var(--gem-accent)]" />
          <h3 className="text-base font-bold text-[var(--gem-white)]">
            Think you can score higher?
          </h3>
        </div>
        <p className="text-sm text-[var(--gem-gray-400)]">
          Create a free account to save this report, then submit another script.
        </p>
      </div>

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
          <div className="flex items-start gap-2 text-xs text-red-500">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-semibold hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create free account
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <p className="text-[10px] text-[var(--gem-gray-500)] text-center mt-2">
        Free forever · No credit card required
      </p>
    </div>
  )
}
