// Guided onboarding — 5-step flow triggered from the landing page "Get started".
//
// Steps:
//   1. Welcome  — name + genres
//   2. Upload   — format toggle + PDF drop zone
//   3. Account  — Google OAuth or email/password (eval runs in background)
//   4. Profile  — phone, bio, headline
//   5. Results  — score card + matched opportunities
//
// Google OAuth handoff: before the redirect we stash submission state in
// localStorage (ONBOARDING_KEY). The /auth/callback route redirects back
// here with ?next=/get-started; on mount we detect auth + stash → claim
// the submission and resume at step 4.

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import {
  identifyUser,
  trackSignupComplete,
  trackEvalStart,
  trackEvalComplete,
} from '@/lib/posthog'
import {
  gtagSignupCompleted,
  gtagEvalStarted,
} from '@/lib/gtag'
import { updateProfile } from '@/app/profile/actions'
import SmsConsent from '@/components/sms-consent'

// ─── Constants ──────────────────────────────────────────────────────────────

const GENRES = [
  'Drama',
  'Comedy',
  'Thriller',
  'Sci-Fi',
  'Horror',
  'Action',
  'Romance',
  'Animated',
]

const EVAL_MESSAGES = [
  { main: 'Analyzing your script…', sub: 'Reading structure and characters' },
  { main: 'Analyzing your script…', sub: 'Evaluating dialogue and pacing' },
  { main: 'Scoring your work…', sub: 'Audience appeal and marketability' },
  { main: 'Scoring your work…', sub: 'Character depth and potential' },
  { main: 'Matching opportunities…', sub: 'Finding the best fits' },
]

const ONBOARDING_KEY = 'gem_onboarding_state'

type Step = 'welcome' | 'upload' | 'account' | 'profile' | 'results'
const STEPS: Step[] = ['welcome', 'upload', 'account', 'profile', 'results']

interface ResultsData {
  script: { title: string; format: string; status: string; heat: number }
  evaluation: {
    id: string
    score: number
    tier: string
    logline: string
    genres: string[]
  } | null
  opportunities: {
    id: string
    title: string
    description: string
    slug: string
    subtitle: string | null
    deadline: string | null
    created_at: string
    applicant_count: number
  }[]
  total_matches: number
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function ProgressBar({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  return (
    <div className="flex gap-1.5 mb-8">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className="h-[3px] flex-1 rounded-full transition-colors duration-300"
          style={{
            backgroundColor:
              i < idx
                ? 'rgba(124,58,237,0.5)'
                : i === idx
                  ? '#7C3AED'
                  : '#E7E5E4',
          }}
        />
      ))}
    </div>
  )
}

function EvalSpinner({ done }: { done: boolean }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (done) return
    const iv = setInterval(
      () => setIdx((i) => (i + 1) % EVAL_MESSAGES.length),
      2000,
    )
    return () => clearInterval(iv)
  }, [done])

  if (done) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-xl mb-6"
        style={{
          backgroundColor: 'rgba(5,150,105,0.06)',
          border: '1px solid rgba(5,150,105,0.15)',
        }}
      >
        <span className="text-lg">✨</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#059669' }}>
            Your report is ready!
          </p>
        </div>
      </div>
    )
  }

  const msg = EVAL_MESSAGES[idx]
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl mb-6"
      style={{ backgroundColor: '#FAFAF9', border: '1px solid #E7E5E4' }}
    >
      <div className="w-11 h-11 rounded-full border-[3px] border-[#E7E5E4] border-t-[#7C3AED] animate-spin shrink-0" />
      <div>
        <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
          {msg.main}
        </p>
        <p className="text-xs" style={{ color: '#78716C' }}>
          {msg.sub}
        </p>
      </div>
    </div>
  )
}

/* Shared input focus ring */
const inputFocus = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#7C3AED'
    e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E7E5E4'
    e.target.style.boxShadow = 'none'
  },
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-[10px] text-sm outline-none transition-all'
const inputStyle: React.CSSProperties = {
  border: '1px solid #E7E5E4',
  color: '#1a1a1a',
}

// ─── Google logo SVG ────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════

export default function GetStartedClient() {
  const router = useRouter()
  const supabase = createClient()

  // ─── Flow state ───────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('welcome')
  const [fading, setFading] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])

  // Step 2
  const [format, setFormat] = useState<'Feature film' | 'Series'>('Series')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Upload validation sub-state (within the 'upload' step)
  const [uploadSubState, setUploadSubState] = useState<'idle' | 'validating' | 'confirmed'>('idle')
  const [pageEstimate, setPageEstimate] = useState<number | null>(null)

  // Eval
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [evalDone, setEvalDone] = useState(false)
  const [evalFailed, setEvalFailed] = useState<string | null>(null)
  const evalResultRef = useRef<{
    evaluationId: string
    score: number
    tier: string
  } | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Step 3
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingUp, setSigningUp] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  // Step 4
  const [phone, setPhone] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [bio, setBio] = useState('')
  const [headline, setHeadline] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Step 5
  const [resultsData, setResultsData] = useState<ResultsData | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  // ─── Mount: auth check + OAuth return ─────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const raw = localStorage.getItem(ONBOARDING_KEY)
        if (raw) {
          try {
            const s = JSON.parse(raw) as {
              submissionId?: string
              name?: string
              genres?: string[]
              format?: 'Feature film' | 'Series'
              fileName?: string
            }

            // Claim the submission
            if (s.submissionId) {
              fetch('/api/assign-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submission_id: s.submissionId }),
              }).catch(() => {})
              setSubmissionId(s.submissionId)
              startPolling(s.submissionId)
            }

            setName(s.name ?? '')
            setSelectedGenres(s.genres ?? [])
            setFormat(s.format ?? 'Series')
            setFileName(s.fileName ?? '')
            setUser({ id: authUser.id, email: authUser.email ?? undefined })

            identifyUser(authUser.id, {
              email: authUser.email,
              name: s.name,
            })
            trackSignupComplete()
            gtagSignupCompleted()

            localStorage.removeItem(ONBOARDING_KEY)
            setStep('profile')
          } catch {
            localStorage.removeItem(ONBOARDING_KEY)
            router.replace('/dashboard')
          }
        } else {
          // Logged in, no onboarding in progress → dashboard
          router.replace('/dashboard')
        }
      }
    }
    bootstrap()
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Step transitions ─────────────────────────────────────────────────
  function goTo(next: Step) {
    setFading(true)
    setTimeout(() => {
      setStep(next)
      setFading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 120)
  }

  // ─── Eval: fire + poll ────────────────────────────────────────────────
  async function fireEval(f: File, fmt: string) {
    const inferredTitle =
      f.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'
    trackEvalStart({ title: inferredTitle, source: 'get_started' })
    gtagEvalStarted()

    // Phase 1 — register submission + upload PDF
    const body = new FormData()
    body.append('file', f)
    body.append('title', inferredTitle)
    body.append('declared_format', fmt)
    if (selectedGenres[0]) body.append('declared_genre_primary', selectedGenres[0])
    if (selectedGenres[1])
      body.append('declared_genre_secondary', selectedGenres[1])

    try {
      const r1 = await fetch('/api/start-submission', { method: 'POST', body })
      const d1 = await r1.json().catch(() => null)
      if (!r1.ok || !d1?.submission_id) {
        setEvalFailed(d1?.error ?? 'Upload failed')
        return
      }
      const subId = d1.submission_id as string
      setSubmissionId(subId)

      // Phase 2 — score (fire-and-forget; Vercel continues even if client
      // navigates away during Google OAuth)
      fetch('/api/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: subId }),
      })
        .then(async (r2) => {
          const d2 = await r2.json().catch(() => null)
          if (r2.ok && d2?.evaluation_id) {
            evalResultRef.current = {
              evaluationId: d2.evaluation_id,
              score: d2.weighted_score,
              tier: d2.tier,
            }
            setEvalDone(true)
            trackEvalComplete({
              score: d2.weighted_score,
              tier: d2.tier,
              title: inferredTitle,
              evaluationId: d2.evaluation_id,
            })
          } else {
            setEvalFailed(d2?.error ?? 'Scoring failed')
          }
        })
        .catch(() => {
          /* polling picks it up */
        })

      // Start polling as a belt-and-suspenders alongside the fire-and-forget
      startPolling(subId)
    } catch (err: any) {
      setEvalFailed(err?.message ?? 'Network error')
    }
  }

  function startPolling(subId: string) {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/submission-status?id=${subId}`)
        const d = await r.json()
        if (d.status === 'completed') {
          setEvalDone(true)
          if (pollingRef.current) clearInterval(pollingRef.current)
        } else if (d.status === 'failed') {
          setEvalFailed('Evaluation failed')
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch {
        /* retry next tick */
      }
    }, 3000)
    // Safety stop after 5 min
    setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }, 300_000)
  }

  // ─── Step 2: file selected → validate → confirm → begin ────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      setAuthError('Please upload a PDF file')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setAuthError('File too large (max 10 MB)')
      return
    }
    setFile(f)
    setFileName(f.name)
    setAuthError(null)
    setEvalFailed(null)
    validateUploadedFile(f)
  }

  async function validateUploadedFile(f: File) {
    setUploadSubState('validating')
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch('/api/validate-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => null)

      if (data?.valid) {
        setPageEstimate(data.page_estimate ?? null)
        setUploadSubState('confirmed')
      } else {
        setAuthError(data?.reason ?? 'We couldn\'t read this file. Try a different PDF.')
        setUploadSubState('idle')
        setFile(null)
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
      }
    } catch {
      setAuthError('Something went wrong checking your file. Please try again.')
      setUploadSubState('idle')
      setFile(null)
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleBeginAnalysis() {
    if (!file) return
    fireEval(file, format)
    goTo('account')
  }

  // ─── Step 3: signup ───────────────────────────────────────────────────
  async function handleGoogleSignup() {
    setGoogleLoading(true)
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({
        submissionId,
        name,
        genres: selectedGenres,
        format,
        fileName,
      }),
    )

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/get-started`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setGoogleLoading(false)
      setAuthError(error.message)
      localStorage.removeItem(ONBOARDING_KEY)
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setSigningUp(true)
    setAuthError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) throw error
      if (!data.user) throw new Error('Signup failed')

      const uid = data.user.id
      setUser({ id: uid, email })

      // Save name
      if (name) {
        await supabase.from('profiles').update({ full_name: name }).eq('id', uid)
      }

      // Claim submission
      if (submissionId) {
        await fetch('/api/assign-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: submissionId }),
        }).catch(() => {})
      }

      identifyUser(uid, { email, name })
      trackSignupComplete()
      gtagSignupCompleted()

      // Welcome email (non-blocking)
      fetch('/api/send-welcome', { method: 'POST', keepalive: true }).catch(
        () => {},
      )

      goTo('profile')
    } catch (err: any) {
      setAuthError(err?.message ?? 'Signup failed')
    } finally {
      setSigningUp(false)
    }
  }

  // ─── Step 4: profile ──────────────────────────────────────────────────
  async function handleSaveProfile() {
    if (!user) return
    setProfileSaving(true)
    try {
      if (phone || smsConsent) {
        await supabase.from('profiles').update({ phone: phone || null, sms_consent: smsConsent }).eq('id', user.id)
      }
      if (headline || bio || name) {
        await updateProfile({
          full_name: name || undefined,
          headline: headline || undefined,
          bio: bio || undefined,
        })
      }
    } catch {
      /* non-fatal */
    }
    setProfileSaving(false)
    advanceToResults()
  }

  function advanceToResults() {
    goTo('results')
    if (submissionId) fetchResults(submissionId)
  }

  // ─── Step 5: fetch results ────────────────────────────────────────────
  async function fetchResults(subId: string) {
    setResultsLoading(true)

    // Wait for eval if still running
    if (!evalDone) {
      await new Promise<void>((resolve) => {
        const iv = setInterval(async () => {
          try {
            const r = await fetch(`/api/submission-status?id=${subId}`)
            const d = await r.json()
            if (d.status === 'completed' || d.status === 'failed') {
              setEvalDone(true)
              clearInterval(iv)
              resolve()
            }
          } catch {
            /* retry */
          }
        }, 3000)
        setTimeout(() => {
          clearInterval(iv)
          resolve()
        }, 120_000)
      })
    }

    try {
      const r = await fetch(
        `/api/onboarding-results?submission_id=${subId}`,
      )
      const d = await r.json()
      setResultsData(d)
    } catch {
      /* will show empty state */
    }
    setResultsLoading(false)
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-5 h-14"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <Link
          href="/"
          className="text-white font-bold text-lg tracking-tight"
        >
          GEM
        </Link>
        <div
          className="flex items-center gap-6 text-sm"
          style={{ color: '#A8A29E' }}
        >
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <Link
            href="/discover"
            className="hover:text-white transition-colors"
          >
            Discover
          </Link>
          <Link
            href="/opportunities"
            className="hover:text-white transition-colors"
          >
            Opportunities
          </Link>
        </div>
      </nav>

      {/* ─── Content ─────────────────────────────────────────────────── */}
      <div className="max-w-[560px] mx-auto px-5 pt-9 pb-24">
        <ProgressBar current={step} />

        <div
          className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}
        >
          {step === 'welcome' && WelcomeStep()}
          {step === 'upload' && UploadStep()}
          {step === 'account' && AccountStep()}
          {step === 'profile' && ProfileStep()}
          {step === 'results' && ResultsStep()}
        </div>
      </div>
    </div>
  )

  // ═════════════════════════════════════════════════════════════════════════
  // Step renderers (closures over component state)
  // ═════════════════════════════════════════════════════════════════════════

  /* ── Step 1: Welcome ──────────────────────────────────────────────────── */
  function WelcomeStep() {
    return (
      <div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: '#1a1a1a' }}
        >
          Welcome to GEM
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: '#57534E', lineHeight: '1.6' }}
        >
          GEM connects writers with vetted industry opportunities. We evaluate
          your script, match you with production companies, managers, and
          studios — and when you apply, real people review your work to
          determine whether you&rsquo;re a fit.
        </p>

        {/* Journey 1-2-3 */}
        <div className="relative mb-8 pl-8">
          <div
            className="absolute left-[11px] top-[22px] bottom-[22px] w-[2px]"
            style={{ backgroundColor: '#E7E5E4' }}
          />
          {(
            [
              [
                'Tell us about yourself',
                'Set up your writer profile so industry contacts know who you are',
              ],
              [
                'Upload your script',
                "We'll evaluate it and show you which opportunities it qualifies for",
              ],
              [
                'Apply and connect',
                'Submit to opportunities and get reviewed by real people from our vetted industry network',
              ],
            ] as const
          ).map(([title, desc], i) => (
            <div key={i} className="flex items-start gap-3 mb-5 relative">
              <div
                className="absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ backgroundColor: '#7C3AED' }}
              >
                {i + 1}
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#1a1a1a' }}
                >
                  {title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#78716C' }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Name */}
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: '#1a1a1a' }}
        >
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className={`${inputClass} mb-5`}
          style={inputStyle}
          {...inputFocus}
        />

        {/* Genres */}
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: '#1a1a1a' }}
        >
          What do you write?
        </label>
        <div className="flex flex-wrap gap-2 mb-8">
          {GENRES.map((g) => {
            const on = selectedGenres.includes(g)
            return (
              <button
                key={g}
                onClick={() =>
                  setSelectedGenres((prev) =>
                    on ? prev.filter((x) => x !== g) : [...prev, g],
                  )
                }
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: on ? '#7C3AED' : '#FFFFFF',
                  color: on ? '#FFFFFF' : '#57534E',
                  border: `1px solid ${on ? '#7C3AED' : '#E7E5E4'}`,
                }}
              >
                {g}
              </button>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => goTo('upload')}
          className="w-full py-3 rounded-[10px] text-sm font-semibold text-white transition-all active:scale-[0.985]"
          style={{ backgroundColor: '#7C3AED' }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = '#6D28D9')
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = '#7C3AED')
          }
        >
          Get started
        </button>

        <p
          className="text-center text-xs mt-4"
          style={{ color: '#A8A29E' }}
        >
          🔒 Your work stays private. You decide who sees your scripts —
          nothing is shared without your permission.
        </p>
      </div>
    )
  }

  /* ── Step 2: Upload ───────────────────────────────────────────────────── */
  function UploadStep() {
    return (
      <div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: '#1a1a1a' }}
        >
          Upload your script
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: '#57534E', lineHeight: '1.6' }}
        >
          We&rsquo;ll evaluate your screenplay and match you with opportunities
          that fit. Takes about 60 seconds.
        </p>

        {/* Format toggle */}
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: '#1a1a1a' }}
        >
          Format
        </label>
        <div className="flex gap-2 mb-5">
          {(['Feature film', 'Series'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className="flex-1 py-3 rounded-[10px] text-sm font-medium transition-all"
              style={{
                backgroundColor: format === f ? '#7C3AED' : '#FFFFFF',
                color: format === f ? '#FFFFFF' : '#57534E',
                border: `1px solid ${format === f ? '#7C3AED' : '#E7E5E4'}`,
              }}
            >
              {f === 'Feature film' ? 'Film' : 'Series'}
            </button>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* ── VALIDATING ── */}
        {uploadSubState === 'validating' && (
          <div className="rounded-[14px] p-9 text-center mb-5" style={{ border: '1px solid #E7E5E4', backgroundColor: '#FAFAF9' }}>
            <div className="w-8 h-8 mx-auto rounded-full border-[3px] border-[#E7E5E4] border-t-[#7C3AED] animate-spin mb-3" />
            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>Checking your file...</p>
            <p className="text-xs mt-1" style={{ color: '#78716C' }}>{fileName}</p>
          </div>
        )}

        {/* ── CONFIRMED — ready to go ── */}
        {uploadSubState === 'confirmed' && (
          <div className="rounded-[14px] p-6 text-center mb-5" style={{ border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.04)' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mx-auto mb-3">
              <circle cx="14" cy="14" r="14" fill="rgba(34,197,94,0.15)" />
              <path d="M8 14.5l3.5 3.5 7-7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Your script is ready</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#78716C' }}>
              {fileName}{pageEstimate ? ` · ~${pageEstimate} pages` : ''}
            </p>
            <button
              onClick={handleBeginAnalysis}
              className="w-full py-3 rounded-[10px] text-sm font-semibold text-white transition-all active:scale-[0.985]"
              style={{ backgroundColor: '#7C3AED' }}
            >
              Begin analysis
            </button>
          </div>
        )}

        {/* ── IDLE — drop zone ── */}
        {uploadSubState === 'idle' && (
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-[14px] p-9 text-center transition-all cursor-pointer mb-5"
            style={{
              border: '2px dashed #D6D3D1',
              backgroundColor: 'transparent',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#7C3AED'
              e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.02)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#D6D3D1'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm font-medium" style={{ color: '#57534E' }}>
              Drop your script here or click to browse
            </p>
            <p className="text-xs mt-1" style={{ color: '#A8A29E' }}>
              PDF only · Max 10 MB
            </p>
          </div>
        )}

        {evalFailed && (
          <p className="text-sm text-red-500 mb-4">{evalFailed}</p>
        )}
        {authError && (
          <div className="mb-4">
            <p className="text-sm text-red-500">{authError}</p>
            {uploadSubState === 'idle' && (
              <button
                onClick={() => { setAuthError(null); fileRef.current?.click() }}
                className="text-xs font-semibold mt-1"
                style={{ color: '#7C3AED' }}
              >
                Try a different file
              </button>
            )}
          </div>
        )}

        {/* Privacy commitment */}
        {uploadSubState !== 'confirmed' && (
          <div
            className="rounded-[14px] p-4"
            style={{
              backgroundColor: '#FAFAF9',
              border: '1px solid #F5F5F4',
            }}
          >
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: '#1a1a1a' }}
            >
              🔒 Our privacy commitment
            </p>
            <div
              className="text-xs space-y-1.5"
              style={{ color: '#78716C', lineHeight: '1.5' }}
            >
              <p>
                • Your scripts are private by default — only you can see them
              </p>
              <p>
                • Only work you choose to publish is visible to our industry
                partners
              </p>
              <p>• You can delete your script and data at any time</p>
              <p>
                • If you don&rsquo;t create an account, uploads are
                automatically deleted
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── Step 3: Account ──────────────────────────────────────────────────── */
  function AccountStep() {
    return (
      <div>
        <EvalSpinner done={evalDone} />

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: '#1a1a1a' }}
        >
          Save your results
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: '#57534E', lineHeight: '1.6' }}
        >
          Create a free account to access your full report, apply to
          opportunities, and track your progress. Completely free — no credit
          card required.
        </p>

        {/* Google */}
        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[10px] text-sm font-medium transition-all"
          style={{
            border: '1px solid #E7E5E4',
            color: '#1a1a1a',
            backgroundColor: '#FFFFFF',
          }}
        >
          {googleLoading ? (
            <span style={{ color: '#78716C' }}>Opening Google…</span>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: '#E7E5E4' }}
          />
          <span className="text-xs" style={{ color: '#A8A29E' }}>
            or
          </span>
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: '#E7E5E4' }}
          />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSignup}>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#1a1a1a' }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`${inputClass} mb-4`}
            style={inputStyle}
            {...inputFocus}
          />

          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#1a1a1a' }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            className={`${inputClass} mb-5`}
            style={inputStyle}
            {...inputFocus}
          />

          {authError && (
            <p className="text-sm text-red-500 mb-4">{authError}</p>
          )}

          <button
            type="submit"
            disabled={signingUp || !email || !password}
            className="w-full py-3 rounded-[10px] text-sm font-semibold text-white transition-all active:scale-[0.985] disabled:opacity-50"
            style={{ backgroundColor: '#7C3AED' }}
          >
            {signingUp ? 'Creating account…' : 'Create free account'}
          </button>
        </form>
      </div>
    )
  }

  /* ── Step 4: Profile ──────────────────────────────────────────────────── */
  function ProfileStep() {
    return (
      <div>
        <EvalSpinner done={evalDone} />

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: '#1a1a1a' }}
        >
          Stand out to our network
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: '#57534E', lineHeight: '1.6' }}
        >
          Complete your profile so industry partners know who you are and can
          reach you directly.
        </p>

        {/* Preview card */}
        <div
          className="rounded-[14px] p-4 mb-6 flex items-center gap-3"
          style={{
            backgroundColor: '#FAFAF9',
            border: '1px solid #F5F5F4',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ backgroundColor: name ? '#7C3AED' : '#D6D3D1' }}
          >
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: '#1a1a1a' }}
            >
              {name || 'Your name'}
            </p>
            <p className="text-xs" style={{ color: '#78716C' }}>
              {headline || 'Screenwriter'}
            </p>
          </div>
        </div>

        {/* Phone */}
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: '#1a1a1a' }}
        >
          Phone
        </label>
        <p className="text-xs mb-1.5" style={{ color: '#A8A29E' }}>
          So our team can reach you if your work stands out
        </p>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 555-5555"
          className={`${inputClass} mb-4`}
          style={inputStyle}
          {...inputFocus}
        />

        <SmsConsent checked={smsConsent} onChange={setSmsConsent} />

        {/* Bio */}
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: '#1a1a1a' }}
        >
          Short bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about your writing background, credits, and what drives your work…"
          rows={3}
          className={`${inputClass} mb-4 resize-none`}
          style={inputStyle}
          {...inputFocus}
        />

        {/* Headline */}
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: '#1a1a1a' }}
        >
          Headline
        </label>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Character-driven drama writer"
          className={`${inputClass} mb-6`}
          style={inputStyle}
          {...inputFocus}
        />

        <button
          onClick={handleSaveProfile}
          disabled={profileSaving}
          className="w-full py-3 rounded-[10px] text-sm font-semibold text-white transition-all active:scale-[0.985] disabled:opacity-50"
          style={{ backgroundColor: '#7C3AED' }}
        >
          {profileSaving ? 'Saving…' : 'Save profile'}
        </button>

        <button
          onClick={advanceToResults}
          className="w-full py-2 mt-2 text-sm transition-colors"
          style={{ color: '#A8A29E' }}
        >
          Skip for now
        </button>
      </div>
    )
  }

  /* ── Step 5: Results ──────────────────────────────────────────────────── */
  function ResultsStep() {
    if (resultsLoading || !resultsData) {
      return (
        <div className="text-center py-16">
          <div className="w-11 h-11 mx-auto rounded-full border-[3px] border-[#E7E5E4] border-t-[#7C3AED] animate-spin mb-4" />
          <p className="text-sm" style={{ color: '#78716C' }}>
            Loading your results…
          </p>
        </div>
      )
    }

    const { script, evaluation, opportunities, total_matches } = resultsData
    const score = evaluation?.score ?? 0
    const evalId = evaluation?.id

    return (
      <div>
        {/* Congrats banner */}
        <div
          className="rounded-[14px] p-5 mb-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(5,150,105,0.06))',
            border: '1px solid rgba(124,58,237,0.15)',
          }}
        >
          <p className="text-lg mb-1">🎬</p>
          <h2
            className="text-xl font-extrabold mb-1"
            style={{ color: '#1a1a1a' }}
          >
            Congratulations!
          </h2>
          <p className="text-sm" style={{ color: '#57534E' }}>
            Your evaluation is complete. Our partners are actively looking for
            scripts like yours.
          </p>
        </div>

        {/* Script card */}
        <div
          className="rounded-[14px] p-4 mb-6"
          style={{
            backgroundColor: '#FAFAF9',
            border: '1px solid #F5F5F4',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className="text-[15px] font-bold truncate"
                style={{ color: '#1a1a1a' }}
              >
                {script.title}
              </h3>
              {evaluation?.logline && (
                <p
                  className="text-xs italic mt-1 line-clamp-2"
                  style={{ color: '#78716C' }}
                >
                  {evaluation.logline}
                </p>
              )}
              <div
                className="flex items-center gap-2 mt-2 text-xs"
                style={{ color: '#A8A29E' }}
              >
                <span>
                  {script.format === 'Feature film' ? 'Film' : 'Series'}
                </span>
                {evaluation?.genres?.[0] && (
                  <>
                    <span>·</span>
                    <span>{evaluation.genres[0]}</span>
                  </>
                )}
                <span>·</span>
                <span>🔥 {script.heat} heat</span>
              </div>
            </div>
            {/* Score badge */}
            <div
              className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0"
              style={{ backgroundColor: '#059669' }}
            >
              <span className="text-white text-base font-bold leading-none">
                {score}
              </span>
              <span className="text-white text-[8px] opacity-80">/100</span>
            </div>
          </div>

          {evalId && (
            <div className="mt-3 text-right">
              <Link
                href={`/report/${evalId}`}
                className="text-xs font-medium"
                style={{ color: '#7C3AED' }}
              >
                View full evaluation →
              </Link>
            </div>
          )}
        </div>

        {/* Matched opportunities */}
        {opportunities.length > 0 && (
          <div className="mb-6">
            <h3
              className="text-base font-bold mb-1"
              style={{ color: '#1a1a1a' }}
            >
              Your best matches
            </h3>
            <p className="text-xs mb-4" style={{ color: '#78716C' }}>
              These opportunities are from our vetted industry network. When
              you apply, real people review your work to determine whether
              you&rsquo;re a fit.
            </p>

            <div className="space-y-3">
              {opportunities.slice(0, 2).map((opp) => {
                const days = Math.floor(
                  (Date.now() - new Date(opp.created_at).getTime()) /
                    86_400_000,
                )
                const timeLabel =
                  days === 0
                    ? 'Today'
                    : days === 1
                      ? '1 day ago'
                      : `${days} days ago`

                return (
                  <div
                    key={opp.id}
                    className="rounded-[14px] p-4"
                    style={{ border: '1px solid #E7E5E4' }}
                  >
                    <h4
                      className="text-sm font-bold mb-1"
                      style={{ color: '#1a1a1a' }}
                    >
                      {opp.title}
                    </h4>
                    <p
                      className="text-xs mb-3 line-clamp-2"
                      style={{ color: '#78716C' }}
                    >
                      {opp.description}
                    </p>
                    <div
                      className="flex items-center gap-2 text-xs mb-3"
                      style={{ color: '#A8A29E' }}
                    >
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: 'rgba(5,150,105,0.1)',
                          color: '#059669',
                        }}
                      >
                        Paid
                      </span>
                      <span>{timeLabel}</span>
                      <span>·</span>
                      <span>{opp.applicant_count} writers applied</span>
                    </div>
                    <Link
                      href={`/opportunities/${opp.slug}`}
                      className="block w-full py-2.5 rounded-[10px] text-sm font-semibold text-center text-white transition-all active:scale-[0.985]"
                      style={{ backgroundColor: '#7C3AED' }}
                    >
                      Apply
                    </Link>
                  </div>
                )
              })}
            </div>

            {total_matches > 2 && (
              <p className="text-sm mt-3" style={{ color: '#57534E' }}>
                You have {total_matches - 2} more matching opportunities.{' '}
                <Link
                  href="/opportunities"
                  className="font-medium"
                  style={{ color: '#7C3AED' }}
                >
                  Browse all →
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Bottom CTAs */}
        <div className="flex gap-3">
          <a
            href="/opportunities"
            className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-center transition-all"
            style={{ border: '1px solid #E7E5E4', color: '#1a1a1a' }}
          >
            View all opportunities
          </a>
          <a
            href="/dashboard"
            className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-center transition-all"
            style={{ border: '1px solid #E7E5E4', color: '#1a1a1a' }}
          >
            Go to my dashboard
          </a>
        </div>
      </div>
    )
  }
}
