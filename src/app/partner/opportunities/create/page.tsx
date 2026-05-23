'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FORMAT_OPTIONS = ['Feature', 'Pilot', 'Limited Series', 'Short']
const GENRE_OPTIONS = ['Thriller', 'Crime', 'Horror', 'Drama', 'Comedy', 'Sci-Fi', 'Fantasy', 'Romance', 'Action', 'Family']

export default function CreateOpportunityPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formats, setFormats] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [minScore, setMinScore] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item))
    } else {
      setter([...list, item])
    }
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
          min_score: minScore ? Number(minScore) : undefined,
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
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => toggleItem(genres, g, setGenres)}
                className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
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

        {/* Minimum Score */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Minimum score (optional)</label>
          <input
            type="number"
            value={minScore}
            onChange={e => setMinScore(e.target.value)}
            placeholder="e.g. 70"
            min={0}
            max={100}
            className="w-32 text-[14px] text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
          />
          <p className="text-[12px] text-gray-600 mt-1">Only scripts scoring at or above this threshold can apply.</p>
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
