'use client'

// StartPageClient — the new onboarding/submission page.
// For unauthenticated users: inline signup (Google + email/password + phone).
// For authenticated users: profile preview, script list, submit for review.
// Styled with the dark landing-page theme (var(--gem-*)).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Upload, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import { GoogleMark } from '@/components/auth/google-mark'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { useNewUploads } from '@/hooks/use-new-uploads'
import { setPendingFile } from '@/lib/pending-file'

type ScriptItem = {
  id: string
  title: string
  format: string | null
  createdAt: string
  score?: number | null
  evaluationId?: string | null
  genre?: string | null
  isProcessing?: boolean
}

interface Props {
  user: { id: string; email: string } | null
  profile: {
    fullName: string | null
    handle: string | null
    bio: string | null
    avatarUrl: string | null
    headline: string | null
    phone: string | null
  } | null
  scripts: ScriptItem[]
  hasActiveDraft: string | null
}

export function StartPageClient({ user, profile, scripts, hasActiveDraft }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isLoggedIn = !!user

  // Auth form state
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [fullName, setFullName] = useState('')
  const [handle, setHandle] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Phone collection for Google OAuth users who are missing it
  const [phonePrompt, setPhonePrompt] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const needsPhone = isLoggedIn && !profile?.phone

  // Script selection for draft
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(scripts.filter(s => !s.isProcessing).map(s => s.id))
  )
  const [submitting, setSubmitting] = useState(false)

  // Optimistic processing cards from new uploads
  const optimistic = useNewUploads(scripts.map(s => s.id))
  const hasProcessing = optimistic.length > 0 || scripts.some(s => s.isProcessing)

  // Upload handling
  const [uploadError, setUploadError] = useState<string | null>(null)

  function toggleScript(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/start')}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }
      if (data.user?.id) {
        identifyUser(data.user.id, { email })
      }
      router.refresh()
      return
    }

    // Signup
    trackSignupStart()
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/start')}`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user?.id) {
      identifyUser(data.user.id, { email, full_name: fullName })

      // Save handle + phone
      const updates: Record<string, string> = {}
      if (handle.trim()) updates.handle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      if (phone.trim()) updates.phone = phone.trim()
      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', data.user.id)
      }
    }

    trackSignupComplete()
    gtagSignupCompleted()

    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user?.id, email }),
      keepalive: true,
    }).catch(() => {})

    router.refresh()
  }

  async function handleSavePhone() {
    if (!phonePrompt.trim() || !user) return
    setSavingPhone(true)
    await supabase.from('profiles').update({ phone: phonePrompt.trim() }).eq('id', user.id)
    setSavingPhone(false)
    router.refresh()
  }

  function openUploadModal() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  async function handleSubmitForReview() {
    if (submitting) return
    const selected = [...selectedIds]
    if (selected.length === 0) return
    setSubmitting(true)
    try {
      // Create draft if needed, then submit
      const draftRes = await fetch('/api/consideration/create-draft', { method: 'POST' })
      const { consideration_id } = await draftRes.json()
      if (!consideration_id) return

      const submitRes = await fetch('/api/consideration/submit-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consideration_id,
          selected_script_ids: selected,
        }),
      })
      if (submitRes.ok) {
        router.push(`/review/c/${consideration_id}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const eligibleScripts = scripts.filter(s => !s.isProcessing)
  const selectedCount = eligibleScripts.filter(s => selectedIds.has(s.id)).length
  const canSubmit = isLoggedIn && !needsPhone && selectedCount > 0

  return (
    <div className="max-w-lg mx-auto px-4 py-10 sm:py-16">
      <ProcessingPoller active={hasProcessing} />

      {/* Page title */}
      <div className="text-center mb-8">
        <h1
          className="text-[28px] sm:text-[34px] font-semibold text-[var(--gem-gray-50)] leading-tight mb-3"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Submit for review
        </h1>
        <p className="text-[15px] text-[var(--gem-gray-400)] leading-relaxed max-w-sm mx-auto">
          Create your profile, attach your scripts, and our team will review your portfolio.
        </p>
      </div>

      <div className="space-y-5">
        {/* ── SECTION 1: PROFILE / AUTH ──────────────────── */}
        <div className="rounded-2xl border border-[var(--gem-gray-700)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
              style={{
                background: isLoggedIn ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)',
                color: isLoggedIn ? '#10b981' : 'var(--gem-accent)',
              }}
            >
              {isLoggedIn ? '✓' : '1'}
            </div>
            <p className="text-[14px] font-bold text-[var(--gem-gray-100)] m-0">
              {isLoggedIn ? 'Your profile' : 'Create your account'}
            </p>
          </div>

          {/* Logged in — show profile preview */}
          {isLoggedIn && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-[var(--gem-gray-800)] shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--gem-gray-800)] border border-dashed border-[var(--gem-gray-600)] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gem-gray-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-[var(--gem-gray-100)] m-0 truncate">
                    {profile?.fullName || 'Your name'}
                  </p>
                  {profile?.handle && (
                    <p className="text-[12px] text-[var(--gem-gray-500)] m-0">@{profile.handle}</p>
                  )}
                </div>
                <Link href="/profile" className="text-[12px] font-medium text-[var(--gem-accent)] hover:underline shrink-0">
                  Edit
                </Link>
              </div>

              {/* Phone prompt for Google OAuth users missing phone */}
              {needsPhone && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)]">
                  <p className="text-[12px] text-[var(--gem-gray-300)] m-0 mb-2">
                    Add your phone number so our team can reach you if your work stands out.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phonePrompt}
                      onChange={e => setPhonePrompt(e.target.value)}
                      placeholder="(555) 555-5555"
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-900)] border border-[var(--gem-gray-600)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={!phonePrompt.trim() || savingPhone}
                      className="px-3 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-[13px] font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors shrink-0"
                    >
                      {savingPhone ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Not logged in — inline signup/login form */}
          {!isLoggedIn && (
            <div>
              <p className="text-[12px] text-[var(--gem-gray-400)] mb-4">
                So our reviewers know who you are and can get in touch.
              </p>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mb-3 rounded-lg border border-[var(--gem-gray-600)] bg-[var(--gem-black)] text-sm font-semibold text-[var(--gem-gray-50)] transition-all duration-150 hover:bg-[var(--gem-gray-900)] active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
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

              <div className="flex items-center gap-3 my-3 text-[12px] text-[var(--gem-gray-500)]">
                <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
                or
                <div className="flex-1 h-px bg-[var(--gem-gray-700)]" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--gem-gray-300)] mb-1">Full name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                        placeholder="Your name"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--gem-gray-300)] mb-1">Handle</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gem-gray-500)] text-sm pointer-events-none">@</span>
                        <input
                          type="text"
                          value={handle}
                          onChange={e => setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                          required
                          placeholder="yourhandle"
                          maxLength={30}
                          className="w-full pl-7 pr-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--gem-gray-300)] mb-1">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        placeholder="(555) 555-5555"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
                      />
                      <p className="text-[10px] text-[var(--gem-gray-500)] mt-0.5">So our team can reach you if your work stands out</p>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--gem-gray-300)] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--gem-gray-300)] mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-white)] placeholder:text-[var(--gem-gray-500)] focus:border-[var(--gem-accent)] focus:outline-none"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-all duration-150 active:scale-[0.985]"
                >
                  {loading ? (mode === 'signup' ? 'Creating account…' : 'Logging in…') : (mode === 'signup' ? 'Create account' : 'Log in')}
                </button>
              </form>

              <p className="text-center text-[12px] text-[var(--gem-gray-500)] mt-3">
                {mode === 'signup' ? (
                  <>Already have an account?{' '}<button type="button" onClick={() => setMode('login')} className="text-[var(--gem-accent)] hover:underline bg-transparent border-0 cursor-pointer p-0 font-medium">Log in</button></>
                ) : (
                  <>Need an account?{' '}<button type="button" onClick={() => setMode('signup')} className="text-[var(--gem-accent)] hover:underline bg-transparent border-0 cursor-pointer p-0 font-medium">Sign up</button></>
                )}
              </p>
            </div>
          )}
        </div>

        {/* ── SECTION 2: SCRIPTS ────────────────────────── */}
        <div className="rounded-2xl border border-[var(--gem-gray-700)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
              style={{
                background: eligibleScripts.length > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)',
                color: eligibleScripts.length > 0 ? '#10b981' : 'var(--gem-accent)',
              }}
            >
              {eligibleScripts.length > 0 ? '✓' : '2'}
            </div>
            <p className="text-[14px] font-bold text-[var(--gem-gray-100)] m-0">
              Your scripts
            </p>
          </div>

          {/* Optimistic processing cards */}
          {optimistic.length > 0 && (
            <div className="space-y-2 mb-3">
              {optimistic.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)]">
                  <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-700)] flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-[var(--gem-gray-500)] border-t-[var(--gem-accent)] rounded-full animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--gem-gray-200)] m-0 truncate">{s.title}</p>
                    <p className="text-[11px] text-[var(--gem-gray-500)] m-0">Processing…</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Server-known processing scripts */}
          {scripts.filter(s => s.isProcessing).map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] mb-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-700)] flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-[var(--gem-gray-500)] border-t-[var(--gem-accent)] rounded-full animate-spin" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--gem-gray-200)] m-0 truncate">{s.title}</p>
                <p className="text-[11px] text-[var(--gem-gray-500)] m-0">Processing…</p>
              </div>
            </div>
          ))}

          {/* Eligible scripts with checkboxes */}
          {eligibleScripts.length > 0 ? (
            <div className="space-y-2 mb-3">
              {eligibleScripts.map(s => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    selectedIds.has(s.id)
                      ? 'bg-[rgba(124,58,237,0.06)] border-[rgba(124,58,237,0.3)]'
                      : 'bg-[var(--gem-gray-800)] border-[var(--gem-gray-700)] opacity-60'
                  }`}
                  onClick={() => toggleScript(s.id)}
                >
                  {/* Checkbox */}
                  <div
                    className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                    style={{
                      borderColor: selectedIds.has(s.id) ? '#7c3aed' : 'var(--gem-gray-600)',
                      background: selectedIds.has(s.id) ? '#7c3aed' : 'transparent',
                    }}
                  >
                    {selectedIds.has(s.id) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Score badge */}
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: s.score != null && s.score >= 75
                        ? 'rgba(124,58,237,0.12)'
                        : 'var(--gem-gray-700)',
                    }}
                  >
                    {s.score != null ? (
                      <span className="text-[13px] font-bold" style={{ color: s.score >= 75 ? '#a78bfa' : 'var(--gem-gray-400)' }}>
                        {Math.round(s.score)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--gem-gray-500)]">&mdash;</span>
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--gem-gray-200)] m-0 truncate">{s.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {s.format && <span className="text-[11px] text-[var(--gem-gray-500)]">{s.format}</span>}
                      {s.format && s.genre && <span className="text-[var(--gem-gray-600)]">&middot;</span>}
                      {s.genre && <span className="text-[11px] text-[var(--gem-gray-500)]">{s.genre}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : optimistic.length === 0 && scripts.filter(s => s.isProcessing).length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[13px] text-[var(--gem-gray-400)] m-0 mb-3">
                {isLoggedIn
                  ? 'Upload your scripts to include them in your review.'
                  : 'After creating your account, upload your scripts here.'
                }
              </p>
            </div>
          ) : null}

          {/* Upload button */}
          {isLoggedIn && (
            <button
              onClick={openUploadModal}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[var(--gem-gray-600)] text-[13px] font-semibold text-[var(--gem-gray-300)] hover:border-[var(--gem-accent)] hover:text-[var(--gem-accent)] transition-colors"
            >
              <Upload size={14} />
              Upload a script
            </button>
          )}
        </div>

        {/* ── SUBMIT BUTTON ─────────────────────────────── */}
        <button
          onClick={handleSubmitForReview}
          disabled={!canSubmit || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canSubmit ? 'var(--gem-accent)' : 'var(--gem-gray-700)',
            boxShadow: canSubmit ? '0 6px 20px rgba(124,58,237,0.30)' : 'none',
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit {selectedCount} {selectedCount === 1 ? 'script' : 'scripts'} for review
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Helper text */}
        {!isLoggedIn && (
          <p className="text-center text-[12px] text-[var(--gem-gray-500)]">
            Create your account first, then upload your scripts and submit.
          </p>
        )}
        {isLoggedIn && needsPhone && (
          <p className="text-center text-[12px] text-[var(--gem-gray-500)]">
            Add your phone number above to submit.
          </p>
        )}
        {isLoggedIn && !needsPhone && selectedCount === 0 && eligibleScripts.length === 0 && (
          <p className="text-center text-[12px] text-[var(--gem-gray-500)]">
            Upload at least one script to submit for review.
          </p>
        )}
      </div>
    </div>
  )
}
