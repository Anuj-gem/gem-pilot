'use client'

import { useState, useRef, useEffect } from 'react'

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
    tags: string[]
    min_score?: number | null
    deadline?: string | null
    deal_type?: string | null
    investment_range?: string | null
    investment_thesis?: string | null
    investment_requirements?: string[]
  }
  onClose: () => void
  onSaved: () => void
}

const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Fantasy', 'Action',
  'Crime', 'Mystery', 'Romance', 'Western', 'Musical', 'Family',
  'Historical', 'War', 'Sports', 'Documentary',
]
const FORMAT_OPTIONS = [
  { value: 'Feature', label: 'Feature' },
  { value: 'Series', label: 'Series' },
]
const BUDGET_OPTIONS = [
  { value: 'micro', label: 'Micro' },
  { value: 'indie', label: 'Indie' },
  { value: 'mid', label: 'Mid' },
  { value: 'studio', label: 'Studio' },
  { value: 'premium', label: 'Premium' },
  { value: 'tentpole', label: 'Tentpole' },
]

const DEAL_TYPE_OPTIONS = [
  { value: 'representation', label: 'Representation' },
  { value: 'option', label: 'Option' },
  { value: 'development_deal', label: 'Development Deal' },
  { value: 'production_partnership', label: 'Production Partnership' },
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

export function OpportunitySettings({ opportunity, onClose, onSaved }: OpportunitySettingsProps) {
  const [title, setTitle] = useState(opportunity.title)
  const [subtitle, setSubtitle] = useState(opportunity.subtitle || '')
  const [description, setDescription] = useState(opportunity.description)
  const [formats, setFormats] = useState<string[]>(opportunity.formats || [])
  const [genres, setGenres] = useState<string[]>(opportunity.genres || [])
  const [budgetTiers, setBudgetTiers] = useState<string[]>(opportunity.budget_tiers || [])
  const [tags, setTags] = useState<string[]>(opportunity.tags || [])
  const [dealType, setDealType] = useState(opportunity.deal_type || '')
  const [investmentRange, setInvestmentRange] = useState(opportunity.investment_range || '')
  const [investmentThesis, setInvestmentThesis] = useState(opportunity.investment_thesis || '')
  const [investmentRequirements, setInvestmentRequirements] = useState<string[]>(opportunity.investment_requirements || [])
  const [reqInput, setReqInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState(opportunity.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
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
          tags,
          deal_type: dealType || null,
          investment_range: investmentRange.trim() || null,
          investment_thesis: investmentThesis.trim() || null,
          investment_requirements: investmentRequirements,
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

          {/* Deal Type */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">Deal type</label>
            <select
              value={dealType}
              onChange={e => setDealType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-purple-400 bg-white"
            >
              <option value="">Select deal type...</option>
              {DEAL_TYPE_OPTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
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
            <div className="grid grid-cols-2 gap-1.5">
              {GENRE_OPTIONS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleItem(genres, g, setGenres)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors border text-left"
                  style={{
                    background: genres.includes(g) ? '#ede9fe' : '#fff',
                    color: genres.includes(g) ? '#5b21b6' : '#6b7280',
                    borderColor: genres.includes(g) ? '#c4b5fd' : '#e5e7eb',
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
                    background: budgetTiers.includes(b.value) ? '#ede9fe' : '#fff',
                    color: budgetTiers.includes(b.value) ? '#5b21b6' : '#6b7280',
                    borderColor: budgetTiers.includes(b.value) ? '#c4b5fd' : '#e5e7eb',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-2">Tags</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                  >
                    {t}
                    <button onClick={() => removeTag(t)} className="text-purple-400 hover:text-purple-700 text-[14px] leading-none">&times;</button>
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
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:border-purple-400"
              />
              {showTagSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[160px] overflow-y-auto">
                  {tagSuggestions.map(s => (
                    <button
                      key={s}
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

          {/* Investment details */}
          <div className="rounded-lg border border-green-200 bg-green-50/30 p-4 space-y-3">
            <label className="block text-[12px] font-semibold text-green-800">Investment details</label>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Range</label>
              <input
                type="text"
                value={investmentRange}
                onChange={e => setInvestmentRange(e.target.value)}
                placeholder="e.g. $50K – $250K per project"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-green-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Thesis</label>
              <textarea
                value={investmentThesis}
                onChange={e => setInvestmentThesis(e.target.value)}
                placeholder="What kind of projects are you looking to back?"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] text-gray-900 focus:outline-none focus:border-green-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Requirements</label>
              {investmentRequirements.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {investmentRequirements.map(r => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-green-100 text-green-800 border border-green-200"
                    >
                      {r}
                      <button onClick={() => setInvestmentRequirements(investmentRequirements.filter(x => x !== r))} className="text-green-500 hover:text-green-800 text-[14px] leading-none">&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={reqInput}
                onChange={e => setReqInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && reqInput.trim()) {
                    e.preventDefault()
                    const v = reqInput.trim()
                    if (!investmentRequirements.includes(v)) setInvestmentRequirements([...investmentRequirements, v])
                    setReqInput('')
                  }
                }}
                placeholder="e.g. Needs director attached (Enter to add)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:border-green-400"
              />
            </div>
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
