'use client'

// StartPageClient — onboarding page that mirrors the real portfolio review layout.
// Unauthenticated: empty-state review page with "Create your account" prompt.
// Authenticated: real draft review page with scripts + submit.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import { GoogleMark } from '@/components/auth/google-mark'
import { ScriptRowCard, type ScriptRowData } from '@/components/cards/script-row-card'
import SmsConsent from '@/components/sms-consent'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { useNewUploads } from '@/hooks/use-new-uploads'

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

interface StartPageClientProps {
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

export function StartPageClient({ user, profile, scripts, hasActiveDraft }: StartPageClientProps) {
  // If user is authenticated and has an active draft, redirect to it
  if (user && hasActiveDraft) {
    return <AuthenticatedDraft
      user={user}
      profile={profile}
      scripts={scripts}
      draftId={hasActiveDraft}
    />
  }

  if (user) {
    return <AuthenticatedNoDraft
      user={user}
      profile={profile}
      scripts={scripts}
    />
  }

  return <UnauthenticatedView />
}

// ─── Unauthenticated: show the review page in empty state ──────────

function UnauthenticatedView() {
  const [showSignup, setShowSignup] = useState(false)

  // Track anonymous uploads so processing cards appear instantly
  const optimistic = useNewUploads([])
  const hasUploads = optimistic.length > 0

  function openUploadModal() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <ProcessingPoller active={hasUploads} />

      {/* Page title */}
      <div className="mb-4">
        <h1
          className="text-[22px] font-bold text-gray-900 m-0"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Portfolio review
        </h1>
      </div>

      {/* Profile card — empty with create account prompt */}
      <div className="rounded-xl bg-white border border-gray-200 px-5 py-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-gray-500 m-0">Your profile</p>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-gray-100 border-[1.5px] border-dashed border-gray-300 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-gray-400 m-0">Your name</p>
            <p className="text-[12px] text-gray-300 m-0 mt-0.5 italic">Add your bio</p>
          </div>
        </div>
        <button
          onClick={() => setShowSignup(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors border-0 cursor-pointer"
        >
          Create your account
        </button>
        <p className="text-[11px] text-gray-400 m-0 mt-2 text-center">
          So our reviewers know who you are
        </p>
      </div>

      {/* Status block — dimmed draft state */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-4 opacity-50">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              Draft
            </span>
          </div>
          <div className="flex items-center gap-0.5 mb-4">
            {['Draft', 'Pending', 'Initial review', 'Advanced review', 'Partner match'].map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full h-[3px] rounded-full"
                  style={{ background: i === 0 ? '#6b7280' : '#e5e7eb' }}
                />
                <span
                  className="text-[10px] leading-none"
                  style={{
                    color: i === 0 ? '#6b7280' : '#d1d5db',
                    fontWeight: i === 0 ? 700 : 500,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-gray-500 m-0 leading-snug">
            Your portfolio review is in draft. Add your best scripts and submit when ready.
          </p>
        </div>
      </div>

      {/* Scripts section */}
      <section className="mb-4">
        <header className="flex items-center justify-between mb-2.5">
          <h2 className="text-[15px] font-bold text-gray-900 m-0">Scripts in this review</h2>
          <button
            onClick={openUploadModal}
            className="flex items-center gap-1 text-[12px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-0 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Upload script
          </button>
        </header>

        {/* Optimistic processing cards from anonymous uploads */}
        {optimistic.length > 0 && (
          <div className="space-y-2 mb-2">
            {optimistic.map(s => (
              <ScriptRowCard key={s.id} script={s} />
            ))}
          </div>
        )}

        {optimistic.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-[14px] font-semibold text-gray-600 m-0 mb-1">No scripts yet</p>
            <p className="text-[13px] text-gray-400 m-0 mb-3">Upload your screenplay to include it in your portfolio review.</p>
            <button
              onClick={openUploadModal}
              className="text-[13px] font-bold text-white px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 border-0 cursor-pointer transition-colors"
            >
              Upload a script
            </button>
          </div>
        )}
      </section>

      {/* Disabled submit */}
      <div className="flex items-center gap-3 mt-3">
        <button
          disabled
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-[13px] font-bold opacity-50 cursor-not-allowed"
        >
          Submit for review
        </button>
      </div>
      <p className="text-[11px] text-gray-400 m-0 mt-2 text-center">
        Create your account and add scripts to submit your portfolio for review.
      </p>

      {/* Signup modal */}
      {showSignup && (
        <SignupModal onClose={() => setShowSignup(false)} />
      )}
    </main>
  )
}

// ─── Authenticated with no draft — create one and redirect ──────────

function AuthenticatedNoDraft({
  user,
  profile,
  scripts,
}: {
  user: { id: string; email: string }
  profile: StartPageClientProps['profile']
  scripts: ScriptItem[]
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function handleCreateDraft() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/consideration/create-draft', { method: 'POST' })
      const data = await res.json()
      if (data.id) {
        router.push(`/review/c/${data.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1
          className="text-[22px] font-bold text-gray-900 m-0"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Portfolio review
        </h1>
      </div>

      {/* Profile card */}
      <div className="rounded-xl bg-white border border-gray-200 px-5 py-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-gray-500 m-0">Your profile</p>
          <Link href="/profile" className="text-[12px] font-medium text-purple-600 hover:text-purple-800">
            Edit profile
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100 shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gray-100 border-[1.5px] border-dashed border-gray-300 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-gray-900 m-0 truncate">
              {profile?.fullName || 'Your name'}
            </p>
          </div>
        </div>
      </div>

      {/* CTA to start a draft */}
      <div className="rounded-xl bg-white border border-gray-200 px-5 py-8 text-center">
        <p className="text-[14px] font-semibold text-gray-600 m-0 mb-1">Ready to get reviewed?</p>
        <p className="text-[13px] text-gray-400 m-0 mb-4">
          Start a portfolio review to get your work in front of our team.
        </p>
        <button
          onClick={handleCreateDraft}
          disabled={creating}
          className="text-[13px] font-bold text-white px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 border-0 cursor-pointer transition-colors disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Start portfolio review'}
        </button>
      </div>
    </main>
  )
}

// ─── Authenticated with draft — redirect to it ──────────

function AuthenticatedDraft({
  user,
  profile,
  scripts,
  draftId,
}: {
  user: { id: string; email: string }
  profile: StartPageClientProps['profile']
  scripts: ScriptItem[]
  draftId: string
}) {
  const router = useRouter()

  // Auto-redirect to the draft review page
  if (typeof window !== 'undefined') {
    router.replace(`/review/c/${draftId}`)
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-purple-600" />
      </div>
    </main>
  )
}

// ─── Signup Modal ──────────────────────────────────────────

function SignupModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
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

      // Save phone + SMS consent to profile
      if (phone.trim() || smsConsent) {
        await supabase
          .from('profiles')
          .update({ phone: phone.trim() || null, sms_consent: smsConsent })
          .eq('id', data.user.id)
      }
    }

    trackSignupComplete()
    gtagSignupCompleted()

    // Fire welcome email
    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user?.id, email }),
      keepalive: true,
    }).catch(() => {})

    // Refresh — server component will pick up auth and show the right state
    router.push('/start')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors border-0 cursor-pointer bg-transparent"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-1">Create your account</h2>
        <p className="text-xs text-gray-400 mb-5">
          Free forever. No credit card required.
        </p>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mb-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

        <div className="flex items-center gap-3 my-3.5 text-[12px] text-gray-400">
          <div className="flex-1 h-px bg-gray-200" />
          or
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[14px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              placeholder="(555) 555-5555"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[14px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">So our team can reach you if your work stands out</p>
            <div className="mt-2">
              <SmsConsent checked={smsConsent} onChange={setSmsConsent} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[14px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[14px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 transition-all active:scale-[0.985] border-0 cursor-pointer"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <a href="/login?redirect=/start" className="text-purple-600 hover:underline font-medium">
            Log in
          </a>
        </p>
      </div>
    </div>
  )
}
