'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { getPendingFile } from '@/lib/pending-file'
import Nav from '@/components/nav'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle, Settings, ArrowRight, Compass } from 'lucide-react'
import Link from 'next/link'
import { trackSignupStart, trackSignupComplete, trackEvalStart, trackEvalComplete, trackSubscriptionActivated } from '@/lib/posthog'
import { gtagEvalStarted, gtagSignupCompleted, gtagSubscribeCompleted } from '@/lib/gtag'

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitPageInner />
    </Suspense>
  )
}

type FlowStep = 'upload' | 'signup' | 'evaluating'

function SubmitPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth state
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Signup fields (for unauthenticated users coming from mobile)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingUp, setSigningUp] = useState(false)

  // Flow control
  const [step, setStep] = useState<FlowStep>('upload')

  const justSubscribed = searchParams.get('subscribed') === 'true'
  const fromHero = searchParams.get('from') === 'hero'

  // Check auth + pick up hero file on mount
  useEffect(() => {
    // Pick up file from landing page hero
    const pending = getPendingFile()
    if (pending) {
      setFile(pending)
      const name = pending.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
      if (!title) setTitle(name)
    }

    // Fire subscription conversion events when returning from Stripe checkout
    if (justSubscribed) {
      trackSubscriptionActivated()
      gtagSubscribeCompleted()
    }

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setAuthChecked(true)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single()

        setIsSubscribed(profile?.subscription_status === 'active')
      }
    }
    checkAuth()
  }, [justSubscribed])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setError('Please upload a PDF file')
        return
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError('File too large (max 10MB)')
        return
      }
      setFile(selected)
      setError(null)
      if (!title) {
        const name = selected.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
        setTitle(name)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      if (dropped.type !== 'application/pdf') {
        setError('Please upload a PDF file')
        return
      }
      setFile(dropped)
      setError(null)
      if (!title) {
        const name = dropped.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
        setTitle(name)
      }
    }
  }

  const handleManageSubscription = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  // Run the actual evaluation (works for both authenticated and anonymous users)
  const runEvaluation = async () => {
    if (!file || !title) return

    setStep('evaluating')
    setError(null)
    setProgress('Analyzing your script — this takes about 30 seconds...')
    trackEvalStart({ title, source: fromHero ? 'hero' : 'submit' })
    gtagEvalStarted()

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.error === 'rate_limit') {
        setError(data.message || 'Rate limit reached. Subscribe for unlimited access.')
        setStep('upload')
        setProgress(null)
        return
      }

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.error || 'Evaluation failed')
      }

      trackEvalComplete({ score: data.weighted_score, tier: data.tier })
      // Always redirect to report — it handles blurred vs full based on subscription
      router.push(`/report/${data.evaluation_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('upload')
      setProgress(null)
    }
  }

  // Handle the main submit button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return

    // Everyone can evaluate — anonymous or logged in
    // The paywall is on the report page, not here
    await runEvaluation()
  }

  // Handle inline signup then auto-evaluate (for users who clicked signup on mobile)
  const handleSignupAndEvaluate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigningUp(true)
    setError(null)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setSigningUp(false)
      return
    }

    if (data.user && !data.session) {
      setError('Check your email to confirm your account, then come back and log in to evaluate.')
      setSigningUp(false)
      setStep('upload')
      return
    }

    trackSignupComplete()
    gtagSignupCompleted()
    setUser(data.user)
    setSigningUp(false)

    // Small delay for auth to propagate to cookies
    await new Promise(r => setTimeout(r, 500))

    await runEvaluation()
  }

  // ─── Evaluating state ──────────────────────────────────
  if (step === 'evaluating') {
    return (
      <>
        <Nav />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <Loader2 size={40} className="animate-spin text-[var(--gem-accent)] mx-auto mb-6" />
          <h2 className="text-xl font-bold mb-2">Evaluating your script</h2>
          <p className="text-sm text-[var(--gem-gray-400)]">{progress}</p>
          <div className="mt-6 text-xs text-[var(--gem-gray-600)]">
            {file?.name} — {title}
          </div>
        </div>
      </>
    )
  }

  // ─── Signup step (only used if user explicitly needs to sign up mid-flow) ───
  if (step === 'signup') {
    return (
      <>
        <Nav />
        <div className="max-w-sm mx-auto px-4 py-10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--gem-gray-900)] border border-[var(--gem-gray-700)] mb-8">
            <FileText size={16} className="text-[var(--gem-accent)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{title}</p>
              <p className="text-xs text-[var(--gem-gray-500)]">Ready to evaluate — create an account to save your results</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-[var(--gem-gray-400)] mb-8">
            Sign up to save evaluations and track your scripts.
          </p>

          <form onSubmit={handleSignupAndEvaluate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Your name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Password</label>
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
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800 text-red-300 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={signingUp}
              className="w-full py-3 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {signingUp ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create account & evaluate
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--gem-gray-400)]">
            Already have an account?{' '}
            <Link href="/login?redirect=/submit" className="text-[var(--gem-accent)] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </>
    )
  }

  // ─── Upload step (default) ─────────────────────────────
  return (
    <>
      <Nav />
      <div className="max-w-lg mx-auto px-4 py-10">
        {justSubscribed && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-sm mb-6">
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
            You&apos;re subscribed — evaluate unlimited scripts with full reports.
          </div>
        )}

        <h1 className="text-2xl font-bold mb-1">Submit a script</h1>
        <p className="text-sm text-[var(--gem-gray-400)] mb-2">
          Upload your screenplay and see how it scores. Subscribe for the full report with development notes and comparables.
        </p>

        {/* Subscription status badge */}
        {authChecked && user && (
          <div className="flex items-center gap-3 mb-8">
            {isSubscribed ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-700 text-emerald-400">
                <CheckCircle size={12} /> Subscribed — full reports unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--gem-gray-800)] border border-[var(--gem-gray-600)] text-[var(--gem-gray-400)]">
                Free — score visible, full report requires subscription
              </span>
            )}
            {isSubscribed && (
              <button
                onClick={handleManageSubscription}
                className="inline-flex items-center gap-1 text-xs text-[var(--gem-gray-400)] hover:text-white transition-colors"
              >
                <Settings size={12} /> Manage
              </button>
            )}
          </div>
        )}

        {/* Not logged in badge */}
        {authChecked && !user && (
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-950/50 border border-blue-700 text-blue-400">
              Free to evaluate — no account needed
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
              Script title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Superstition, Canela Café"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
              Script file (PDF)
            </label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center py-10 px-4
                border-2 border-dashed rounded-xl cursor-pointer transition-colors
                ${file
                  ? 'border-[var(--gem-accent)] bg-[var(--gem-accent)]/5'
                  : 'border-[var(--gem-gray-600)] hover:border-[var(--gem-gray-400)]'
                }
              `}
            >
              {file ? (
                <>
                  <FileText size={32} className="text-[var(--gem-accent)] mb-2" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-[var(--gem-gray-400)] mt-1">
                    {(file.size / 1024).toFixed(0)} KB — click to change
                  </span>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-[var(--gem-gray-400)] mb-2" />
                  <span className="text-sm text-[var(--gem-gray-300)]">
                    Drop your PDF here or click to browse
                  </span>
                  <span className="text-xs text-[var(--gem-gray-500)] mt-1">Max 10MB</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800 text-red-300 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || !title}
            className="w-full py-3 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Evaluate my script
          </button>

          <p className="text-xs text-center text-[var(--gem-gray-500)]">
            Your script is evaluated by AI using the same rubric applied to produced film and television.
          </p>
        </form>

        {/* Leaderboard nudge */}
        <div className="mt-8 p-4 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
          <div className="flex items-start gap-3">
            <Compass size={18} className="text-[var(--gem-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-[var(--gem-gray-300)]">
                Don&apos;t have a script handy? Browse the leaderboard to see how other writers&apos; screenplays scored.
              </p>
              <Link
                href="/discover"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-[var(--gem-accent)] hover:underline"
              >
                Browse the leaderboard
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
