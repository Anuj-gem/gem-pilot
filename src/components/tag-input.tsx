'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  label: string
  tags: string[]
  suggestions?: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function TagInput({ label, tags, suggestions = [], onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  )

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim()
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized])
    }
    setInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--gem-gray-300)]">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <span key={tag} className="tag-pill active flex items-center gap-1">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-300">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(input) }
          }}
          placeholder={placeholder || `Add ${label.toLowerCase()}...`}
          className="w-full"
        />
        {showSuggestions && input && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--gem-gray-800)] border border-[var(--gem-gray-600)] rounded-lg overflow-hidden z-10 max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map(s => (
              <button
                key={s}
                onClick={() => addTag(s)}
                className="w-full text-left px-3 py-2 text-sm text-[var(--gem-gray-300)] hover:bg-[var(--gem-gray-700)] hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
