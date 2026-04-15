'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'

interface SignupPageClientProps {
  topScripts: any[]
}

export function SignupPageClient({ topScripts }: SignupPageClientProps) {
  return (
    <Suspense>
      <SignupPageInner topScripts={topScripts} />
    </Suspense>
  )
}

function SignupPageInner({ topScripts }: SignupPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    router.push(redirect || '/submit')
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
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors glow-accent"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Value props */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3 text-[var(--gem-gray-200)]">What you get — free forever</h2>
          <div className="space-y-2.5">
            {[
              'Unlimited script evaluations',
              'GEM score, verdict, and report preview',
              'Powered by Selznick — our research-backed scoring system',
              'Save and revisit all your reports',
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <span className="text-sm text-[var(--gem-gray-300)]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Discover tease */}
        {topScripts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <p className="text-xs uppercase tracking-widest text-[var(--gem-gold)] font-medium">Recently on Discover</p>
            </div>
            <p className="text-xs text-[var(--gem-gray-400)] mb-3">
              Real writers putting their scripts in front of the industry.
            </p>
            <div className="space-y-2">
              {topScripts.map((script: any, idx: number) => (
                <Link
                  key={script.evaluation_id ?? idx}
                  href={`/report/${script.evaluation_id}`}
                  className="group block rounded-lg border border-[var(--gem-gray-700)] p-3 hover:border-[var(--gem-gray-500)] transition-colors"
                  style={{ borderLeft: `3px solid var(--gem-gold)` }}
                >
                  <div className="text-sm font-semibold truncate group-hover:text-[var(--gem-accent)] transition-colors">
                    {script.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-[var(--gem-gray-400)] mt-0.5">
                    by {script.author_name || 'Anonymous'}
                  </div>
                  {script.positioning_hook && (
                    <p className="text-xs text-[var(--gem-gray-300)] mt-1.5 leading-snug line-clamp-2">
                      {script.positioning_hook}
                    </p>
                  )}
                </Link>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link href="/discover" className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] font-medium hover:underline">
                Browse Discover <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
