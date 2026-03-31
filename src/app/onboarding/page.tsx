'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TagInput from '@/components/tag-input'
import { SKILLS, GENRES } from '@/lib/types'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [statement, setStatement] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [influences, setInfluences] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [accomplishments, setAccomplishments] = useState('')

  const handleFinish = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      statement,
      skills,
      genres,
      influences,
      location,
      website,
      accomplishments,
    }).eq('id', user.id)

    router.push(`/creators/${user.id}`)
    router.refresh()
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-[var(--gem-accent)]' : 'bg-[var(--gem-gray-700)]'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Your creator statement</h1>
              <p className="text-sm text-[var(--gem-gray-400)]">
                Tell the world what you&apos;re building and why. Not a bio — a manifesto.
              </p>
            </div>
            <textarea
              value={statement}
              onChange={e => setStatement(e.target.value)}
              rows={4}
              placeholder="I'm making horror films that feel like dreams. All AI-generated. All deeply human."
              className="w-full resize-none"
            />
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
                Work &amp; accomplishments
              </label>
              <textarea
                value={accomplishments}
                onChange={e => setAccomplishments(e.target.value)}
                rows={3}
                placeholder="Past projects, credits, festival selections, press..."
                className="w-full resize-none"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Skills &amp; sensibility</h1>
              <p className="text-sm text-[var(--gem-gray-400)]">
                What do you bring to collaborations? What worlds do you work in?
              </p>
            </div>
            <TagInput label="Skills" tags={skills} onChange={setSkills} suggestions={SKILLS} placeholder="e.g. writing, directing, composing..." />
            <TagInput label="Genres" tags={genres} onChange={setGenres} suggestions={GENRES} placeholder="e.g. horror, sci-fi, drama..." />
            <TagInput label="Influences" tags={influences} onChange={setInfluences} placeholder="e.g. Nolan, A24, Tarkovsky..." />
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-lg border border-[var(--gem-gray-600)] text-[var(--gem-gray-300)] hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Almost there</h1>
              <p className="text-sm text-[var(--gem-gray-400)]">
                A couple more details to round out your profile.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Los Angeles, CA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://your-site.com"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-lg border border-[var(--gem-gray-600)] text-[var(--gem-gray-300)] hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Launch my profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
