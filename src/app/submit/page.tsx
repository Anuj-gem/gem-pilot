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
import { FormatStep, type DeclaredFormat } from '@/components/submit/format-step'
import { ScriptStep } from '@/components/submit/script-step'
import { AccountStep, type AccountMode } from '@/components/submit/account-step'
import { ScoringTerminal, DraftSavedTerminal } from '@/components/submit/terminals'
import { updateProfile } from '@/app/profile/actions'

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

  // Resume-from-draft mode: when the writer clicks "Upload PDF" on a saved
  // draft from their dashboard, we land here with ?resume=<id>&format=<fmt>.
  // We skip the format step and route the upload to the existing draft row
  // instead of creating a brand new submission.
  const resumeSubmissionId = searchParams.get('resume')
  const resumeFormatRaw = searchParams.get('format')
  const resumeFormat: DeclaredFormat | null =
    resumeFormatRaw === 'Feature film' || resumeFormatRaw === 'Series'
      ? resumeFormatRaw
      : null

  const [step, setStep] = useState<FlowStep>(
    resumeSubmissionId && resumeFormat ? 'script' : 'format'
  )
  const [declaredFormat, setDeclaredFormat] = useState<DeclaredFormat | null>(
    resumeFormat
  )
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
          // opportunities-v1: skip privacy/profile — go straight to destination.
          let dest: string
          if (pending.mode === 'upload' && pending.evaluation_id) {
            dest = `/report/${pending.evaluation_id}?from=submit${wb}`
          } else if (pending.mode === 'upload') {
            dest = `/dashboard?just_signed_up=1${wb}`
          } else {
            dest = `/dashboard?draft_saved=1${wb}`
          }
          router.replace(dest)
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

  // ─── Step 1 → 2 (or 3): format selected, auto-advance ───
  // If the writer already dropped a PDF on the landing hero, the file
  // lives in state by the time we get here. Skip the script step entirely
  // — fire the eval in the background and jump straight to account
  // (or scoring if they're already logged in). This is the "landing upload
  // collapses the 3-step flow to 2 steps" path.
  const handleFormatSelected = useCallback(
    (f: DeclaredFormat) => {
      setDeclaredFormat(f)
      if (file) {
        setMode('upload')
        fireEvalRequest({ file, declaredFormat: f })
        if (user) {
          setStep('scoring')
          void waitForEvalAndRouteAsLoggedInUser()
        } else {
          setStep('account')
        }
        return
      }
      setStep('script')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, user]
  )

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

    const inferredTitle =
      args.file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'

    // Phase 1: register the submission row + upload the PDF (~3–5s).
    // We need submission_id quickly so OAuth (which redirects the page mid
    // request) has something to claim. Score lookup happens in phase 2.
    //
    // If we're resuming a draft (writer clicked Upload PDF on the dashboard
    // for an existing awaiting_pdf row), pass the draft id along so the
    // server updates that row instead of creating a new one.
    let submissionId: string
    try {
      const startForm = new FormData()
      startForm.append('file', args.file)
      startForm.append('title', inferredTitle)
      startForm.append('declared_format', args.declaredFormat)
      if (resumeSubmissionId) {
        startForm.append('resume_submission_id', resumeSubmissionId)
      }
      const startRes = await fetch('/api/start-submission', {
        method: 'POST',
        body: startForm,
      })
      const startData = await startRes.json().catch(() => null)
      if (startRes.status === 402 || startData?.error === 'paywall') {
        setPaywalled(true)
        setStep('script')
        return
      }
      if (!startRes.ok || !startData?.submission_id) {
        evalFailedRef.current =
          startData?.error ?? `Couldn't register your submission (HTTP ${startRes.status}).`
        return
      }
      submissionId = startData.submission_id as string
      // Stash the id so the OAuth handler can claim it without waiting for
      // the slow scoring to finish. evaluation_id is empty until phase 2.
      evalResultRef.current = { submission_id: submissionId, evaluation_id: '' }
    } catch (e: any) {
      evalFailedRef.current = e?.message ?? 'Network error registering submission'
      return
    }

    // Phase 2: run the scoring (~30–60s). Fire and let it run — Vercel
    // continues the function even if the client disconnects (e.g. mid
    // Google OAuth redirect), so the eval lands in the DB regardless.
    try {
      const scoreRes = await fetch('/api/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })
      const scoreData = await scoreRes.json().catch(() => null)
      if (!scoreRes.ok || !scoreData?.evaluation_id) {
        evalFailedRef.current =
          scoreData?.error ?? `Scoring failed (HTTP ${scoreRes.status}).`
        return
      }
      evalResultRef.current = {
        submission_id: submissionId,
        evaluation_id: scoreData.evaluation_id,
      }
      trackEvalComplete({
        score: scoreData.weighted_score,
        tier: scoreData.tier,
        title: inferredTitle,
        evaluationId: scoreData.evaluation_id,
      })
    } catch {
      // Network drop is non-fatal here — the server keeps scoring. Email
      // signup will time out and route to dashboard, where the eval shows
      // up as it lands.
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
    // Anuj 2026-04-28: short look-ahead window only. If the eval is
    // already done by ~4s, route straight to the report (best UX);
    // otherwise route to /dashboard so the user lands on the processing
    // card with trial messaging and Pro upsell instead of staring at a
    // spinner. RealtimeRefresh on the dashboard picks up the eval
    // completion automatically.
    const lookAheadDeadline = Date.now() + 4000
    while (
      !evalResultRef.current?.evaluation_id &&
      !evalFailedRef.current &&
      Date.now() < lookAheadDeadline
    ) {
      await new Promise((r) => setTimeout(r, 200))
    }
    if (evalFailedRef.current) {
      setError(evalFailedRef.current)
      evalFailedRef.current = null
      setStep('script')
      return
    }
    const evaluationId = evalResultRef.current?.evaluation_id
    if (evaluationId) {
      router.push(`/report/${evaluationId}`)
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
    handle: string
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

    // Persist the handle the writer picked. If it's taken, surface the
    // error in-place rather than letting them discover it later in
    // /onboarding/profile. Anuj 2026-04-30 v0.10.16.
    try {
      const handleResult = await updateProfile({ handle: data.handle })
      if ('error' in handleResult && handleResult.error) {
        setError(handleResult.error)
        setSigningUp(false)
        return
      }
    } catch (e: any) {
      setError(e?.message || 'Could not save your handle.')
      setSigningUp(false)
      return
    }

    if (signupData.user?.id) {
      identifyUser(signupData.user.id, { email: data.email, full_name: data.full_name })
    }
    trackSignupComplete()
    gtagSignupCompleted()
    setUser(signupData.user ? { id: signupData.user.id } : null)

    // See signup-client.tsx for why we pass user_id + use keepalive.
    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: signupData.user?.id, email: data.email }),
      keepalive: true,
    }).catch(() => {})

    if (mode === 'upload') {
      // Wait for phase 1 (submission_id) — needed to claim the row.
      const phase1Deadline = Date.now() + 15_000
      while (
        !evalResultRef.current?.submission_id &&
        !evalFailedRef.current &&
        Date.now() < phase1Deadline
      ) {
        await new Promise((r) => setTimeout(r, 200))
      }
      if (evalFailedRef.current) {
        setError(evalFailedRef.current)
        setSigningUp(false)
        evalFailedRef.current = null
        setStep('script')
        return
      }
      const submissionId = evalResultRef.current?.submission_id
      if (!submissionId) {
        setError('Your submission is taking longer than expected. Refresh in a moment.')
        setSigningUp(false)
        return
      }
      // Claim the anon submission row.
      await new Promise((r) => setTimeout(r, 400))
      try {
        await fetch('/api/assign-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: submissionId }),
        })
      } catch {}
      // Anuj 2026-04-28: route to the dashboard immediately after the
      // account is created. Don't make the user stare at the scoring
      // terminal while the eval finishes — the dashboard's processing
      // card + RealtimeRefresh hook picks up the completion and surfaces
      // "Your report is ready" automatically. They also see the trial
      // badge + Pro value props while waiting, which is useful dead time.
      // Short wait so we can route straight to the report when scoring
      // finishes ahead of the dashboard navigation (lucky-fast path).
      const lookAheadDeadline = Date.now() + 4000
      while (
        !evalResultRef.current?.evaluation_id &&
        !evalFailedRef.current &&
        Date.now() < lookAheadDeadline
      ) {
        await new Promise((r) => setTimeout(r, 200))
      }
      if (evalFailedRef.current) {
        setError(evalFailedRef.current)
        setSigningUp(false)
        evalFailedRef.current = null
        return
      }
      // opportunities-v1: skip privacy/profile — straight to dashboard.
      // The eval may still be running; dashboard processing card picks it up.
      const evaluationId = evalResultRef.current?.evaluation_id
      if (evaluationId) {
        router.push(`/report/${evaluationId}?from=submit`)
      } else {
        router.push('/dashboard?just_signed_up=1&from=submit')
      }
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

  // Heading per step
  const hasFile = !!file
  const stepHeading: { heading: string; subhead: string } | null = (() => {
    if (step === 'format')
      return {
        heading: hasFile ? 'One quick question.' : 'What are you working on?',
        subhead: 'Feature film or series?',
      }
    if (step === 'script')
      return {
        heading: 'Drop your script.',
        subhead: 'PDF only, 10MB max',
      }
    if (step === 'account') return null
    if (step === 'scoring')
      return { heading: 'Processing your script.', subhead: 'This takes about a minute.' }
    return { heading: 'Draft saved.', subhead: 'Upload your PDF anytime from the dashboard.' }
  })()

  function goBack() {
    if (step === 'script') { setDeclaredFormat(null); setStep('format') }
    else if (step === 'account') { setStep(hasFile ? 'format' : 'script') }
  }

  const showBack = step === 'script' || step === 'account'

  return (
    <main className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      {/* Minimal top bar */}
      <div className="sticky top-0 z-30 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm">
        <div className="max-w-[520px] mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" prefetch={false} className="inline-flex items-center gap-2 group shrink-0">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span className="text-[14px] font-bold tracking-tight text-[var(--gem-gray-50)] group-hover:text-white transition-colors">
              GEM
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                type="button"
                onClick={goBack}
                className="text-[13px] font-semibold text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-50)] transition-colors"
              >
                ← Back
              </button>
            )}
            {step === 'script' && file && (
              <button
                type="button"
                onClick={continueFromScriptStepWithFile}
                className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110"
                style={{ background: 'var(--gem-accent)' }}
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[520px] mx-auto px-5 py-10">
        {stepHeading && (
          <header className="mb-8">
            <h1
              className="m-0 text-[26px] sm:text-[32px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {stepHeading.heading}
            </h1>
            {stepHeading.subhead && (
              <p className="m-0 mt-2 text-[14.5px] text-[var(--gem-gray-300)] leading-[1.55]">
                {stepHeading.subhead}
              </p>
            )}
          </header>
        )}

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

        {!user && step !== 'scoring' && step !== 'draft_saved' && (
          <p className="text-[12.5px] text-[var(--gem-gray-500)] mt-10">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--gem-accent)] hover:underline">
              Log in
            </Link>
          </p>
        )}
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
