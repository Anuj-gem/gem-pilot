'use client'

import { useState } from 'react'

interface OpportunitySettingsProps {
  opportunity: {
    id: string
    title: string
    subtitle: string | null
    description: string
    status: string
    formats: string[]
    genres: string[]
    budget_tiers: string[]
    min_score: number | null
    deadline: string | null
  }
  onClose: () => void
  onSaved: () => void
}

const GENRE_OPTIONS = [
  'thriller', 'crime', 'horror', 'drama', 'comedy', 'sci-fi', 'fantasy', 'romance', 'action', 'family', 'western', 'musical',
]
const FORMAT_OPTIONS = [
  { value: 'feature', label: 'Feature' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'limited_series', label: 'Limited Series' },
  { value: 'short', label: 'Short' },
]
const BUDGET_OPTIONS = [
  { value: 'micro', label: 'Micro' },
  { value: 'indie', label: 'Indie' },
  { value: 'mid', label: 'Mid' },
  { value: 'studio', label: 'Studio' },
  { value: 'premium', label: 'Premium' },
  { value: 'tentpole', label: 'Tentpole' },
]

export function OpportunitySettings({ opportunity, onClose, onSaved }: OpportunitySettingsProps) {
  const [title, setTitle] = useState(opportunity.title)
  const [subtitle, setSubtitle] = useState(opportunity.subtitle || '')
  const [description, setDescription] = useState(opportunity.description)
  const [formats, setFormats] = useState<string[]>(opportunity.formats || [])
  const [genres, setGenres] = useState<string[]>(opportunity.genres || [])
  const [budgetTiers, setBudgetTiers] = useState<string[]>(opportunity.budget_tiers || [])
  const [minScore, setMinScore] = useState(opportunity.min_score?.toString() || '')
  const [deadline, setDeadline] = useState(opportunity.deadline ? opportunity.deadline.split('T')[0] : '')
  const [status, setStatus] = useState(opportunity.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/opportunity/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          description: description.trim(),
          formats,
          genres,
          budget_tiers: budgetTiers,
          min_score: minScore ? Number(minScore) : null,
          deadline: deadline || null,
          status,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return
      }
      onSaved()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl mx-4">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Opportunity Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-[20px] leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status toggle */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 border border-gray-100">
            <div>
              <p className="text-[14px] font-semibold text-gray-900 m-0">Status</p>
              <p className="text-[12px] text-gray-500 m-0">
                {status === 'active' ? 'Accepting applications' : 'Closed — no new applications'}
              </p>
            </div>
            <button
              onClick={() => setStatus(status === 'active' ? 'closed' : 'active')}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
              style={{
                background: status === 'active' ? '#dcfce7' : '#fee2e2',
                color: status === 'active' ? '#166534' : '#991b1b',
              }}
            >
              {status === 'active' ? 'Open' : 'Closed'}
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="Short tagline (optional)"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-purple-400 resize-none"
            />
          </div>

          {/* Formats */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-2">Formats</label>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => toggleItem(formats, f.value, setFormats)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors border"
                  style={{
                    background: formats.includes(f.value) ? '#ede9fe' : '#fff',
                    color: formats.includes(f.value) ? '#5b21b6' : '#6b7280',
                    borderColor: formats.includes(f.value) ? '#c4b5fd' : '#e5e7eb',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-2">Genres</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleItem(genres, g, setGenres)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors border capitalize"
                  style={{
                    background: genres.includes(g) ? '#dbeafe' : '#fff',
                    color: genres.includes(g) ? '#1e40af' : '#6b7280',
                    borderColor: genres.includes(g) ? '#93c5fd' : '#e5e7eb',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Budget tiers */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-2">Budget tiers</label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(b => (
                <button
                  key={b.value}
                  onClick={() => toggleItem(budgetTiers, b.value, setBudgetTiers)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors border"
                  style={{
                    background: budgetTiers.includes(b.value) ? '#fef3c7' : '#fff',
                    color: budgetTiers.includes(b.value) ? '#92400e' : '#6b7280',
                    borderColor: budgetTiers.includes(b.value) ? '#fcd34d' : '#e5e7eb',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min score */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">Minimum score</label>
            <input
              type="number"
              value={minScore}
              onChange={e => setMinScore(e.target.value)}
              placeholder="e.g. 60"
              min="0"
              max="100"
              className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-purple-400"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-600 font-medium m-0">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50"
            style={{ background: '#7c3aed' }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
