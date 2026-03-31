'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TagInput from '@/components/tag-input'
import { GENRES, MEDIUMS, PROJECT_STATUSES, SKILLS } from '@/lib/types'
import { Plus, Trash2 } from 'lucide-react'

interface RoleDraft {
  title: string
  description: string
  skills_needed: string[]
}

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [medium, setMedium] = useState('')
  const [genre, setGenre] = useState<string[]>([])
  const [status, setStatus] = useState('concept')
  const [fundingNeeded, setFundingNeeded] = useState('')
  const [roles, setRoles] = useState<RoleDraft[]>([])

  const addRole = () => {
    setRoles([...roles, { title: '', description: '', skills_needed: [] }])
  }

  const updateRole = (index: number, updates: Partial<RoleDraft>) => {
    setRoles(roles.map((r, i) => i === index ? { ...r, ...updates } : r))
  }

  const removeRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        creator_id: user.id,
        title,
        description,
        medium: medium || null,
        genre,
        status,
        funding_needed: fundingNeeded || null,
      })
      .select()
      .single()

    if (error || !project) {
      setSaving(false)
      return
    }

    // Insert collaboration roles
    if (roles.length > 0) {
      await supabase.from('collaboration_roles').insert(
        roles.filter(r => r.title).map(r => ({
          project_id: project.id,
          title: r.title,
          description: r.description || null,
          skills_needed: r.skills_needed,
        }))
      )
    }

    router.push(`/projects/${project.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">New project</h1>
      <p className="text-sm text-[var(--gem-gray-400)] mb-8">
        Describe your vision and the collaborators you need.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="The working title of your project"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            placeholder="What's the vision? What are you building and why?"
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Medium</label>
            <select value={medium} onChange={e => setMedium(e.target.value)}>
              <option value="">Select...</option>
              {MEDIUMS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {PROJECT_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <TagInput label="Genre" tags={genre} onChange={setGenre} suggestions={GENRES} />

        <div>
          <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">Funding needed</label>
          <textarea
            value={fundingNeeded}
            onChange={e => setFundingNeeded(e.target.value)}
            rows={2}
            placeholder="Optional — what funding do you need and what's it for?"
            className="resize-none"
          />
        </div>

        {/* Collaboration roles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-[var(--gem-gray-300)]">Collaboration roles needed</label>
            <button
              type="button"
              onClick={addRole}
              className="flex items-center gap-1 text-xs text-[var(--gem-accent)] hover:text-[var(--gem-accent-hover)]"
            >
              <Plus size={14} />
              Add role
            </button>
          </div>

          {roles.length === 0 && (
            <button
              type="button"
              onClick={addRole}
              className="w-full py-8 border border-dashed border-[var(--gem-gray-700)] rounded-xl text-sm text-[var(--gem-gray-400)] hover:border-[var(--gem-gray-500)] hover:text-[var(--gem-gray-300)] transition-colors"
            >
              + Add a collaboration role (e.g. Sound Designer, Composer)
            </button>
          )}

          <div className="space-y-4">
            {roles.map((role, i) => (
              <div key={i} className="border border-[var(--gem-gray-700)] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={role.title}
                    onChange={e => updateRole(i, { title: e.target.value })}
                    placeholder="Role title (e.g. Composer, Concept Artist)"
                    className="flex-1 !border-0 !bg-transparent !p-0 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => removeRole(i)}
                    className="p-1 text-[var(--gem-gray-500)] hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={role.description}
                  onChange={e => updateRole(i, { description: e.target.value })}
                  placeholder="What does this collaborator need to do?"
                  rows={2}
                  className="resize-none text-sm"
                />
                <TagInput
                  label="Skills needed"
                  tags={role.skills_needed}
                  onChange={skills_needed => updateRole(i, { skills_needed })}
                  suggestions={SKILLS}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !title}
          className="w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Creating...' : 'Create project'}
        </button>
      </form>
    </div>
  )
}
