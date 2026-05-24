'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FORMAT_OPTIONS = ['Feature', 'Series']
const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Fantasy', 'Action',
  'Crime', 'Mystery', 'Romance', 'Western', 'Musical', 'Family',
  'Historical', 'War', 'Sports', 'Documentary',
]
const BUDGET_OPTIONS = [
  { value: 'micro', label: 'Micro' },
  { value: 'indie', label: 'Indie' },
  { value: 'mid', label: 'Mid' },
  { value: 'studio', label: 'Studio' },
  { value: 'premium', label: 'Premium' },
  { value: 'tentpole', label: 'Tentpole' },
]
const TAG_SUGGESTIONS = [
  'biopic', 'true-story', 'adaptation', 'original-ip', 'limited-series',
  'anthology', 'period-piece', 'contemporary', 'ensemble', 'single-lead',
  'contained', 'high-concept', 'character-driven', 'procedural',
  'franchise-potential', 'prestige', 'elevated-genre', 'debut-writer',
  'diverse-voices', 'international', 'multilingual', 'lgbtq',
  'coming-of-age', 'workplace', 'family-saga', 'revenge', 'heist',
  'supernatural', 'dystopian', 'satire', 'mockumentary', 'found-footage',
  'bottle-episode', 'slow-burn', 'propulsive', 'non-linear',
]

export default function CreateOpportunityPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formats, setFormats] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [budgetTiers, setBudgetTiers] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item))
    } else {
      setter([...list, item])
    }
  }

  // Tag fuzzy search
  useEffect(() => {
    if (!tagInput.trim()) {
      setTagSuggestions([])
      setShowTagSuggestions(false)
      return
    }
    const needle = tagInput.toLowerCase()
    const matches = TAG_SUGGESTIONS
      .filter(t => !tags.includes(t) && t.includes(needle))
      .slice(0, 8)
    setTagSuggestions(matches)
    setShowTagSuggestions(matches.length > 0)
  }, [tagInput, tags])

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (normalized && !tags.includes(normalized)) {
      setTags([...tags, normalized])
    }
    setTagInput('')
    setShowTagSuggestions(false)
    tagInputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/opportunity/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          formats,
          genres,
          budget_tiers: budgetTiers,
          tags,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setSubmitting(false)
        return
      }
      router.push('/partner')
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-[22px] font-bold text-gray-900 m-0 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        Create opportunity
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Looking for thriller pilots"
            className="w-full text-[14px] text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
            required
          />
        </div>

        {/* Description */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what you're looking for..."
            rows={4}
            className="w-full text-[14px] text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400 resize-none"
            required
          />
        </div>

        {/* Formats */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <label className="block text-[13px] font-semibold text-gray-700 mb-2">Formats</label>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => toggleItem(formats, f, setFormats)}
                className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
                  formats.includes(f)
                    ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Genres */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <label className="block text-[13px] font-semibold text-gray-700 mb-2">Genres</label>
          <div className="grid grid-cols-2 gap-1.5">
            {GENRE_OPTIONS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => toggleItem(genres, g, setGenres)}
                className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors text-left ${
                  genres.includes(g)
                    ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Tiers */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <label className="block text-[13px] font-semibold text-gray-700 mb-2">Budget tiers</label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map(b => (
              <button
                key={b.value}
                type="button"
                onClick={() => toggleItem(budgetTiers, b.value, setBudgetTiers)}
                className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
                  budgetTiers.includes(b.value)
                    ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <label className="block text-[13px] font-semibold text-gray-700 mb-2">Tags</label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                >
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="text-purple-400 hover:text-purple-700 text-[14px] leading-none">&times;</button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault()
                  addTag(tagInput.trim())
                }
              }}
              placeholder="Type to search tags..."
              className="w-full text-[13px] text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
            />
            {showTagSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[160px] overflow-y-auto">
                {tagSuggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTag(s)}
                    className="block w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Press Enter to add custom tags</p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[13px] text-red-600 m-0">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="bg-purple-600 hover:bg-purple-700 text-white text-[14px] font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create opportunity'}
        </button>
      </form>
    </div>
  )
}
