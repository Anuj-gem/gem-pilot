// Producer onboarding — single-page form to populate `profiles.lane`.
//
// Authenticated producers land here after signup (or from middleware if
// `lane` is still null). Saves a JSON blob describing their mandate so the
// matching engine can score scripts against producer preferences.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

type FormatChoice = 'feature' | 'series' | 'both'
type BudgetTier = 'micro' | 'indie' | 'mid' | 'studio' | 'agnostic'

const GENRES: { id: string; label: string }[] = [
  { id: 'drama', label: 'Drama' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'horror', label: 'Horror' },
  { id: 'sci-fi', label: 'Sci-Fi' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'crime', label: 'Crime' },
  { id: 'romance', label: 'Romance' },
  { id: 'action', label: 'Action' },
  { id: 'family', label: 'Family' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'musical', label: 'Musical' },
  { id: 'western', label: 'Western' },
  { id: 'other', label: 'Other' },
]

const FORMATS: { id: FormatChoice; label: string }[] = [
  { id: 'feature', label: 'Feature' },
  { id: 'series', label: 'Series' },
  { id: 'both', label: 'Both' },
]

const BUDGET_TIERS: { id: BudgetTier; label: string; caption: string }[] = [
  { id: 'micro', label: 'Micro', caption: '<$1M' },
  { id: 'indie', label: 'Indie', caption: '$1–15M' },
  { id: 'mid', label: 'Mid', caption: '$15–50M' },
  { id: 'studio', label: 'Studio', caption: '$50M+' },
  { id: 'agnostic', label: 'Agnostic', caption: 'Open to any' },
]

type LanePayload = {
  genres: string[]
  format: FormatChoice
  budget_tier: BudgetTier
  looking_for_text: string
}

export default function ProducerOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [authChecked, setAuthChecked] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [genres, setGenres] = useState<string[]>([])
  const [format, setFormat] = useState<FormatChoice | null>(null)
  const [budgetTier, setBudgetTier] = useState<BudgetTier | null>(null)
  const [lookingForText, setLookingForText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auth gate + pre-fill from existing lane (edit mode).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/login?redirect=/onboarding/producer')
        return
      }
      // Pre-fill from any existing lane so the form acts as an editor too.
      const { data: profile } = await supabase
        .from('profiles')
        .select('lane')
        .eq('id', user.id)
        .single()
      if (cancelled) return
      const lane = profile?.lane as Partial<LanePayload> | null
      if (lane) {
        if (Array.isArray(lane.genres)) setGenres(lane.genres)
        if (lane.format) setFormat(lane.format as FormatChoice)
        if (lane.budget_tier) setBudgetTier(lane.budget_tier as BudgetTier)
        if (typeof lane.looking_for_text === 'string') setLookingForText(lane.looking_for_text)
        // If the user already has any lane data, treat this as edit mode.
        if (lane.genres?.length || lane.format || lane.budget_tier) {
          setIsEditing(true)
        }
      }
      setAuthChecked(true)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleGenre = (id: string) => {
    setGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const canSubmit =
    genres.length > 0 && format !== null && budgetTier !== null && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || format === null || budgetTier === null) return
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login?redirect=/onboarding/producer')
      return
    }

    const lane: LanePayload = {
      genres,
      format,
      budget_tier: budgetTier,
      looking_for_text: lookingForText.trim(),
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ lane, account_type: 'producer' })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message || 'Could not save. Please try again.')
      setSubmitting(false)
      return
    }

    router.push('/partner')
    router.refresh()
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--gem-gray-400)]">
        <Loader2 size={20} className="animate-spin mr-2" />
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-56px)] px-4 py-8 sm:py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--gem-gray-50)] mb-2">
          {isEditing ? 'Edit your lane' : 'Tell us what you\u2019re looking for'}
        </h1>
        <p className="text-sm text-[var(--gem-gray-400)] mb-8">
          This shapes which scripts we surface for you. You can change these
          anytime.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Genres */}
          <section>
            <label className="block text-sm font-semibold text-[var(--gem-gray-50)] mb-1">
              Genres
            </label>
            <p className="text-xs text-[var(--gem-gray-400)] mb-3">
              Pick all that fit your slate.
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => {
                const isSelected = genres.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGenre(g.id)}
                    aria-pressed={isSelected}
                    className={`tag-pill ${isSelected ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Format */}
          <section>
            <label className="block text-sm font-semibold text-[var(--gem-gray-50)] mb-3">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map(f => {
                const isSelected = format === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setFormat(f.id)}
                    className="px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      border: isSelected
                        ? '2px solid var(--gem-accent)'
                        : '1px solid var(--gem-gray-700)',
                      background: isSelected
                        ? 'rgba(124,58,237,0.04)'
                        : 'var(--gem-black)',
                      color: isSelected
                        ? 'var(--gem-gray-50)'
                        : 'var(--gem-gray-300)',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Budget tier */}
          <section>
            <label className="block text-sm font-semibold text-[var(--gem-gray-50)] mb-3">
              Budget tier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {BUDGET_TIERS.map(b => {
                const isSelected = budgetTier === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setBudgetTier(b.id)}
                    className="text-left px-3 py-2.5 rounded-lg transition-all duration-150 relative"
                    style={{
                      border: isSelected
                        ? '2px solid var(--gem-accent)'
                        : '1px solid var(--gem-gray-700)',
                      background: isSelected
                        ? 'rgba(124,58,237,0.04)'
                        : 'var(--gem-black)',
                    }}
                  >
                    <p
                      className="text-sm font-semibold m-0"
                      style={{
                        color: isSelected
                          ? 'var(--gem-gray-50)'
                          : 'var(--gem-gray-200)',
                      }}
                    >
                      {b.label}
                    </p>
                    <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mt-0.5">
                      {b.caption}
                    </p>
                    {isSelected && (
                      <span
                        aria-hidden
                        className="absolute top-2 right-2 w-4 h-4 rounded-full grid place-items-center"
                        style={{ background: 'var(--gem-accent)', color: '#fff' }}
                      >
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Free text */}
          <section>
            <label
              htmlFor="looking_for"
              className="block text-sm font-semibold text-[var(--gem-gray-50)] mb-1"
            >
              Looking for, in your own words
              <span className="ml-1 text-xs font-normal text-[var(--gem-gray-400)]">
                (optional)
              </span>
            </label>
            <p className="text-xs text-[var(--gem-gray-400)] mb-2">
              The more specific, the better the matches.
            </p>
            <textarea
              id="looking_for"
              value={lookingForText}
              onChange={e => setLookingForText(e.target.value)}
              rows={4}
              placeholder="Anything specific you're hunting right now?"
            />
          </section>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.985] glow-accent"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </span>
              ) : (
                'Save and continue'
              )}
            </button>
            {!canSubmit && !submitting && (
              <p className="text-xs text-[var(--gem-gray-400)] mt-2">
                Pick at least one genre, a format, and a budget tier.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
