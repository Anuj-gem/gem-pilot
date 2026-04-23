// Guided submit flow.
//
// 3 steps for anon writers (format → script → account), 2 steps for logged-in
// writers (format → script). The "script" step has an escape hatch: if the
// writer doesn't have their PDF on hand, they can save a draft and come back.
//
// Background work to keep the wait felt-zero:
//   - As soon as we leave step 2 with a file, we POST /api/evaluate so the
//     eval is running while they're filling out the account form.
//   - As soon as we leave step 2 without a file, we POST /api/draft-submission
//     to reserve their draft id.
//
// Google OAuth handoff: signInWithOAuth bounces the browser away. Before the
// bounce we stash {submission_id, mode} in localStorage; on the way back the
// /auth/callback route redirects here, this page detects the auth + the stash,
// claims the submission, and routes to the right destination.
'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { getPendingFile } from '@/lib/pending-file'
import {
  identifyUser,
  trackEvalStart,
  trackEvalComplete,
  trackSignupComplete,
  trackSubscriptionActivated,
  trackSubscribeClick,
} from '@/lib/posthog'
import {
  gtagEvalStarted,
  gtagSignupCompleted,
  gtagSubscribeCompleted,
  gtagSubscribeClicked,
} from '@/lib/gtag'
import { ProgressHeader } from '@/components/submit/progress-header'
import { FormatStep, type DeclaredFormat } from '@/components/submit/format-step'
import { ScriptStep } from '@/components/submit/script-step'
import { AccountStep, type AccountMode } from '@/components/submit/account-step'
import { ScoringTerminal, DraftSavedTerminal } from '@/components/submit/terminals'

type FlowStep = 'format' | 'script' | 'account' | 'scoring' | 'draft_saved'

interface PendingClaim {
  submission_id: string
  mode: AccountMode
  evaluation_id?: string
}

const PENDING_CLAIM_KEY = 'gem_pending_claim'

function readPendingClaim(): PendingClaim | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PENDING_CLAIM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.submission_id || !parsed?.mode) return null
    return parsed as PendingClaim
  } catch {
    return null
  }
}

function writePendingClaim(claim: PendingClaim) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify(claim))
  } catch {}
}

function clearPendingClaim() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PENDING_CLAIM_KEY)
  } catch {}
}

export default function SubmitPage() {
  return (
    <Suspense fallback={null}>
      <SubmitPageInner />
    </Suspense>
  )
}

function SubmitPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [step, setStep] = useState<FlowStep>('format')
  const [declaredFormat, setDeclaredFormat] = useState<DeclaredFormat | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<AccountMode>('upload')

  // Background work state — stored in refs so the async signup loop can read
  // live values without stale-closure bugs.
  const evalResultRef = useRef<{ evaluation_id: string; submission_id: string } | null>(null)
  const evalFailedRef = useRef<string | null>(null)
  const draftSubmissionIdRef = useRef<string | null>(null)
  const draftFailedRef = useRef<string | null>(null)

  const [signingUp, setSigningUp] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paywalled, setPaywalled] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  const justSubscribed = searchParams.get('subscribed') === 'true'

  // ─── Mount: auth check + Stripe-return tracking + OAuth-callback claim ───
  useEffect(() => {
    if (justSubscribed) {
      trackSubscriptionActivated()
      gtagSubscribeCompleted()
      fetch('/api/send-upgrade-email', { method: 'POST' }).catch(() => {})
    }

    async function bootstrap() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser ? { id: authUser.id } : null)
      setAuthChecked(true)

      // OAuth round-trip: claim any pending submission and route.
      if (authUser) {
        const pending = readPendingClaim()
        if (pending) {
          try {
            await fetch('/api/assign-submission', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ submission_id: pending.submission_id }),
            })
          } catch {
            // non-fatal — they'll see the row on /dashboard either way
          }
          clearPendingClaim()
          // Returning user (account predates this session by >60s) gets a
          // "welcome back" framing on the destination page instead of a
          // newly-signed-up celebration.
          const accountAgeMs =
            Date.now() - new Date(authUser.created_at).getTime()
          const returning = accountAgeMs > 60_000
          const wb = returning ? '&welcome_back=1' : ''
          if (pending.mode === 'upload' && pending.evaluation_id) {
            router.replace(`/report/${pending.evaluation_id}?from=submit${wb}`)
          } else if (pending.mode === 'upload') {
            router.replace(`/dashboard?just_signed_up=1${wb}`)
          } else {
            router.replace(`/dashboard?draft_saved=1${wb}`)
          }
          return
        }
      }

      // Pick up a file the writer drag-dropped on the landing hero.
      const pending = getPendingFile()
      if (pending) {
        setFile(pending)
        setMode('upload')
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Step 1 → 2: format selected, auto-advance ───
  const handleFormatSelected = useCallback((f: DeclaredFormat) => {
    setDeclaredFormat(f)
    setStep('script')
  }, [])

  // ─── Step 2: file picked ───
  const handleFileChosen = useCallback((f: File) => {
    setFile(f)
    setError(null)
  }, [])

  // Continue button on step 2 once a file is picked.
  async function continueFromScriptStepWithFile() {
    if (!file || !declaredFormat) return
    setError(null)
    setMode('upload')
    fireEvalRequest({ file, declaredFormat })
    if (user) {
      setStep('scoring')
      void waitForEvalAndRouteAsLoggedInUser()
    } else {
      setStep('account')
    }
  }

  async function continueFromScriptStepWithoutFile() {
    if (!declaredFormat) return
    setError(null)
    setMode('draft')
    if (user) {
      // Logged-in writer hit "save draft" — wait for the row to actually land
      // before redirecting, otherwise the dashboard renders before the insert
      // commits and shows "no scripts yet".
      await fireDraftRequest({ declaredFormat })
      if (draftFailedRef.current) {
        setError(`We couldn't save your draft — ${draftFailedRef.current}. Try again.`)
        return
      }
      router.push('/dashboard?draft_saved=1')
    } else {
      // Anon writer — fire-and-forget so the account step renders immediately.
      fireDraftRequest({ declaredFormat })
      setStep('account')
    }
  }

  async function fireEvalRequest(args: { file: File; declaredFormat: DeclaredFormat }) {
    evalResultRef.current = null
    evalFailedRef.current = null
    trackEvalStart({ title: args.file.name, source: 'guided_submit' })
    gtagEvalStarted()
    try {
      const formData = new FormData()
      formData.append('file', args.file)
      const inferredTitle =
        args.file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'
      formData.append('title', inferredTitle)
      formData.append('declared_format', args.declaredFormat)

      const res = await fetch('/api/evaluate', { method: 'POST', body: formData })
      let data: any
      try { data = await res.json() } catch { throw new Error('eval_json_parse') }

      if (res.status === 402 || data.error === 'paywall') {
        setPaywalled(true)
        setStep('script')
        return
      }
      if (data.error) {
        const friendly = data.error === 'SCANNED_PDF'
          ? "Looks like this is a scanned PDF. We need a digital export from Final Draft, WriterSolo, or Highland."
          : 'Something went wrong scoring your script. Please try again.'
        evalFailedRef.current = friendly
        return
      }
      if (!res.ok || data.status === 'failed') {
        evalFailedRef.current = 'Something went wrong scoring your script. Please try again.'
        return
      }
      evalResultRef.current = {
        evaluation_id: data.evaluation_id,
        submission_id: data.submission_id,
      }
      trackEvalComplete({
        score: data.weighted_score,
        tier: data.tier,
        title: data.title ?? inferredTitle,
        evaluationId: data.evaluation_id,
      })
    } catch {
      evalFailedRef.current = 'Something went wrong scoring your script. Please try again.'
    }
  }

  async function fireDraftRequest(args: { declaredFormat: DeclaredFormat }) {
    draftSubmissionIdRef.current = null
    draftFailedRef.current = null
    try {
      const res = await fetch('/api/draft-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declared_format: args.declaredFormat }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.submission_id) {
        draftSubmissionIdRef.current = data.submission_id
      } else {
        draftFailedRef.current =
          data?.error ?? `Draft create failed (HTTP ${res.status})`
      }
    } catch (e: any) {
      draftFailedRef.current = e?.message ?? 'Network error creating draft'
    }
  }

  async function waitForEvalAndRouteAsLoggedInUser() {
    const deadline = Date.now() + 120_000
    while (
      !evalResultRef.current &&
      !evalFailedRef.current &&
      Date.now() < deadline
    ) {
      await new Promise((r) => setTimeout(r, 400))
    }
    if (evalFailedRef.current) {
      setError(evalFailedRef.current)
      evalFailedRef.current = null
      setStep('script')
      return
    }
    if (evalResultRef.current) {
      router.push(`/report/${evalResultRef.current.evaluation_id}`)
      return
    }
    router.push('/dashboard?just_submitted=1')
  }

  async function handleGoogle() {
    // Re-entrant guard: if a click is already in flight, ignore subsequent
    // clicks. The button-smash bug was happening because handleGoogle could
    // run multiple times in parallel while waiting on the OAuth redirect.
    if (googleLoading) return
    setGoogleLoading(true)
    setError(null)
    // Wait up to 10s for the background submission_id (eval or draft) to land
    // before bouncing to Google. If the background API errored, surface that.
    const deadline = Date.now() + 10_000
    while (
      !evalResultRef.current?.submission_id &&
      !draftSubmissionIdRef.current &&
      !evalFailedRef.current &&
      !draftFailedRef.current &&
      Date.now() < deadline
    ) {
      await new Promise((r) => setTimeout(r, 200))
    }
    if (mode === 'upload' && evalFailedRef.current) {
      setError(evalFailedRef.current)
      setGoogleLoading(false)
      return
    }
    if (mode === 'draft' && draftFailedRef.current) {
      setError(`We couldn't save your draft — ${draftFailedRef.current}. Try refreshing.`)
      setGoogleLoading(false)
      return
    }
    const submissionId =
      mode === 'upload'
        ? evalResultRef.current?.submission_id
        : draftSubmissionIdRef.current
    if (!submissionId) {
      setError("Still getting your submission ready. Give it another moment, then click Continue with Google again.")
      setGoogleLoading(false)
      return
    }
    writePendingClaim({
      submission_id: submissionId,
      mode,
      evaluation_id: evalResultRef.current?.evaluation_id,
    })

    const redirectTo = `${window.location.origin}/auth/callback?next=/submit`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      clearPendingClaim()
      setError(oauthError.message)
      setGoogleLoading(false)
    }
    // On success, the browser is mid-redirect to Google — leave googleLoading
    // true so the spinner stays visible until the page unloads.
  }

  async function handleEmailSignup(data: {
    full_name: string
    email: string
    password: string
  }) {
    setSigningUp(true)
    setError(null)

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })

    if (signupError) {
      setError(signupError.message)
      setSigningUp(false)
      return
    }
    if (signupData.user && !signupData.session) {
      setError('Check your email to confirm your account, then log back in to pick up where you left off.')
      setSigningUp(false)
      return
    }

    if (signupData.user?.id) {
      identifyUser(signupData.user.id, { email: data.email, full_name: data.full_name })
    }
    trackSignupComplete()
    gtagSignupCompleted()
    setUser(signupData.user ? { id: signupData.user.id } : null)

    fetch('/api/send-welcome', { method: 'POST' }).catch(() => {})

    if (mode === 'upload') {
      const deadline = Date.now() + 120_000
      while (
        !evalResultRef.current &&
        !evalFailedRef.current &&
        Date.now() < deadline
      ) {
        await new Promise((r) => setTimeout(r, 400))
      }
      if (evalFailedRef.current) {
        setError(evalFailedRef.current)
        setSigningUp(false)
        evalFailedRef.current = null
        setStep('script')
        return
      }
      const result = evalResultRef.current
      if (!result) {
        setError('Your evaluation is taking longer than expected. Refresh in a moment to see your report.')
        setSigningUp(false)
        return
      }
      await new Promise((r) => setTimeout(r, 400))
      try {
        await fetch('/api/assign-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: result.submission_id }),
        })
      } catch {}
      router.push(`/report/${result.evaluation_id}`)
    } else {
      const deadline = Date.now() + 6000
      while (!draftSubmissionIdRef.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200))
      }
      const submissionId = draftSubmissionIdRef.current
      if (submissionId) {
        await new Promise((r) => setTimeout(r, 400))
        try {
          await fetch('/api/assign-submission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submissionId }),
          })
        } catch {}
      }
      setStep('draft_saved')
      setSigningUp(false)
    }
  }

  async function handleUpgrade() {
    trackSubscribeClick('submit_paywall')
    gtagSubscribeClicked()
    setUpgradeLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setError('Could not start checkout. Try again.')
        setUpgradeLoading(false)
      }
    } catch {
      setError('Could not start checkout. Try again.')
      setUpgradeLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--gem-black)]">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--gem-gray-700)] border-t-[var(--gem-accent)] animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--gem-black)]">
      <div className="max-w-[680px] mx-auto px-3 sm:px-6 py-3 sm:py-6">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--gem-black)',
            border: '1px solid var(--gem-gray-700)',
          }}
        >
          {step !== 'scoring' && step !== 'draft_saved' && (
            <ProgressHeader
              step={step === 'format' ? 1 : step === 'script' ? 2 : 3}
              onBack={() => {
                if (step === 'script') {
                  // Clear the format so FormatStep doesn't auto-advance us
                  // straight back forward — the writer should explicitly
                  // re-confirm Feature/Series before continuing.
                  setDeclaredFormat(null)
                  setStep('format')
                } else if (step === 'account') {
                  setStep('script')
                }
              }}
              badge={
                step === 'account'
                  ? mode === 'upload'
                    ? 'with PDF'
                    : 'draft only'
                  : undefined
              }
            />
          )}

          <div className="px-5 sm:px-12 pt-6 pb-2">
            {step === 'format' && (
              <FormatStep initial={declaredFormat} onSelect={handleFormatSelected} />
            )}

            {step === 'script' && (
              <>
                <ScriptStep
                  initialFileName={file?.name ?? null}
                  onFileChosen={handleFileChosen}
                  onSkip={continueFromScriptStepWithoutFile}
                />
                {file && (
                  <div className="max-w-[520px] mx-auto pb-8 -mt-4">
                    <button
                      type="button"
                      onClick={continueFromScriptStepWithFile}
                      className="w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985] disabled:opacity-60"
                      style={{ background: 'var(--gem-accent)' }}
                    >
                      Continue with this script →
                    </button>
                  </div>
                )}
                {paywalled && <PaywallCard onUpgrade={handleUpgrade} loading={upgradeLoading} />}
                {error && <ErrorBanner message={error} />}
              </>
            )}

            {step === 'account' && (
              <AccountStep
                mode={mode}
                signingUp={signingUp}
                googleLoading={googleLoading}
                error={error}
                onGoogle={handleGoogle}
                onEmailSignup={handleEmailSignup}
              />
            )}

            {step === 'scoring' && <ScoringTerminal />}

            {step === 'draft_saved' && (
              <DraftSavedTerminal
                onUploadNow={() => {
                  setStep('script')
                  setMode('upload')
                  setFile(null)
                }}
                onLater={() => router.push('/dashboard?draft_saved=1')}
              />
            )}
          </div>
        </div>

        <p className="text-center text-[12px] text-[var(--gem-gray-500)] mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--gem-accent)] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}

function PaywallCard({
  onUpgrade,
  loading,
}: {
  onUpgrade: () => void
  loading: boolean
}) {
  return (
    <div
      className="max-w-[520px] mx-auto rounded-2xl p-5 mt-2 mb-6"
      style={{
        background: 'rgba(124,58,237,0.05)',
        border: '1px solid rgba(124,58,237,0.3)',
      }}
    >
      <p className="text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1.5">
        You&apos;ve used your free read.
      </p>
      <p className="text-[13px] text-[var(--gem-gray-300)] m-0 mb-3 leading-snug">
        Go Pro for unlimited reads, Discover publishing, and producer contact.
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'var(--gem-accent)' }}
      >
        {loading ? 'Opening checkout…' : 'Go Pro — $20/mo →'}
      </button>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="max-w-[520px] mx-auto rounded-lg px-3.5 py-2.5 mb-5 text-[13px]"
      style={{
        background: 'rgba(220,38,38,0.06)',
        border: '1px solid rgba(220,38,38,0.25)',
        color: '#b91c1c',
      }}
    >
      {message}
    </div>
  )
}
