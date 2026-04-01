'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { getPendingFile } from '@/lib/pending-file'
import Nav from '@/components/nav'
import { PaywallModal } from '@/components/ui/paywall-modal'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle, Settings, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
  const [showPaywall, setShowPaywall] = useState(false)

  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [freeEvalUsed, setFreeEvalUsed] = useState<boolean | null>(null)

  // Signup fields (for unauthenticated users)
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

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setAuthChecked(true)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, free_eval_used')
          .eq('id', user.id)
          .single()

        if (profile) {
          setSubscriptionStatus(profile.subscription_status)
          setFreeEvalUsed(profile.free_eval_used)
        }
      }
    }
    checkAuth()
  }, [])

  const isSubscribed = subscriptionStatus === 'active'
  const hasFreeEval = freeEvalUsed === false

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

  // Run the actual evaluation
  const runEvaluation = async () => {
    if (!file || !title) return

    setStep('evaluating')
    setError(null)
    setProgress('Analyzing your script — this takes about 30 seconds...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.error === 'subscription_required') {
        setShowPaywall(true)
        setStep('upload')
        setProgress(null)
        return
      }

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.error || 'Evaluation failed')
      }

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

    if (!user) {
      // Not logged in — show signup step
      setStep('signup')
      return
    }

    // Logged in — go straight to evaluation
    await runEvaluation()
  }

  // Handle inline signup then auto-evaluate
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

    // Supabase signUp with email confirmation disabled returns a session immediately.
    // If email confirmation IS enabled, data.user exists but data.session may be null.
    if (data.user && !data.session) {
      // Email confirmation required — tell user to check email
      setError('Check your email to confirm your account, then come back and log in to evaluate.')
      setSigningUp(false)
      setStep('upload')
      return
    }

    // We have a session — update state and evaluate
    setUser(data.user)
    setFreeEvalUsed(false)
    setSigningUp(false)

    // Small delay for auth to propagate to cookies
    await new Promise(r => setTimeout(r, 500))

    await runEvaluation()
  }

  // Determine button text for logged-in users
  let buttonText = 'Evaluate my script'
  if (!user) {
    buttonText = 'Evaluate my script — free'
  } else if (hasFreeEval && !isSubscribed) {
    buttonText = 'Evaluate my script — free'
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

  // ─── Signup step (landing page conversion flow) ─────────
  if (step === 'signup') {
    return (
      <>
        <Nav />
        <div className="max-w-sm mx-auto px-4 py-10">
          {/* Context bar */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--gem-gray-900)] border border-[var(--gem-gray-700)] mb-8">
            <FileText size={16} className="text-[var(--gem-accent)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{title}</p>
              <p className="text-xs text-[var(--gem-gray-500)]">Ready to evaluate — create an account to continue</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-[var(--gem-gray-400)] mb-8">
            Sign up to get your free evaluation. Takes 10 seconds.
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
            You're subscribed — evaluate unlimited scripts.
          </div>
        )}

        <h1 className="text-2xl font-bold mb-1">Submit a script</h1>
        <p className="text-sm text-[var(--gem-gray-400)] mb-2">
          Upload your screenplay and get a professional evaluation with scores, development notes, and production analysis.
        </p>

        {/* Subscription status badge (logged-in users only) */}
        {authChecked && user && subscriptionStatus !== null && (
          <div className="flex items-center gap-3 mb-8">
            {isSubscribed ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-700 text-emerald-400">
                <CheckCircle size={12} /> Subscribed — unlimited evals
              </span>
            ) : hasFreeEval ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-950/50 border border-blue-700 text-blue-400">
                1 free evaluation available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--gem-gray-800)] border border-[var(--gem-gray-600)] text-[var(--gem-gray-400)]">
                Subscribe to evaluate scripts
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

        {/* Not logged in — show free eval badge */}
        {authChecked && !user && (
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-950/50 border border-blue-700 text-blue-400">
              Your first evaluation is free
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
            {buttonText}
          </button>

          <p className="text-xs text-center text-[var(--gem-gray-500)]">
            Your script is evaluated by AI using the same rubric applied to produced film and television.
          </p>
        </form>
      </div>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
    </>
  )
}
