'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'

function tierColor(tier: string) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

function tierLabel(tier: string) {
  if (tier === 'Greenlight Material') return 'Greenlight'
  if (tier === 'Optionable') return 'Optionable'
  return 'Development'
}

function tierBg(tier: string) {
  if (tier === 'Greenlight Material') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (tier === 'Optionable') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

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

        {/* Leaderboard tease */}
        {topScripts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <p className="text-xs uppercase tracking-widest text-[var(--gem-gold)] font-medium">Top of the Leaderboard</p>
            </div>
            <p className="text-xs text-[var(--gem-gray-400)] mb-3">
              These writers scored the highest. Create your account, submit your screenplay, and join them.
            </p>
            <div className="space-y-2">
              {topScripts.map((script: any, idx: number) => (
                <Link
                  key={script.evaluation_id ?? idx}
                  href={`/report/${script.evaluation_id}`}
                  className="group flex items-center gap-3 rounded-lg border border-[var(--gem-gray-700)] p-3 hover:border-[var(--gem-gray-500)] transition-colors"
                  style={{ borderLeft: `3px solid ${tierColor(script.tier ?? '')}` }}
                >
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${idx < 3 ? 'text-[var(--gem-gold)]' : 'text-[var(--gem-gray-400)]'}`}>
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate group-hover:text-[var(--gem-accent)] transition-colors">
                      {script.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-[var(--gem-gray-400)]">
                      by {script.author_name || 'Anonymous'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold tabular-nums" style={{ color: tierColor(script.tier ?? '') }}>
                      {typeof script.weighted_score === 'number' ? Math.round(script.weighted_score) : '—'}
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${tierBg(script.tier ?? '')}`}>
                      {tierLabel(script.tier ?? '')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link href="/discover" className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] font-medium hover:underline">
                See the full leaderboard <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
