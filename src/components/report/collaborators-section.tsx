'use client'

// CollaboratorsSection — "People attached" on the report page.
// Owner: sees section always (even when empty), can add/edit/remove.
// Non-owner: only sees if there are accepted collaborators.
// Collaborator: can remove themselves.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Check, X, Loader2, Pencil, Trash2, ChevronDown } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'producer', label: 'Producer' },
  { value: 'talent_representative', label: 'Talent Representative' },
  { value: 'actor', label: 'Actor' },
  { value: 'director', label: 'Director' },
  { value: 'other', label: 'Other' },
] as const

function roleLabel(role: string, roleOther?: string | null) {
  if (role === 'other' && roleOther) return roleOther
  return ROLE_OPTIONS.find(r => r.value === role)?.label ?? role
}

interface Collaborator {
  id: string
  collaborator_email: string
  collaborator_id: string | null
  status: 'pending' | 'accepted' | 'declined'
  role: string
  role_other: string | null
  created_at: string
  profile: {
    full_name: string | null
    avatar_url: string | null
    headline: string | null
  } | null
}

interface Props {
  submissionId: string
  isOwner: boolean
  currentUserEmail: string | null
  currentUserId: string | null
}

export function CollaboratorsSection({
  submissionId,
  isOwner,
  currentUserEmail,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('producer')
  const [roleOther, setRoleOther] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editRoleOther, setEditRoleOther] = useState('')
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [confirmIsSelf, setConfirmIsSelf] = useState(false)

  const myPendingInvite = collaborators.find(
    c =>
      c.status === 'pending' &&
      (c.collaborator_id === currentUserId ||
        c.collaborator_email === currentUserEmail)
  )

  useEffect(() => {
    fetchCollaborators()
  }, [submissionId])

  async function fetchCollaborators() {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/collaborators`)
      if (res.ok) {
        const data = await res.json()
        setCollaborators(data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!email.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/collaborators`, {
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
      setShowInput(false)
      fetchCollaborators()
    } catch {
      setError('Failed to add')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(collabId: string, isSelf: boolean) {
    setError('')
    try {
      const res = await fetch(
        `/api/scripts/${submissionId}/collaborators?collabId=${collabId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to remove')
        return
      }
      if (isSelf) {
        router.push('/dashboard')
      } else {
        fetchCollaborators()
      }
    } catch {
      setError('Failed to remove')
    }
  }

  async function handleEditRole(collabId: string) {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/collaborators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaborator_id: collabId,
          role: editRole,
          role_other: editRole === 'other' ? editRoleOther.trim() : undefined,
        }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchCollaborators()
      }
    } catch {}
  }

  async function handleRespond(collabId: string, status: 'accepted' | 'declined') {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/collaborators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborator_id: collabId, status }),
      })
      if (res.ok) fetchCollaborators()
    } catch {}
  }

  // Visible collabs: accepted always, pending if owner
  const visibleCollabs = collaborators.filter(
    c => c.status === 'accepted' || (isOwner && c.status === 'pending')
  )

  if (loading) return null

  // Non-owners: hide entire section when no visible collabs AND no pending invite
  if (!isOwner && visibleCollabs.length === 0 && !myPendingInvite) return null

  const count = visibleCollabs.length

  return (
    <>
      <div className="mt-1">
        {/* Add button — prominent for owners */}
        {isOwner && (
          <div className="mb-3">
            <button
              onClick={() => setShowInput(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-all"
              style={{
                background: showInput ? 'rgba(139,92,246,0.12)' : 'rgba(0,0,0,0.04)',
                color: showInput ? '#7C3AED' : '#57534E',
                border: showInput ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(0,0,0,0.10)',
              }}
            >
              <UserPlus size={16} />
              {showInput ? 'Cancel' : 'Add Person'}
            </button>
          </div>
        )}

        {/* Add form */}
        {isOwner && showInput && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Email address"
                className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{
                  background: '#f5f5f4',
                  border: '1px solid #d6d3d1',
                  color: '#1c1917',
                }}
                autoFocus
              />
              <RoleSelect value={role} onChange={setRole} />
              <button
                onClick={handleAdd}
                disabled={adding || !email.trim()}
                className="px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 disabled:opacity-50 transition-colors text-white shrink-0"
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
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{
                  background: '#f5f5f4',
                  border: '1px solid #d6d3d1',
                  color: '#1c1917',
                }}
              />
            )}
          </div>
        )}
        {error && (
          <p className="text-[12px] text-red-400 mb-2">{error}</p>
        )}

        {/* Collaborator chips */}
        {visibleCollabs.length > 0 && (
          <div className="flex flex-col gap-3">
            {visibleCollabs.map(c => {
              const isSelf =
                c.collaborator_id === currentUserId ||
                c.collaborator_email === currentUserEmail
              const isEditing = editingId === c.id

              if (isEditing && isOwner) {
                return (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(0,0,0,0.03)',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}
                  >
                    <RoleSelect value={editRole} onChange={setEditRole} />
                    {editRole === 'other' && (
                      <input
                        type="text"
                        value={editRoleOther}
                        onChange={e => setEditRoleOther(e.target.value)}
                        placeholder="Role"
                        maxLength={60}
                        className="px-2 py-0.5 rounded text-[12px] outline-none w-24"
                        style={{
                          background: 'rgba(0,0,0,0.04)',
                          border: '1px solid rgba(0,0,0,0.10)',
                          color: '#1C1917',
                        }}
                      />
                    )}
                    <button
                      onClick={() => handleEditRole(c.id)}
                      className="text-[11px] font-semibold bg-transparent border-0 cursor-pointer"
                      style={{ color: '#7C3AED' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[11px] bg-transparent border-0 cursor-pointer"
                      style={{ color: '#78716C' }}
                    >
                      Cancel
                    </button>
                  </div>
                )
              }

              return (
                <CollaboratorChip
                  key={c.id}
                  collaborator={c}
                  isOwner={isOwner}
                  isSelf={isSelf}
                  onEdit={() => {
                    setEditingId(c.id)
                    setEditRole(c.role)
                    setEditRoleOther(c.role_other || '')
                  }}
                  onRemove={() => {
                    if (isSelf && !isOwner) {
                      setConfirmRemoveId(c.id)
                      setConfirmIsSelf(true)
                    } else {
                      handleRemove(c.id, false)
                    }
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Empty state handled by parent (0) count — no text needed */}
      </div>

      {/* Confirmation dialog for self-removal */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center gem-no-print" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="mx-4 max-w-sm w-full rounded-xl p-5" style={{ background: '#1d1932', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-[14px] text-white/90 m-0 mb-4">
              This will revoke your access to this script. You will no longer be listed as attached.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setConfirmRemoveId(null); setConfirmIsSelf(false) }}
                className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer border-0 transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRemove(confirmRemoveId, confirmIsSelf)
                  setConfirmRemoveId(null)
                  setConfirmIsSelf(false)
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-colors text-white"
                style={{ background: '#dc2626' }}
              >
                Remove myself
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept/Decline bar for invited users */}
      {myPendingInvite && !isOwner && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 gem-no-print"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(17,15,29,0.95) 20%)',
          }}
        >
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <p className="text-[14px] text-white/80 m-0">
              You&apos;ve been invited to collaborate on this project.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleRespond(myPendingInvite.id, 'declined')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer border-0 transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <X size={14} />
                Decline
              </button>
              <button
                onClick={() => handleRespond(myPendingInvite.id, 'accepted')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-colors text-white"
                style={{ background: '#7c3aed' }}
              >
                <Check size={14} />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Role dropdown ── */
function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-2.5 pr-6 py-2 rounded-lg text-[12px] font-medium outline-none cursor-pointer"
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
  )
}

/* ── Collaborator Card ── */
function CollaboratorChip({
  collaborator,
  isOwner,
  isSelf,
  onEdit,
  onRemove,
}: {
  collaborator: Collaborator
  isOwner: boolean
  isSelf: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const name = collaborator.profile?.full_name || collaborator.collaborator_email
  const avatar = collaborator.profile?.avatar_url
  const headline = collaborator.profile?.headline
  const isPending = collaborator.status === 'pending'
  const showRole = collaborator.role && collaborator.role !== 'collaborator'
  const canRemove = isOwner || isSelf

  return (
    <div
      className="flex items-center gap-5 px-6 py-5 group/chip"
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.10)',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {avatar ? (
        <img src={avatar} alt="" className="w-[72px] h-[72px] rounded-full object-cover flex-shrink-0" />
      ) : (
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[28px] font-bold flex-shrink-0"
          style={{ background: 'rgba(124,58,237,0.25)', color: '#c4b5fd' }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[22px] font-bold text-white">{name}</span>
          {showRole && (
            <span
              className="text-[14px] font-semibold px-3 py-1 flex-shrink-0"
              style={{
                background: 'rgba(124,58,237,0.2)',
                color: '#c4b5fd',
                borderRadius: 4,
              }}
            >
              {roleLabel(collaborator.role, collaborator.role_other)}
            </span>
          )}
          {isPending && isOwner && (
            <span className="text-[13px] text-white/40 italic">pending</span>
          )}
          {/* Owner actions: edit + remove */}
          {isOwner && !isPending && (
            <button
              onClick={onEdit}
              className="opacity-0 group-hover/chip:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer p-0"
              title="Edit role"
            >
              <Pencil size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              className="opacity-0 group-hover/chip:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer p-0"
              title={isSelf && !isOwner ? 'Remove yourself' : 'Remove'}
            >
              <Trash2 size={14} style={{ color: 'rgba(255,107,107,0.6)' }} />
            </button>
          )}
        </div>
        {headline && (
          <p className="text-[16px] m-0 mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {headline}
          </p>
        )}
      </div>
    </div>
  )
}
