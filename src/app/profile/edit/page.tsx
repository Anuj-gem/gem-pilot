'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TagInput from '@/components/tag-input'
import { SKILLS, GENRES } from '@/lib/types'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')

  const [fullName, setFullName] = useState('')
  const [statement, setStatement] = useState('')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [influences, setInfluences] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [accomplishments, setAccomplishments] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile) {
        setFullName(profile.full_name || '')
        setStatement(profile.statement || '')
        setBio(profile.bio || '')
        setSkills(profile.skills || [])
        setGenres(profile.genres || [])
        setInfluences(profile.influences || [])
        setLocation(profile.location || '')
        setWebsite(profile.website || '')
        setAccomplishments(profile.accomplishments || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: fullName,
      statement,
      bio,
      skills,
      genres,
      influences,
      location,
      website,
      accomplishments,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    router.push(`/creators/${userId}`)
    router.refresh()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-[var(--gem-gray-400)]">Loading...</div>
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Edit profile</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Full name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Creator statement</label>
          <textarea
            value={statement}
            onChange={e => setStatement(e.target.value)}
            rows={3}
            placeholder="What are you building and why?"
            className="resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Work &amp; accomplishments</label>
          <textarea
            value={accomplishments}
            onChange={e => setAccomplishments(e.target.value)}
            rows={4}
            placeholder="Past projects, credits, achievements..."
            className="resize-none"
          />
        </div>

        <TagInput label="Skills" tags={skills} onChange={setSkills} suggestions={SKILLS} />
        <TagInput label="Genres" tags={genres} onChange={setGenres} suggestions={GENRES} />
        <TagInput label="Influences" tags={influences} onChange={setInfluences} />

        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Location</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Los Angeles, CA" />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Website</label>
          <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border border-[var(--gem-gray-600)] text-[var(--gem-gray-300)] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
