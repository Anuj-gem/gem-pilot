'use client'

// OnboardingProfileFields — controlled profile form fields with no
// embedded submit button. The parent (OnboardingProfileClient) owns the
// submit + state and drives them from the OnboardingShell action bar.
//
// Field set kept aligned with ProfileEditor (the standalone /profile
// version) — Photo, Name, Handle, Headline, Bio, IMDB. The handle is
// pre-filled from the user's name as a courtesy; users who don't care
// can leave it as-is. Email is shown read-only at the bottom.
//
// Anuj 2026-04-30 v0.10.8.

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export interface ProfileFieldsValue {
  full_name: string
  handle: string
  headline: string
  bio: string
  imdb_url: string
  avatar_url: string | null
}

interface Props {
  userId: string
  email: string
  value: ProfileFieldsValue
  onChange: (next: ProfileFieldsValue) => void
}

export function OnboardingProfileFields({ userId, email, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleAvatar(file: File) {
    setUploadErr(null)
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) {
        setUploadErr(upErr.message)
        return
      }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      onChange({ ...value, avatar_url: pub.publicUrl })
    } finally {
      setUploading(false)
    }
  }

  function patch(p: Partial<ProfileFieldsValue>) {
    onChange({ ...value, ...p })
  }

  const initials = (value.full_name || email).charAt(0).toUpperCase()

  return (
    <div className="space-y-5">
      {/* Photo */}
      <div>
        <Label>Photo</Label>
        <div className="flex items-center gap-4">
          {value.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover bg-gray-100" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="inline-block px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
              {uploading ? 'Uploading…' : value.avatar_url ? 'Change photo' : 'Upload photo'}
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
            {value.avatar_url && (
              <button
                type="button"
                onClick={() => patch({ avatar_url: null })}
                className="text-xs font-semibold text-red-400 hover:text-red-300 text-left"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        {uploadErr && (
          <p className="mt-2 text-[12px] text-red-400">{uploadErr}</p>
        )}
      </div>

      <Field label="Name">
        <input
          type="text"
          value={value.full_name}
          onChange={(e) => patch({ full_name: e.target.value })}
          maxLength={80}
          className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <Field label="Handle" hint={`gem.studio/w/${(value.handle || 'your-handle').toLowerCase()}`}>
        <input
          type="text"
          value={value.handle}
          onChange={(e) => patch({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          maxLength={32}
          minLength={3}
          placeholder="your-handle"
          className="w-full rounded-lg bg-[var(--gem-gray-900)] border border-[var(--gem-gray-700)] px-3 py-2.5 text-[15px] text-[var(--gem-gray-50)] placeholder-[var(--gem-gray-500)] font-mono focus:border-[var(--gem-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--gem-accent)]"
        />
      </Field>

      <Field
        label="Headline"
        hint={`${value.headline.length}/120 — short tagline that shows next to your name everywhere on GEM`}
      >
        <input
          type="text"
          value={value.headline}
          onChange={(e) => patch({ headline: e.target.value })}
          maxLength={120}
          placeholder="Half-hour comedy + features. Repped by ___."
          className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <Field label="Bio" hint={`${value.bio.length}/600 — a paragraph about you and what you write`}>
        <textarea
          value={value.bio}
          onChange={(e) => patch({ bio: e.target.value })}
          maxLength={600}
          rows={4}
          placeholder="Optional. A few sentences about who you are."
          className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <Field label="IMDb URL" hint="Optional">
        <input
          type="url"
          value={value.imdb_url}
          onChange={(e) => patch({ imdb_url: e.target.value })}
          placeholder="https://www.imdb.com/name/nm0000000/"
          className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </Field>

      <div>
        <Label muted>Email</Label>
        <div className="text-sm text-gray-500">{email}</div>
      </div>
    </div>
  )
}

function Label({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <label
      className={`block text-[11px] uppercase tracking-[0.16em] font-bold mb-2 ${
        muted ? 'text-gray-400' : 'text-gray-700'
      }`}
    >
      {children}
    </label>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <div className="text-[11.5px] text-[var(--gem-gray-500)] mt-1.5">{hint}</div>}
    </div>
  )
}
