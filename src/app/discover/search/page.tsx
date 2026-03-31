'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Search } from 'lucide-react'
import CreatorCard from '@/components/creator-card'
import ProjectCard from '@/components/project-card'
import { SKILLS, GENRES, Profile, Project } from '@/lib/types'

export default function SearchPage() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'creators' | 'projects'>('creators')
  const [creators, setCreators] = useState<Profile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    const q = query.toLowerCase().trim()

    if (tab === 'creators') {
      // Search by name, skills, genres
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${q}%,statement.ilike.%${q}%,skills.cs.{${q}},genres.cs.{${q}}`)
        .limit(20)
      setCreators(data || [])
    } else {
      const { data } = await supabase
        .from('projects')
        .select('*, profiles(*), collaboration_roles(*)')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%,genre.cs.{${q}}`)
        .limit(20)
      setProjects(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gem-gray-400)]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, skill, genre, or keyword..."
            className="!pl-10"
          />
        </div>
      </form>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(['creators', 'projects'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearched(false) }}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              tab === t
                ? 'bg-[var(--gem-gray-700)] text-white'
                : 'text-[var(--gem-gray-400)] hover:text-white'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Quick filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-1">
          {(tab === 'creators' ? SKILLS.slice(0, 12) : GENRES.slice(0, 12)).map(tag => (
            <button
              key={tag}
              onClick={() => { setQuery(tag); }}
              className="tag-pill text-[10px] hover:text-white"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <p className="text-center text-[var(--gem-gray-400)] py-12">Searching...</p>
      ) : searched ? (
        tab === 'creators' ? (
          creators.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {creators.map(c => <CreatorCard key={c.id} profile={c} />)}
            </div>
          ) : (
            <p className="text-center text-[var(--gem-gray-400)] py-12">No creators found for &ldquo;{query}&rdquo;</p>
          )
        ) : (
          projects.length > 0 ? (
            <div className="grid gap-4">
              {projects.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          ) : (
            <p className="text-center text-[var(--gem-gray-400)] py-12">No projects found for &ldquo;{query}&rdquo;</p>
          )
        )
      ) : (
        <p className="text-center text-[var(--gem-gray-400)] py-12">
          Search for creators by name or skill, or projects by title or genre.
        </p>
      )}
    </div>
  )
}
