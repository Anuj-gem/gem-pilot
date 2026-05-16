'use client'

// AppSidebar — persistent left sidebar with inline profile card.
// Three states, all transitions happen IN PLACE with smooth animations:
//   1. Anonymous: empty profile shape (placeholder headline/bio) + "Create your profile" CTA
//      → clicking CTA unfolds signup fields DOWN
//   2. Post-signup: inline headline + bio editor (the "side quest")
//   3. Logged-in: display mode with name, badge, headline, bio, edit link
//
// NO stats (already shown in dashboard stat cards).
// NO page navigation for signup (everything inline).

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { GoogleMark } from '@/components/auth/google-mark'

export interface AppSidebarData {
  userName: string
  avatarUrl: string | null
  headline: string | null
  isPro: boolean
  scriptCount: number
  appCount: number
  heatScore: number
}

/** Pass null to render the anonymous state */
export function AppSidebar(props: AppSidebarData | { anonymous: true }) {
  const pathname = usePathname() ?? ''

  // Hide sidebar on report pages (full-width reading experience)
  if (pathname.startsWith('/report/')) return null

  const isAnon = 'anonymous' in props

  return (
    <aside className="hidden lg:block w-[220px] shrink-0">
      <div className="sticky top-20 pt-2">
        {isAnon ? (
          <AnonProfileCard />
        ) : (
          <LoggedInProfileCard
            userName={props.userName}
            avatarUrl={props.avatarUrl}
            headline={props.headline}
            isPro={props.isPro}
          />
        )}

        {/* Become a member CTA — only for logged-in guest users */}
        {!isAnon && !props.isPro && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110 mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            Become a member
          </button>
        )}

        {/* Links — only for logged-in users */}
        {!isAnon && (
          <NavLinks pathname={pathname} />
        )}
      </div>
    </aside>
  )
}

// ─── ANONYMOUS PROFILE CARD ─────────────────────────────────────────────────

type AnonStep = 'empty' | 'signup' | 'profile-edit'

function AnonProfileCard() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<AnonStep>('empty')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Post-signup profile fields
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`
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

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Claim anonymous uploads
    const anonCookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('gem_anon_scripts='))
      ?.split('=')[1]
    if (anonCookie && data.user?.id) {
      fetch('/api/claim-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, script_ids: anonCookie.split(',') }),
        keepalive: true,
      }).catch(() => {})
      document.cookie = 'gem_anon_scripts=;path=/;max-age=0'
    }

    // Fire welcome email
    if (data.user?.id) {
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, email }),
        keepalive: true,
      }).catch(() => {})
    }

    // Transition to profile edit step
    setStep('profile-edit')
    setLoading(false)
  }

  async function handleSaveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ headline: headline.trim() || null, bio: bio.trim() || null })
        .eq('id', user.id)
    }
    setSaving(false)
    router.refresh()
  }

  return (
    <div
      className="rounded-xl bg-white px-4 py-4 mb-4 overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* ── EMPTY STATE: profile shape ── */}
      <div
        className="transition-all duration-300 ease-out overflow-hidden"
        style={{
          maxHeight: step === 'empty' ? '300px' : '0px',
          opacity: step === 'empty' ? 1 : 0,
        }}
      >
        {/* Empty avatar */}
        <div className="w-[48px] h-[48px] rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ border: '1.5px dashed rgba(0,0,0,0.15)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <p className="text-[14px] font-semibold text-gray-900 text-center m-0 mb-0.5">Your writer profile</p>
        <p className="text-[11px] text-gray-400 text-center m-0 mb-4">This is what industry sees</p>

        {/* Placeholder headline */}
        <div className="h-[14px] rounded bg-gray-100 mb-2" style={{ width: '75%' }} />
        {/* Placeholder bio lines */}
        <div className="h-[10px] rounded bg-gray-50 mb-1.5" style={{ width: '100%' }} />
        <div className="h-[10px] rounded bg-gray-50 mb-4" style={{ width: '60%' }} />

        {/* CTA */}
        <button
          onClick={() => setStep('signup')}
          className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          Create your profile
        </button>
        <p className="text-[10px] text-gray-400 text-center m-0 mt-2">Scripts are deleted without an account</p>
      </div>

      {/* ── SIGNUP FIELDS: unfolds down ── */}
      <div
        className="transition-all duration-300 ease-out overflow-hidden"
        style={{
          maxHeight: step === 'signup' ? '500px' : '0px',
          opacity: step === 'signup' ? 1 : 0,
        }}
      >
        <div className="pt-1">
          {/* Small avatar + title */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900 m-0">Create your profile</p>
              <p className="text-[10px] text-gray-400 m-0">Free forever</p>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2.5 rounded-lg text-[12px] font-medium transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
            style={{ border: '1px solid rgba(0,0,0,0.1)', background: 'white' }}
          >
            {googleLoading ? (
              <span className="text-gray-400">Opening Google…</span>
            ) : (
              <>
                <GoogleMark size={14} />
                <span className="text-gray-700">Continue with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] text-gray-300">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email signup form */}
          <form onSubmit={handleSignup} className="space-y-2.5">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Full name"
              className="w-full px-3 py-2 rounded-lg text-[12px] border border-gray-200 focus:border-purple-400 focus:outline-none transition-colors"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="w-full px-3 py-2 rounded-lg text-[12px] border border-gray-200 focus:border-purple-400 focus:outline-none transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Password (6+ chars)"
              className="w-full px-3 py-2 rounded-lg text-[12px] border border-gray-200 focus:border-purple-400 focus:outline-none transition-colors"
            />

            {error && <p className="text-[11px] text-red-400 m-0">{error}</p>}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 rounded-lg text-[12px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="text-[10px] text-gray-400 text-center m-0 mt-2">Scripts are deleted without an account</p>
        </div>
      </div>

      {/* ── PROFILE EDIT: headline + bio inline ── */}
      <div
        className="transition-all duration-300 ease-out overflow-hidden"
        style={{
          maxHeight: step === 'profile-edit' ? '400px' : '0px',
          opacity: step === 'profile-edit' ? 1 : 0,
        }}
      >
        <div className="pt-1">
          {/* Avatar with initial */}
          <div className="w-[48px] h-[48px] rounded-full mx-auto mb-3 flex items-center justify-center text-[16px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            {fullName.charAt(0).toUpperCase() || 'W'}
          </div>

          <p className="text-[13px] font-semibold text-gray-900 text-center m-0 mb-0.5">Complete your profile</p>
          <p className="text-[10px] text-gray-400 text-center m-0 mb-4">Make your first impression count</p>

          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="e.g. Sci-fi thriller writer"
                className="w-full px-3 py-2 rounded-lg text-[12px] border border-gray-200 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A few words about you and your work..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[12px] border border-gray-200 focus:border-purple-400 focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-[12px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>

            <button
              onClick={() => router.refresh()}
              className="w-full py-1.5 text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer border-0 bg-transparent transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LOGGED-IN PROFILE CARD ─────────────────────────────────────────────────

function LoggedInProfileCard({
  userName,
  avatarUrl,
  headline,
  isPro,
}: {
  userName: string
  avatarUrl: string | null
  headline: string | null
  isPro: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [editHeadline, setEditHeadline] = useState(headline || '')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [bio, setBio] = useState<string | null>(null)
  const [bioLoaded, setBioLoaded] = useState(false)

  // Load bio eagerly on mount so display mode shows it immediately
  useEffect(() => {
    if (bioLoaded) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('bio').eq('id', user.id).single()
        const b = (data as { bio: string | null } | null)?.bio ?? ''
        setBio(b)
        setEditBio(b)
      }
      setBioLoaded(true)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function startEditing() {
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ headline: editHeadline.trim() || null, bio: editBio.trim() || null })
        .eq('id', user.id)
    }
    setSaving(false)
    setEditing(false)
    setBio(editBio.trim() || null)
    router.refresh()
  }

  return (
    <div
      className="rounded-xl bg-white px-4 py-4 mb-4"
      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-[48px] h-[48px] rounded-full object-cover mx-auto mb-3" />
      ) : (
        <div
          className="w-[48px] h-[48px] rounded-full mx-auto mb-3 flex items-center justify-center text-[16px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name + badge */}
      <p className="text-[14px] font-semibold text-gray-900 text-center m-0 mb-1">{userName}</p>
      <div className="flex justify-center mb-3">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: isPro ? '#f5f3ff' : '#f9fafb',
            color: isPro ? '#7c3aed' : '#9ca3af',
          }}
        >
          {isPro ? 'Member' : 'Guest'}
        </span>
      </div>

      {/* DISPLAY MODE */}
      <div
        className="transition-all duration-200 overflow-hidden"
        style={{
          maxHeight: !editing ? '200px' : '0px',
          opacity: !editing ? 1 : 0,
        }}
      >
        {headline ? (
          <p className="text-[12px] font-medium text-gray-700 text-center m-0 mb-1">{headline}</p>
        ) : (
          <p className="text-[11px] text-gray-300 text-center m-0 mb-1 italic">Add a headline</p>
        )}
        {bio !== null && bio ? (
          <p className="text-[11px] text-gray-400 text-center m-0 mb-3 leading-relaxed">{bio}</p>
        ) : (
          <p className="text-[11px] text-gray-300 text-center m-0 mb-3 italic">Add a bio</p>
        )}

        <div className="text-center pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button
            onClick={startEditing}
            className="text-[11px] text-purple-600 hover:text-purple-700 cursor-pointer border-0 bg-transparent transition-colors font-medium"
          >
            Edit profile
          </button>
        </div>
      </div>

      {/* EDIT MODE */}
      <div
        className="transition-all duration-200 overflow-hidden"
        style={{
          maxHeight: editing ? '300px' : '0px',
          opacity: editing ? 1 : 0,
        }}
      >
        <div className="space-y-2.5">
          <div>
            <label className="text-[10px] font-medium text-gray-500 block mb-1">Headline</label>
            <input
              type="text"
              value={editHeadline}
              onChange={e => setEditHeadline(e.target.value)}
              placeholder="e.g. Sci-fi thriller writer"
              className="w-full px-3 py-2 rounded-lg text-[12px] border border-gray-200 focus:border-purple-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 block mb-1">Bio</label>
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              placeholder="A few words about you and your work..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-[12px] border border-gray-200 focus:border-purple-400 focus:outline-none transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 rounded-lg text-[12px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setEditHeadline(headline || ''); setEditBio(bio || '') }}
            className="w-full py-1 text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer border-0 bg-transparent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── NAV LINKS ──────────────────────────────────────────────────────────────

function NavLinks({ pathname }: { pathname: string }) {
  const links = [
    { label: 'My Scripts', href: '/scripts', match: (p: string) => p.startsWith('/scripts') },
    { label: 'My Opportunities', href: '/review', match: (p: string) => p.startsWith('/review') || p.startsWith('/applications') },
  ]

  return (
    <nav className="space-y-0.5">
      {links.map((link) => {
        const active = link.match(pathname)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-[13px] font-medium transition-colors ${
              active
                ? 'bg-white text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
            style={active ? { boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' } : { border: '1px solid transparent' }}
          >
            {link.label}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )
      })}
    </nav>
  )
}
