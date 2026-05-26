'use client'

// AddCollaboratorButton — inline "🧑 + Add collaborators (N)" button
// that opens a small overlay to invite by email + role.
// Used on script cards (dashboard + scripts page).

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'producer', label: 'Producer' },
  { value: 'talent_representative', label: 'Talent Representative' },
  { value: 'actor', label: 'Actor' },
  { value: 'director', label: 'Director' },
  { value: 'other', label: 'Other' },
] as const

interface Props {
  scriptId: string
  collaboratorCount: number
}

export function AddCollaboratorButton({ scriptId, collaboratorCount }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('producer')
  const [roleOther, setRoleOther] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setError('')
        setSuccess('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleAdd() {
    if (!email.trim()) return
    setAdding(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/scripts/${scriptId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role,
          role_other: role === 'other' ? roleOther.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add')
        return
      }
      setEmail('')
      setRole('producer')
      setRoleOther('')
      setSuccess('Invite sent — they\'ve received an email inviting them to collaborate with you.')
      router.refresh()
      setTimeout(() => {
        setSuccess('')
        setOpen(false)
      }, 3000)
    } catch {
      setError('Failed to add')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold cursor-pointer border-0 transition-colors shrink-0"
        style={{
          background: open ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)',
          color: '#a78bfa',
          border: open ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(124,58,237,0.25)',
        }}
      >
        <span className="text-[13px]">🧑</span>
        <span>+ Add collaborators</span>
        {collaboratorCount > 0 && (
          <span style={{ color: 'rgba(167,139,250,0.7)' }}>({collaboratorCount})</span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-[320px] rounded-xl p-4"
          style={{
            background: '#1d1932',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[13px] font-semibold text-white m-0 mb-3">Add a collaborator</p>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Email address"
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none mb-2"
            style={{
              background: '#f5f5f4',
              border: '1px solid #d6d3d1',
              color: '#1c1917',
            }}
            autoFocus
          />

          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full appearance-none pl-2.5 pr-6 py-2 rounded-lg text-[12px] font-medium outline-none cursor-pointer"
                style={{
                  background: '#f5f5f4',
                  border: '1px solid #d6d3d1',
                  color: '#1c1917',
                }}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value} style={{ background: '#fff', color: '#1c1917' }}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#78716c' }}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !email.trim()}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 disabled:opacity-50 transition-colors text-white shrink-0"
              style={{ background: '#7c3aed' }}
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : 'Invite'}
            </button>
          </div>

          {role === 'other' && (
            <input
              type="text"
              value={roleOther}
              onChange={e => setRoleOther(e.target.value)}
              placeholder="Describe role (max 60 chars)"
              maxLength={60}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none mb-2"
              style={{
                background: '#f5f5f4',
                border: '1px solid #d6d3d1',
                color: '#1c1917',
              }}
            />
          )}

          {error && <p className="text-[12px] text-red-400 m-0 mt-1">{error}</p>}
          {success && <p className="text-[12px] m-0 mt-1" style={{ color: '#34d399' }}>{success}</p>}
        </div>
      )}
    </div>
  )
}
