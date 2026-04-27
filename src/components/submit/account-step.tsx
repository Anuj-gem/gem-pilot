// Step 3 of the guided submit flow.
//
// Two variants:
//   - mode='upload' — PDF is in flight; copy promises a 60-second report.
//   - mode='draft'  — no PDF; copy frames this as saving a spot they'll come
//                     back to. Same form fields either way.
//
// Google OAuth handoff: the parent stashes the pending submission_id (and the
// draft/upload mode) in localStorage *before* triggering signInWithOAuth, so
// /auth/callback → /submit can pick it back up and finish assignment.
'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, Check, FileClock } from 'lucide-react'

export type AccountMode = 'upload' | 'draft'

export function AccountStep({
  mode,
  onGoogle,
  onEmailSignup,
  signingUp,
  googleLoading,
  error,
}: {
  mode: AccountMode
  onGoogle: () => void
  onEmailSignup: (data: { full_name: string; email: string; password: string }) => void
  signingUp: boolean
  googleLoading: boolean
  error?: string | null
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const heading = mode === 'upload' ? 'Where should we send it?' : 'Save your spot.'
  const subhead =
    mode === 'upload'
      ? "Your report is ready in 60 seconds. We'll email you when it lands."
      : 'Hold this draft on your dashboard. Upload your PDF anytime to unlock your full GEM read.'
  const submitLabel = mode === 'upload' ? 'Get my GEM read →' : 'Save my draft →'
  const trustLine =
    mode === 'upload'
      ? 'Free. Your script stays private to you.'
      : "We'll email a friendly reminder when you're ready to upload."

  return (
    <div className="max-w-[440px] mx-auto pb-12">
      <h2 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)] m-0 mb-2">
        {heading}
      </h2>
      <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.5] m-0 mb-5">
        {subhead}
      </p>

      {/* Status block. Upload mode = animated progress bar (eval is running
          server-side, take 60s); draft mode = static gold pill. The progress
          bar is the user's reassurance that something is happening — the
          spinner inside the signup button alone read as "hung". */}
      {mode === 'upload' ? (
        <EvalProgress />
      ) : (
        <div
          className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 mb-5 text-[13px]"
          style={{
            background: 'rgba(212,160,23,0.07)',
            border: '1px solid rgba(212,160,23,0.30)',
            color: '#92710f',
          }}
        >
          <FileClock size={15} />
          <span>Draft saved — no PDF yet</span>
        </div>
      )}

      <button
        type="button"
        onClick={onGoogle}
        disabled={signingUp || googleLoading}
        className="w-full rounded-xl px-4 py-3 mb-3 flex items-center justify-center gap-2.5 text-[14px] font-semibold transition-all duration-150 hover:bg-[var(--gem-gray-900)] active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: 'var(--gem-black)',
          border: '1px solid var(--gem-gray-600)',
          color: 'var(--gem-gray-50)',
        }}
      >
        {googleLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Opening Google…
          </>
        ) : (
          <>
            <GoogleMark />
            Continue with Google
          </>
        )}
      </button>

      <div className="text-center text-[12px] text-[var(--gem-gray-500)] my-3.5">
        — or —
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onEmailSignup({ full_name: fullName, email, password })
        }}
        className="space-y-2.5"
      >
        <input
          type="text"
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          className="w-full rounded-xl px-4 py-3 text-[14px] text-[var(--gem-gray-50)]"
          style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-xl px-4 py-3 text-[14px] text-[var(--gem-gray-50)]"
          style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}
        />
        <input
          type="password"
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-xl px-4 py-3 text-[14px] text-[var(--gem-gray-50)]"
          style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}
        />
        {error && (
          <div
            className="rounded-lg px-3 py-2 flex items-start gap-2 text-[13px]"
            style={{
              background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.25)',
              color: '#b91c1c',
            }}
          >
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={signingUp || googleLoading}
          className="w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'var(--gem-accent)' }}
        >
          {signingUp ? <Loader2 size={16} className="animate-spin" /> : null}
          {signingUp ? 'Creating your account…' : submitLabel}
        </button>
      </form>

      <p className="text-center text-[12px] text-[var(--gem-gray-500)] mt-3.5 m-0">
        {trustLine}
      </p>
    </div>
  )
}

// Eval-in-flight progress bar. We can't actually observe scoring progress
// from the client (the eval runs server-side), so this is a paced 60-second
// animation — the realistic upper bound for a v5.3 eval. Two phases:
//   - 0..58s: bar fills 0% → 95% via CSS animation
//   - 58s+:   flips to "ready" state — fully filled bar, checkmark, "Your
//             report is ready" copy. We leave it there until the user
//             finishes signup (the parent doesn't auto-advance).
// The reassurance value is in *seeing motion*, not in measuring real
// progress. Worst case (eval is slower) the bar sits at 100% a few extra
// seconds before they finish typing their email. That's fine.
function EvalProgress() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 58000)
    return () => clearTimeout(t)
  }, [])

  const trackBg = 'rgba(5,150,105,0.10)'
  const fillBg = '#059669'
  const labelColor = '#057647'

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: labelColor }}>
          {ready ? (
            <>
              <Check size={15} strokeWidth={3} />
              <span>Your report is ready — create your account to view it.</span>
            </>
          ) : (
            <span>Scoring your script…</span>
          )}
        </div>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden relative"
        style={{ background: trackBg }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: fillBg,
            width: ready ? '100%' : undefined,
            animation: ready ? undefined : 'gemEvalFill 58s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
            transition: ready ? 'width 600ms ease-out' : undefined,
          }}
        />
      </div>
      <style jsx>{`
        @keyframes gemEvalFill {
          0% {
            width: 0%;
          }
          100% {
            width: 95%;
          }
        }
      `}</style>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.708A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.708V4.96H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96l3.007 2.332C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
