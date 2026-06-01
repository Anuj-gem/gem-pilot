'use client'

import { useState, useEffect } from 'react'
import { Plus, UserCheck, UserPlus, X, Loader2, Trash2, Mail, Lock } from 'lucide-react'

interface CrewRole {
  id: string
  role_name: string
  assigned_user_id: string | null
  collaborator_row_id: string | null
  sort_order: number
  profile: {
    full_name: string | null
    avatar_url: string | null
    headline: string | null
  } | null
  collaborator: {
    email: string
    profile: any
    status: string
  } | null
}

interface Props {
  submissionId: string
  isOwner: boolean
  currentUserId: string | null
  ownerProfile: {
    full_name: string | null
    avatar_url: string | null
    headline: string | null
  } | null
}

export function CrewSection({ submissionId, isOwner, currentUserId, ownerProfile }: Props) {
  const [roles, setRoles] = useState<CrewRole[]>([])
  const [loading, setLoading] = useState(true)
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Invite state
  const [inviteRoleId, setInviteRoleId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [submissionId])

  async function fetchRoles() {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew`)
      if (res.ok) {
        const data = await res.json()
        setRoles(data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: newRoleName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add')
        return
      }
      setNewRoleName('')
      setAddingRole(false)
      fetchRoles()
    } finally {
      setSaving(false)
    }
  }

  async function handleSelfAssign(roleId: string) {
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId, action: 'self_assign' }),
      })
      if (res.ok) fetchRoles()
    } catch {}
  }

  async function handleUnassign(roleId: string) {
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId, action: 'unassign' }),
      })
      if (res.ok) fetchRoles()
    } catch {}
  }

  async function handleInvite(roleId: string) {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError('')
    try {
      // Use the existing collaborator invite API, then link to crew role
      const res = await fetch(`/api/scripts/${submissionId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: 'other',
          role_other: roles.find(r => r.id === roleId)?.role_name || 'Crew',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to invite')
        return
      }

      // Link the collaborator row to the crew role
      await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: roleId,
          action: 'link_collaborator',
          collaborator_row_id: data.id,
        }),
      })

      setInviteEmail('')
      setInviteRoleId(null)
      fetchRoles()
    } finally {
      setInviting(false)
    }
  }

  async function handleDeleteRole(roleId: string) {
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew?roleId=${roleId}`, {
        method: 'DELETE',
      })
      if (res.ok) fetchRoles()
    } catch {}
  }

  if (loading) return null

  // For visitors: only show filled roles
  const visibleRoles = isOwner ? roles : roles.filter(r => r.assigned_user_id || (r.collaborator && r.collaborator.status === 'accepted'))

  if (!isOwner && visibleRoles.length === 0) return null

  // Pending invites (owner-only private section)
  const pendingRoles = roles.filter(r => r.collaborator && r.collaborator.status === 'pending')

  return (
    <div>
      <h2
        className="text-[15px] font-bold uppercase tracking-[0.14em] m-0 mb-4"
        style={{ color: 'var(--gem-gold)' }}
      >
        🎬 Crew
        <span style={{ color: '#A8A29E' }}> ({visibleRoles.length})</span>
      </h2>

      {/* Role slots */}
      <div className="flex flex-col gap-2 mb-3">
        {(isOwner ? roles : visibleRoles).map(role => (
          <RoleSlot
            key={role.id}
            role={role}
            isOwner={isOwner}
            currentUserId={currentUserId}
            ownerProfile={ownerProfile}
            onSelfAssign={() => handleSelfAssign(role.id)}
            onUnassign={() => handleUnassign(role.id)}
            onInviteClick={() => {
              setInviteRoleId(inviteRoleId === role.id ? null : role.id)
              setInviteEmail('')
            }}
            onDelete={() => handleDeleteRole(role.id)}
            inviteOpen={inviteRoleId === role.id}
            inviteEmail={inviteEmail}
            onInviteEmailChange={setInviteEmail}
            onInviteSubmit={() => handleInvite(role.id)}
            inviting={inviting}
          />
        ))}
      </div>

      {/* Add Role button (owner only) */}
      {isOwner && (
        <div className="mb-3">
          {addingRole ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                placeholder="Role name (e.g. Cinematographer)"
                maxLength={60}
                className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{
                  background: '#f5f5f4',
                  border: '1px solid #d6d3d1',
                  color: '#1c1917',
                }}
                autoFocus
              />
              <button
                onClick={handleAddRole}
                disabled={saving || !newRoleName.trim()}
                className="px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 disabled:opacity-50 text-white shrink-0"
                style={{ background: '#7c3aed' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
              </button>
              <button
                onClick={() => { setAddingRole(false); setNewRoleName('') }}
                className="p-2 rounded-lg cursor-pointer border-0 bg-transparent"
                style={{ color: '#78716c' }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingRole(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-all"
              style={{
                background: 'rgba(0,0,0,0.04)',
                color: '#57534E',
                border: '1px solid rgba(0,0,0,0.10)',
              }}
            >
              <Plus size={16} />
              Add Role
            </button>
          )}
        </div>
      )}

      {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}

      {/* Pending invites — private to owner */}
      {isOwner && pendingRoles.length > 0 && (
        <div
          className="mt-4 p-3 rounded-lg"
          style={{ background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock size={12} style={{ color: '#7C3AED' }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#7C3AED' }}>
              Private to you
            </span>
          </div>
          <table className="w-full text-[13px]" style={{ color: '#44403C' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <th className="text-left py-1.5 font-semibold" style={{ color: '#78716C' }}>Invite</th>
                <th className="text-left py-1.5 font-semibold" style={{ color: '#78716C' }}>Role</th>
                <th className="text-left py-1.5 font-semibold" style={{ color: '#78716C' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingRoles.map(role => (
                <tr key={role.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <td className="py-1.5">{role.collaborator?.email || '—'}</td>
                  <td className="py-1.5">{role.role_name}</td>
                  <td className="py-1.5">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}
                    >
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Individual Role Slot ── */
function RoleSlot({
  role,
  isOwner,
  currentUserId,
  ownerProfile,
  onSelfAssign,
  onUnassign,
  onInviteClick,
  onDelete,
  inviteOpen,
  inviteEmail,
  onInviteEmailChange,
  onInviteSubmit,
  inviting,
}: {
  role: CrewRole
  isOwner: boolean
  currentUserId: string | null
  ownerProfile: Props['ownerProfile']
  onSelfAssign: () => void
  onUnassign: () => void
  onInviteClick: () => void
  onDelete: () => void
  inviteOpen: boolean
  inviteEmail: string
  onInviteEmailChange: (v: string) => void
  onInviteSubmit: () => void
  inviting: boolean
}) {
  const isSelfAssigned = role.assigned_user_id === currentUserId
  const isFilled = role.assigned_user_id || (role.collaborator && role.collaborator.status === 'accepted')

  // Determine display name and avatar
  let displayName = ''
  let avatar: string | null = null

  if (role.assigned_user_id && role.profile) {
    displayName = role.profile.full_name || 'You'
    avatar = role.profile.avatar_url
  } else if (role.collaborator?.status === 'accepted' && role.collaborator.profile) {
    displayName = role.collaborator.profile.full_name || role.collaborator.email
    avatar = role.collaborator.profile.avatar_url
  } else if (role.collaborator?.status === 'pending') {
    displayName = '' // Will show as open with pending indicator
  }

  return (
    <div>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl group/slot"
        style={{
          background: isFilled ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.015)',
          border: isFilled ? '1px solid rgba(0,0,0,0.06)' : '1px dashed rgba(0,0,0,0.12)',
        }}
      >
        {/* Avatar or open circle */}
        {isFilled && avatar ? (
          <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : isFilled ? (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1px dashed rgba(0,0,0,0.15)' }}
          >
            <UserPlus size={16} style={{ color: '#A8A29E' }} />
          </div>
        )}

        {/* Role name + person */}
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold" style={{ color: '#7C3AED' }}>
            {role.role_name}
          </span>
          {isFilled && displayName && (
            <span className="text-[14px] font-medium ml-2" style={{ color: '#1C1917' }}>
              {displayName}
            </span>
          )}
          {!isFilled && role.collaborator?.status === 'pending' && isOwner && (
            <span className="text-[12px] italic ml-2" style={{ color: '#D97706' }}>
              invite pending
            </span>
          )}
          {!isFilled && !role.collaborator && (
            <span className="text-[13px] ml-2" style={{ color: '#A8A29E' }}>
              Open
            </span>
          )}
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex items-center gap-1 opacity-0 group-hover/slot:opacity-100 transition-opacity">
            {!isFilled && !role.collaborator && (
              <>
                <button
                  onClick={onSelfAssign}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-0 transition-colors"
                  style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
                  title="Assign myself"
                >
                  <UserCheck size={14} />
                </button>
                <button
                  onClick={onInviteClick}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-0 transition-colors"
                  style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
                  title="Invite someone"
                >
                  <Mail size={14} />
                </button>
              </>
            )}
            {(isFilled || role.collaborator?.status === 'pending') && (
              <button
                onClick={onUnassign}
                className="px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer border-0 transition-colors"
                style={{ background: 'rgba(239,68,68,0.06)', color: '#EF4444' }}
                title="Unassign"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={onDelete}
              className="px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer border-0 transition-colors"
              style={{ background: 'rgba(0,0,0,0.04)', color: '#A8A29E' }}
              title="Remove role"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Inline invite form */}
      {inviteOpen && isOwner && (
        <div className="flex items-center gap-2 mt-1.5 ml-13 pl-[52px]">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => onInviteEmailChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onInviteSubmit()}
            placeholder="Email address"
            className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: '#f5f5f4', border: '1px solid #d6d3d1', color: '#1c1917' }}
            autoFocus
          />
          <button
            onClick={onInviteSubmit}
            disabled={inviting || !inviteEmail.trim()}
            className="px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 disabled:opacity-50 text-white shrink-0"
            style={{ background: '#7c3aed' }}
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Invite'}
          </button>
        </div>
      )}
    </div>
  )
}
