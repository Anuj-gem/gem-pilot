'use client'

// ProfileEditor — single-page edit for writer profile fields.
// Anuj 2026-04-29 (v0.3).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { updateProfile } from './actions'

interface ProfileShape {
  id: string
  email: string
  full_name: string | null
  handle: string | null
  headline: string | null
  bio: string | null
  imdb_url: string | null
  avatar_url: string | null
}

interface Props { initial: ProfileShape }

export function ProfileEditor({ initial }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initial.full_name ?? '')
  const [handle, setHandle] = useState(initial.handle ?? '')
  const [headline, setHeadline] = useState(initial.headline ?? '')
  const [bio, setBio] = useState(initial.bio ?? '')
  const [imdbUrl, setImdbUrl] = useState(initial.imdb_url ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url ?? null)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleAvatar(file: File) {
    setErr(null)
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${initial.id}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { setErr(upErr.message); setUploading(false); return }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(pub.publicUrl)
      // Also save to profile immediately
      await updateProfile({ avatar_url: pub.publicUrl })
      setSavedAt(new Date().toLocaleTimeString())
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    startTransition(async () => {
      const res = await updateProfile({
        full_name: fullName,
        handle,
        headline,
        bio,
        imdb_url: imdbUrl,
      })
      if (res.error) { setErr(res.error); return }
      setSavedAt(new Date().toLocaleTimeString())
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      {/* Avatar */}
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
              {(fullName || initial.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="inline-block px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
              {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) handleAvatar(f)
                }}
                className="hidden"
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={async () => { setAvatarUrl(null); await updateProfile({ avatar_url: null }); router.refresh() }}
                className="text-xs font-semibold text-red-600 hover:text-red-800 text-left"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      <Field label="Name" required>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={80}
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <Field label="Handle" required hint={`gem.studio/w/${(handle || 'your-handle').toLowerCase()}`}>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          maxLength={32}
          minLength={3}
          required
          placeholder="your-handle"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
        />
      </Field>

      <Field label="Headline" required hint={`${headline.length}/120 — short tagline that shows next to your name everywhere on GEM`}>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={120}
          required
          placeholder="Half-hour comedy + features. Repped by ___."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <Field label="Bio" hint={`${bio.length}/600 — paragraph about you, your work, what you're chasing`}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={600}
          rows={5}
          placeholder="Optional. A few sentences about who you are and what you write."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <Field label="IMDb URL" hint="Optional">
        <input
          type="url"
          value={imdbUrl}
          onChange={(e) => setImdbUrl(e.target.value)}
          placeholder="https://www.imdb.com/name/nm0000000/"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-400 mb-1">
          Email
        </label>
        <div className="text-sm text-gray-500">{initial.email}</div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {savedAt && <span className="text-xs text-gray-500">Saved {savedAt}</span>}
      </div>
    </form>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
        {label}{required && <span className="text-purple-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <div className="text-xs text-gray-400 mt-1.5">{hint}</div>}
    </div>
  )
}
