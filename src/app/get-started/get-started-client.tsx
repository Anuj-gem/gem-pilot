// /get-started — unified signup flow.
//
// Two steps:
//   1. Create account (Google OAuth or email/password + name + phone + SMS consent)
//   2. Profile setup (photo, headline, bio)
//
// After step 2 (save or skip) → /dashboard.
//
// Anuj 2026-05-28: replaces the old 5-step onboarding flow. Anonymous upload
// flow is dead. Every path goes through account creation first.

'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { createBrowserClient } from '@supabase/ssr'
import { LandingNav } from '@/components/landing/landing-nav'
import {
  identifyUser,
  trackSignupStart,
  trackSignupComplete,
} from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import { GoogleMark } from '@/components/auth/google-mark'
import SmsConsent from '@/components/sms-consent'

function CollapsibleSmsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: '#E7E5E4' }}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[#7c3aed]"
          />
          <span className="text-[12px] font-medium" style={{ color: '#57534E' }}>
            I&apos;d like to receive updates by text
          </span>
        </label>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[11px] bg-transparent border-0 cursor-pointer p-0 underline"
          style={{ color: '#A8A29E' }}
        >
          {open ? 'Hide terms' : 'View terms'}
        </button>
      </div>
      {open && (
        <p className="text-[11px] leading-[1.5] mt-1.5 ml-[22px]" style={{ color: '#A8A29E' }}>
          We&apos;ll send updates on your script evaluations and industry opportunities.
          Message & data rates may apply. Frequency varies. Text HELP for help or STOP to opt out.{' '}
          <a href="/privacy" className="underline" style={{ color: '#A8A29E' }}>Privacy Policy</a>
        </p>
      )}
    </div>
  )
}
import { updateProfile } from '@/app/profile/actions'

type Step = 'signup' | 'profile'

export default function GetStartedClient() {
  const router = useRouter()
  const supabase = createClient()
  const supabaseStorage = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [step, setStep] = useState<Step>('signup')
  const [fading, setFading] = useState(false)

  // Step 1 — signup
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Step 2 — profile
  const [userId, setUserId] = useState<string | null>(null)
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()

  // ── Mount: if already logged in, skip to profile or dashboard ─────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        setFullName(
          (user.user_metadata as { full_name?: string } | null)?.full_name ?? '',
        )
        // Check if they already have a profile set up
        supabase
          .from('profiles')
          .select('headline, bio, avatar_url')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.headline || profile?.bio) {
              // Profile already done — go to dashboard
              router.replace('/dashboard')
            } else {
              // Signed up but no profile yet — go to step 2
              if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
              goTo('profile')
            }
          })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Dark body background ─────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#2b1a55'
    return () => {
      document.body.style.background = prev
    }
  }, [])

  // ── Step transitions ─────────────────────────────────────────────────
  function goTo(next: Step) {
    setFading(true)
    setTimeout(() => {
      setStep(next)
      setFading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 120)
  }

  // ── Step 1: Google OAuth ─────────────────────────────────────────────
  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/get-started')}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  // ── Step 1: Email signup ─────────────────────────────────────────────
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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/get-started')}`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user?.id) {
      identifyUser(data.user.id, { email, full_name: fullName })

      // Save phone + SMS consent
      if (phone.trim() || smsConsent) {
        await supabase
          .from('profiles')
          .update({ phone: phone.trim() || null, sms_consent: smsConsent })
          .eq('id', data.user.id)
      }

      trackSignupComplete()
      gtagSignupCompleted()

      // Welcome email (non-blocking)
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, email }),
        keepalive: true,
      }).catch(() => {})

      // If Supabase returned a session, the user is confirmed — proceed
      if (data.session) {
        setUserId(data.user.id)
        goTo('profile')
      } else {
        // Email confirmation required — can't proceed to profile
        // because there's no valid session for server-side pages
        setError('Check your email to confirm your account, then log in to set up your profile.')
        setLoading(false)
      }
    } else {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // ── Step 2: Avatar upload ────────────────────────────────────────────
  async function handleAvatar(file: File) {
    if (!userId) return
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabaseStorage.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) {
        setError(upErr.message)
        return
      }
      const { data: pub } = supabaseStorage.storage
        .from('avatars')
        .getPublicUrl(path)
      setAvatarUrl(pub.publicUrl)
      await updateProfile({ avatar_url: pub.publicUrl })
    } finally {
      setUploading(false)
    }
  }

  // ── Step 2: Save profile ─────────────────────────────────────────────
  function handleSaveProfile() {
    startTransition(async () => {
      await updateProfile({
        headline: headline || undefined,
        bio: bio || undefined,
      })
      // Hard navigate so dashboard server component renders with fresh auth
      window.location.href = '/dashboard'
    })
  }

  function handleSkipProfile() {
    window.location.href = '/dashboard'
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  const initials = fullName
    ? fullName.charAt(0).toUpperCase()
    : email
      ? email.charAt(0).toUpperCase()
      : '?'

  return (
    <div className="min-h-screen" style={{ background: '#2b1a55' }}>
      <LandingNav />

      <div
        className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        {step === 'signup' && (
          <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
            <div className="flex w-full max-w-[1000px] gap-16 items-center">
              {/* Left — signup form */}
              <div className="flex-1 max-w-[480px]">
                <h1 className="text-[28px] font-bold text-white mb-1">
                  Get started
                </h1>
                <p className="text-[13px] mb-6" style={{ color: '#b8a8d8' }}>
                  Free forever. No credit card required.
                </p>

                <div className="bg-white rounded-2xl p-5">
                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:bg-gray-50 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      borderColor: '#E7E5E4',
                      color: '#1C1917',
                      backgroundColor: '#fff',
                    }}
                  >
                    {googleLoading ? (
                      'Opening Google…'
                    ) : (
                      <>
                        <GoogleMark />
                        Continue with Google
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-3 my-3.5 text-[12px]" style={{ color: '#A8A29E' }}>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#E7E5E4' }} />
                    or
                    <div className="flex-1 h-px" style={{ backgroundColor: '#E7E5E4' }} />
                  </div>

                  {/* Email form */}
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#57534E' }}>
                        Full name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Your name"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                        style={{
                          border: '1px solid #E7E5E4',
                          backgroundColor: '#F5F5F4',
                          color: '#1C1917',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#57534E' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                        style={{
                          border: '1px solid #E7E5E4',
                          backgroundColor: '#F5F5F4',
                          color: '#1C1917',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#57534E' }}>
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                        style={{
                          border: '1px solid #E7E5E4',
                          backgroundColor: '#F5F5F4',
                          color: '#1C1917',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#57534E' }}>
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="(555) 555-5555"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                        style={{
                          border: '1px solid #E7E5E4',
                          backgroundColor: '#F5F5F4',
                          color: '#1C1917',
                        }}
                      />
                      <p className="text-[10px] mt-0.5" style={{ color: '#A8A29E' }}>
                        So our team can reach you if your work stands out
                      </p>
                    </div>

                    <CollapsibleSmsConsent checked={smsConsent} onChange={setSmsConsent} />

                    {error && (
                      <p className="text-sm text-red-500">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-all active:scale-[0.985] disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                    >
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </form>
                </div>

                <p className="text-center text-[12px] mt-4" style={{ color: '#b8a8d8' }}>
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium hover:underline" style={{ color: '#a855f7' }}>
                    Log in
                  </Link>
                </p>
              </div>

              {/* Right — branding */}
              <div className="flex-1 hidden md:flex flex-col justify-center max-w-[400px]">
                <h2 className="text-[26px] font-bold text-white leading-tight mb-3">
                  Where screenwriters develop their ideas into{' '}
                  <span style={{ color: '#d4a843' }}>hits.</span>
                </h2>
                <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#b8a8d8' }}>
                  Upload your script. Get instant coverage. Connect with the
                  industry partners who can help get your project made.
                </p>

                {/* Opportunity card mockup */}
                <div className="bg-white rounded-xl p-4 shadow-lg" style={{ maxWidth: 240 }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#22c55e' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#22c55e' }}>
                      OPTIONED
                    </span>
                    <span className="text-[10px]" style={{ color: '#9ca3af' }}>
                      by Meridian Pictures
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold mb-0.5" style={{ color: '#1C1917' }}>
                    Nightfall
                  </p>
                  <p className="text-[10px] mb-3" style={{ color: '#9ca3af' }}>
                    Series · Drama · Thriller
                  </p>
                  <div className="border-t pt-2 space-y-1" style={{ borderColor: '#E7E5E4' }}>
                    {[
                      { initials: 'MP', name: 'Meridian Pictures', role: 'Producer', bg: '#ef4444' },
                      { initials: 'KP', name: 'Kate Park', role: 'Director', bg: '#a855f7' },
                    ].map((p) => (
                      <div key={p.name} className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-medium text-white"
                          style={{ backgroundColor: p.bg }}
                        >
                          {p.initials}
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: '#1C1917' }}>
                          {p.name}
                        </span>
                        <span className="text-[9px]" style={{ color: '#9ca3af' }}>
                          {p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
            <div className="bg-white rounded-2xl p-6 w-full max-w-[420px]">
              <h1 className="text-[20px] font-bold mb-1" style={{ color: '#1C1917' }}>
                Create your profile
              </h1>
              <p className="text-[13px] mb-5" style={{ color: '#78716C' }}>
                Set up your profile so industry partners can learn about you and reach out.
              </p>

              <div className="space-y-5">
                {/* Photo */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: '#57534E' }}>
                    Photo
                  </label>
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover"
                        style={{ backgroundColor: '#F5F5F4' }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <label
                        className="inline-block px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ borderColor: '#E7E5E4', color: '#57534E' }}
                      >
                        {uploading
                          ? 'Uploading…'
                          : avatarUrl
                            ? 'Change photo'
                            : 'Upload photo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleAvatar(f)
                          }}
                          className="hidden"
                        />
                      </label>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarUrl(null)
                            updateProfile({ avatar_url: null })
                          }}
                          className="text-xs font-medium text-left bg-transparent border-0 cursor-pointer p-0"
                          style={{ color: '#ef4444' }}
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Headline */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold mb-1.5" style={{ color: '#57534E' }}>
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    maxLength={120}
                    placeholder="Half-hour comedy + features. Repped by ___."
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{
                      border: '1px solid #E7E5E4',
                      backgroundColor: '#fff',
                      color: '#1C1917',
                    }}
                  />
                  <p className="text-[11px] mt-1" style={{ color: '#A8A29E' }}>
                    {headline.length}/120 — short tagline next to your name
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold mb-1.5" style={{ color: '#57534E' }}>
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={600}
                    rows={4}
                    placeholder="A few sentences about who you are and what you write."
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all resize-none"
                    style={{
                      border: '1px solid #E7E5E4',
                      backgroundColor: '#fff',
                      color: '#1C1917',
                    }}
                  />
                  <p className="text-[11px] mt-1" style={{ color: '#A8A29E' }}>
                    {bio.length}/600
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: '1px solid #E7E5E4' }}>
                <button
                  type="button"
                  onClick={handleSkipProfile}
                  className="text-[13px] font-medium bg-transparent border-0 cursor-pointer p-0 transition-colors"
                  style={{ color: '#A8A29E' }}
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={pending || (!headline && !bio)}
                  className="px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40 transition-all hover:brightness-110 active:scale-[0.985]"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                >
                  {pending ? 'Saving…' : 'Save & continue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
