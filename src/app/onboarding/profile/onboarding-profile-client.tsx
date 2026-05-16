'use client'

// OnboardingProfileClient — post-signup profile setup.
// Photo, headline, bio. Skippable. Save or skip → /dashboard.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { updateProfile } from '@/app/profile/actions'

interface ProfileShape {
  id: string
  email: string
  full_name: string | null
  headline: string | null
  bio: string | null
  avatar_url: string | null
}

interface Props { profile: ProfileShape }

export function OnboardingProfileClient({ profile }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [headline, setHeadline] = useState(profile.headline ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleAvatar(file: File) {
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { setError(upErr.message); return }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(pub.publicUrl)
      await updateProfile({ avatar_url: pub.publicUrl })
    } finally {
      setUploading(false)
    }
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateProfile({ headline, bio })
      if ('error' in res && res.error) { setError(res.error); return }
      router.replace('/dashboard')
    })
  }

  function skip() {
    router.replace('/dashboard')
  }

  const initials = (profile.full_name || profile.email).charAt(0).toUpperCase()
  const dirty = headline !== (profile.headline ?? '') || bio !== (profile.bio ?? '') || avatarUrl !== (profile.avatar_url ?? null)

  return (
    <div className="min-h-[calc(100vh-56px)] px-4 py-10 sm:py-16">
      <div className="max-w-md mx-auto">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Create your profile
          </h1>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            Set up your profile so industry partners can learn about you and reach out.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">

          {/* Photo */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
              Photo
            </label>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover bg-gray-100" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="inline-block px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                  {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatar(f) }}
                    className="hidden"
                  />
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => { setAvatarUrl(null); updateProfile({ avatar_url: null }) }}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 text-left bg-transparent border-0 cursor-pointer p-0"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
              Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
              placeholder="Half-hour comedy + features. Repped by ___."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="text-[11.5px] text-gray-400 mt-1.5">{headline.length}/120 — short tagline next to your name</div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={600}
              rows={4}
              placeholder="A few sentences about who you are and what you write."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="text-[11.5px] text-gray-400 mt-1.5">{bio.length}/600</div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={skip}
              className="text-[14px] font-medium text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer p-0 transition-colors"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="px-6 py-2.5 rounded-lg text-[14px] font-semibold text-white disabled:opacity-40 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              {pending ? 'Saving…' : 'Save & continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
