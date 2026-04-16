'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { getPendingFile } from '@/lib/pending-file'
import Nav from '@/components/nav'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { trackSignupStart, trackSignupComplete, trackEvalStart, trackEvalComplete, trackBlurredReportViewed, trackSubscriptionActivated, trackSubscribeClick, identifyUser } from '@/lib/posthog'
import { gtagEvalStarted, gtagSignupCompleted, gtagSubscribeCompleted, gtagSubscribeClicked } from '@/lib/gtag'

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
  const [title, setTitle] = useState(() => searchParams.get('title') ?? '')
  const [declaredFormat, setDeclaredFormat] = useState<'Feature film' | 'Series' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  // Subscription state + free-eval count
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null)
  const [paywalled, setPaywalled] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  // Signup fields (for unauthenticated users coming from mobile)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingUp, setSigningUp] = useState(false)

  // Flow control
  const [step, setStep] = useState<FlowStep>('upload')

  // Eval-in-flight state (used when anon user needs to sign up while eval runs)
  const [evalResult, setEvalResult] = useState<{ evaluation_id: string; submission_id: string } | null>(null)
  const [evalFailed, setEvalFailed] = useState<string | null>(null)
  const [evalRunning, setEvalRunning] = useState(false)

  // Refs mirror the eval state so the async polling loop in handleAnonSignup
  // can see live values instead of stale closure captures.
  const evalResultRef = useRef<{ evaluation_id: string; submission_id: string } | null>(null)
  const evalFailedRef = useRef<string | null>(null)
  const evalRunningRef = useRef(false)
  useEffect(() => { evalResultRef.current = evalResult }, [evalResult])
  useEffect(() => { evalFailedRef.current = evalFailed }, [evalFailed])
  useEffect(() => { evalRunningRef.current = evalRunning }, [evalRunning])

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

        const subscribed = profile?.subscription_status === 'active'
        setIsSubscribed(subscribed)

        if (!subscribed) {
          const { count } = await supabase
            .from('script_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'completed')
          setFreeRemaining(count === 0 ? 1 : 0)
        }
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

  // Fire off the evaluation request. Returns the response data or null on handled error.
  // For anon flow we kick this off in the background and handle completion separately.
  const fireEvalRequest = async (): Promise<{ evaluation_id: string; submission_id: string } | null> => {
    if (!file || !title || !declaredFormat) return null
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      formData.append('declared_format', declaredFormat)

      const res = await fetch('/api/evaluate', { method: 'POST', body: formData })
      let data: any
      try { data = await res.json() } catch { throw new Error('eval_json_parse') }

      if (res.status === 402 || data.error === 'paywall') {
        setPaywalled(true)
        setStep('upload')
        setProgress(null)
        return null
      }

      if (data.error) {
        const friendly = data.error === 'SCANNED_PDF'
          ? 'It looks like this is a scanned PDF. We currently only support digitally-created PDFs (from Final Draft, WriterSolo, Highland, etc). Please re-export your script as a digital PDF and try again.'
          : 'Something went wrong evaluating your script. Please try again.'
        setEvalFailed(friendly)
        evalFailedRef.current = friendly
        return null
      }
      if (!res.ok || data.status === 'failed') {
        setEvalFailed('Something went wrong evaluating your script. Please try again.')
        evalFailedRef.current = 'Something went wrong evaluating your script. Please try again.'
        return null
      }

      trackEvalComplete({
        score: data.weighted_score,
        tier: data.tier,
        title: data.title ?? title,
        evaluationId: data.evaluation_id,
      })
      return { evaluation_id: data.evaluation_id, submission_id: data.submission_id }
    } catch {
      setEvalFailed('Something went wrong evaluating your script. Please try again.')
      return null
    }
  }

  // Logged-in flow: run eval synchronously, redirect when done.
  const runEvaluation = async () => {
    if (!file || !title || !declaredFormat) return
    setStep('evaluating')
    setError(null)
    setProgress('Analyzing your script — this takes about 30 seconds...')
    trackEvalStart({ title, source: fromHero ? 'hero' : 'submit' })
    gtagEvalStarted()

    const result = await fireEvalRequest()
    if (!result) {
      // Either paywalled (state already set) or failed
      if (evalFailed) {
        setError(evalFailed)
        setEvalFailed(null)
      }
      setStep('upload')
      setProgress(null)
      return
    }
    router.push(`/report/${result.evaluation_id}`)
  }

  // Anon flow: kick off eval in background AND switch to signup step simultaneously.
  const startAnonFlow = () => {
    if (!file || !title || !declaredFormat) return
    setStep('signup')
    setError(null)
    setEvalRunning(true)
    evalRunningRef.current = true
    setEvalResult(null)
    evalResultRef.current = null
    setEvalFailed(null)
    evalFailedRef.current = null
    trackEvalStart({ title, source: fromHero ? 'hero' : 'submit' })
    gtagEvalStarted()
    // Fire and forget — result is captured in state + refs
    fireEvalRequest().then((result) => {
      setEvalRunning(false)
      evalRunningRef.current = false
      if (result) {
        setEvalResult(result)
        evalResultRef.current = result
      }
    })
  }

  // Handle the main submit button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !declaredFormat) return
    if (user) {
      await runEvaluation()
    } else {
      startAnonFlow()
    }
  }

  // Sign up the anon user. The eval is already running in the background.
  // After signup: poll/wait for the eval to finish, then assign the submission
  // to the user and redirect to the report.
  const handleAnonSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigningUp(true)
    setError(null)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signupError) {
      setError(signupError.message)
      setSigningUp(false)
      return
    }

    if (data.user && !data.session) {
      setError('Check your email to confirm your account, then come back and log in to view your report.')
      setSigningUp(false)
      return
    }

    if (data.user?.id) {
      identifyUser(data.user.id, { email, full_name: fullName })
    }
    trackSignupComplete()
    gtagSignupCompleted()
    setUser(data.user)

    // Fire welcome email (fire-and-forget)
    fetch('/api/send-welcome', { method: 'POST' }).catch(() => {})

    // Wait for eval to finish (up to 120s). Read from refs, NOT closure-captured
    // state, so we see live values as the background eval completes.
    const deadline = Date.now() + 120_000
    while (
      !evalResultRef.current &&
      !evalFailedRef.current &&
      Date.now() < deadline
    ) {
      await new Promise(r => setTimeout(r, 400))
    }

    if (evalFailedRef.current) {
      const msg = evalFailedRef.current
      setError(msg)
      setSigningUp(false)
      setStep('upload')
      setEvalFailed(null)
      evalFailedRef.current = null
      return
    }
    const result = evalResultRef.current
    if (!result) {
      setError('Your evaluation is taking longer than expected. Please refresh in a moment to see your report.')
      setSigningUp(false)
      return
    }

    // Let auth cookies propagate
    await new Promise(r => setTimeout(r, 500))

    // Link the anon submission to the newly created user
    try {
      await fetch('/api/assign-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: result.submission_id }),
      })
    } catch {
      // non-fatal — user still gets their report
    }

    router.push(`/report/${result.evaluation_id}`)
  }

  // Kick off Stripe checkout from the paywall card
  const handleUpgrade = async () => {
    trackSubscribeClick('submit_paywall')
    gtagSubscribeClicked()
    setUpgradeLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setUpgradeLoading(false)
      }
    } catch {
      setUpgradeLoading(false)
    }
  }

  // Cycle loading messages
  const [loadingPhase, setLoadingPhase] = useState(0)
  useEffect(() => {
    if (step !== 'evaluating') return
    const messages = [
      'Analyzing your script — this takes about 30 seconds...',
      'Reading structure, characters, and dialogue...',
      'Scoring across research-backed dimensions...',
      'Almost done — finalizing your report...',
    ]
    setProgress(messages[0])
    const timers = messages.slice(1).map((msg, i) =>
      setTimeout(() => setProgress(msg), (i + 1) * 12000)
    )
    return () => timers.forEach(clearTimeout)
  }, [step])

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

  // ─── Signup step — eval runs in background while user signs up ───
  if (step === 'signup') {
    const evalStatus = evalFailed
      ? { label: 'Evaluation failed', color: 'text-red-400', spinning: false }
      : evalResult
        ? { label: 'Evaluation ready — sign up to view', color: 'text-emerald-400', spinning: false }
        : { label: 'Evaluating your script…', color: 'text-[var(--gem-accent)]', spinning: true }

    return (
      <>
        <Nav />
        <div className="max-w-sm mx-auto px-4 py-10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--gem-gray-900)] border border-[var(--gem-gray-700)] mb-6">
            {evalStatus.spinning ? (
              <Loader2 size={16} className="animate-spin text-[var(--gem-accent)] shrink-0" />
            ) : evalResult ? (
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--gem-white)] truncate">{title}</p>
              <p className={`text-xs ${evalStatus.color}`}>{evalStatus.label}</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1">Create your account to see your report</h1>
          <p className="text-sm text-[var(--gem-gray-400)] mb-6">
            Your evaluation is running now. Sign up while you wait — we&apos;ll take you straight to the report when it&apos;s ready.
          </p>

          <form onSubmit={handleAnonSignup} className="space-y-4">
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
              <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
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
                  {evalResult ? 'Opening your report…' : 'Finishing up…'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create account & view report
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

        <h1 className="text-2xl sm:text-3xl font-bold mb-2 font-[family-name:var(--font-display)]">Get the pitch that sells your script.</h1>
        <p className="text-sm text-[var(--gem-gray-400)] mb-4">
          Full report in 60 seconds &rarr; Then post it to Discover and get in front of producers.{!isSubscribed && ' First one\u2019s free.'}
        </p>
        {authChecked && !isSubscribed && freeRemaining !== null && (
          <p className="text-xs text-[var(--gem-gray-500)] mb-8">
            Free submissions remaining: {freeRemaining}
          </p>
        )}

        {/* Paywall — user has used their free evaluation */}
        {paywalled && (
          <div className="rounded-xl border-2 border-[var(--gem-gold)]/40 bg-white p-6 mb-6 text-center">
            <h3 className="text-lg font-bold text-[var(--gem-white)] mb-2">
              You used your free evaluation
            </h3>
            <p className="text-sm text-[var(--gem-gray-400)] mb-5 max-w-md mx-auto">
              Go Pro to evaluate unlimited scripts — every draft, every rewrite — and feature them on Discover where producers can find you. $20/month, cancel anytime.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[var(--gem-gold)] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
            >
              {upgradeLoading ? 'Redirecting to checkout…' : 'Go Pro — $20/mo'}
              {!upgradeLoading && <ArrowRight size={14} />}
            </button>
            <p className="text-[11px] text-[var(--gem-gray-500)] mt-3">
              Cancel anytime · Secure checkout via Stripe
            </p>
          </div>
        )}

        {!paywalled && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload zone — dominant element */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center py-14 sm:py-20 px-6
              border-2 border-dashed rounded-2xl cursor-pointer transition-all
              ${file
                ? 'border-[var(--gem-accent)] bg-[var(--gem-accent)]/5'
                : 'border-[var(--gem-gray-600)] hover:border-[var(--gem-accent)]/50 hover:bg-[var(--gem-accent)]/[0.02]'
              }
            `}
          >
            {file ? (
              <>
                <FileText size={40} className="text-[var(--gem-accent)] mb-3" />
                <span className="text-base font-semibold text-[var(--gem-white)]">{file.name}</span>
                <span className="text-xs text-[var(--gem-gray-400)] mt-1">
                  {(file.size / 1024).toFixed(0)} KB — click to change
                </span>
              </>
            ) : (
              <>
                <Upload size={40} className="text-[var(--gem-gray-400)] mb-3" />
                <span className="text-base font-medium text-[var(--gem-gray-200)]">
                  Drop your screenplay PDF here
                </span>
                <span className="text-xs text-[var(--gem-gray-500)] mt-1">or click to browse · Max 10MB</span>
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

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Superstition, Canela Café"
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Feature film', 'Series'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDeclaredFormat(opt)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    declaredFormat === opt
                      ? 'border-[var(--gem-accent)] bg-[var(--gem-accent)]/10 text-[var(--gem-white)]'
                      : 'border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] text-[var(--gem-gray-300)] hover:border-[var(--gem-gray-500)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || !title || !declaredFormat}
            className="w-full py-3.5 rounded-xl bg-[var(--gem-accent)] text-white text-base font-semibold hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Evaluate my script
          </button>

          <p className="text-xs text-center text-[var(--gem-gray-500)]">
            After your report, you can share it on Discover where producers browse.
          </p>
        </form>
        )}
      </div>
    </>
  )
}
