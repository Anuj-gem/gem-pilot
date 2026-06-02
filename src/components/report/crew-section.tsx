'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Loader2, Trash2, UserPlus, ChevronDown, Mail } from 'lucide-react'

/* ── Types ── */

interface CrewRole {
  id: string
  role_name: string
  assigned_user_id: string | null
  collaborator_row_id: string | null
  sort_order: number
  role_category?: string
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

/** Someone who can be picked from the assign dropdown */
interface TeamMember {
  id: string // either a user id or collaborator row id
  type: 'owner' | 'user' | 'collaborator'
  userId: string | null
  collaboratorRowId: string | null
  name: string
  avatar: string | null
  email?: string
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
  category?: 'crew' | 'cast'
  characterNames?: string[]
  title?: string
  emoji?: string
}

/* ── Main Component ── */

export function CrewSection({
  submissionId,
  isOwner,
  currentUserId,
  ownerProfile,
  category = 'crew',
  characterNames = [],
  title,
  emoji,
}: Props) {
  const [roles, setRoles] = useState<CrewRole[]>([])
  const [loading, setLoading] = useState(true)
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sectionTitle = title || (category === 'cast' ? 'Cast' : 'Crew')
  const sectionEmoji = emoji || (category === 'cast' ? '🎭' : '🎬')

  // Build the team member list from ALL roles (crew + cast) on this project
  const [allProjectRoles, setAllProjectRoles] = useState<CrewRole[]>([])

  useEffect(() => {
    fetchRoles()
    fetchAllProjectMembers()
  }, [submissionId, category])

  async function fetchRoles() {
    try {
      let url = `/api/scripts/${submissionId}/crew?category=${category}`
      if (category === 'cast' && characterNames.length > 0) {
        url += `&characters=${encodeURIComponent(characterNames.join(','))}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRoles(data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllProjectMembers() {
    // Fetch both crew and cast roles to build the full team list
    const otherCategory = category === 'crew' ? 'cast' : 'crew'
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/scripts/${submissionId}/crew?category=${category}`),
        fetch(`/api/scripts/${submissionId}/crew?category=${otherCategory}`),
      ])
      const [data1, data2] = await Promise.all([
        res1.ok ? res1.json() : [],
        res2.ok ? res2.json() : [],
      ])
      setAllProjectRoles([...data1, ...data2])
    } catch {}
  }

  // Build the team member picker options
  function getTeamMembers(excludeRoleId: string): TeamMember[] {
    const members: TeamMember[] = []
    const seenUserIds = new Set<string>()
    const seenCollabIds = new Set<string>()

    // 1. Owner first
    if (currentUserId) {
      members.push({
        id: `owner-${currentUserId}`,
        type: 'owner',
        userId: currentUserId,
        collaboratorRowId: null,
        name: ownerProfile?.full_name || 'Me',
        avatar: ownerProfile?.avatar_url || null,
      })
      seenUserIds.add(currentUserId)
    }

    // 2. Collect everyone assigned to ANY role on this project
    for (const r of allProjectRoles) {
      if (r.id === excludeRoleId) continue

      // User directly assigned
      if (r.assigned_user_id && !seenUserIds.has(r.assigned_user_id) && r.profile) {
        members.push({
          id: `user-${r.assigned_user_id}`,
          type: 'user',
          userId: r.assigned_user_id,
          collaboratorRowId: null,
          name: r.profile.full_name || 'Team member',
          avatar: r.profile.avatar_url || null,
        })
        seenUserIds.add(r.assigned_user_id)
      }

      // Collaborator with accepted status
      if (r.collaborator_row_id && r.collaborator && !seenCollabIds.has(r.collaborator_row_id)) {
        if (r.collaborator.status === 'accepted') {
          const cProfile = r.collaborator.profile
          members.push({
            id: `collab-${r.collaborator_row_id}`,
            type: 'collaborator',
            userId: cProfile?.id || null,
            collaboratorRowId: r.collaborator_row_id,
            name: cProfile?.full_name || r.collaborator.email,
            avatar: cProfile?.avatar_url || null,
            email: r.collaborator.email,
          })
          seenCollabIds.add(r.collaborator_row_id)
        }
      }
    }

    return members
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: newRoleName.trim(), role_category: category }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add')
        return
      }
      setNewRoleName('')
      setAddingRole(false)
      fetchRoles()
      fetchAllProjectMembers()
    } finally {
      setSaving(false)
    }
  }

  async function handleAssignUser(roleId: string, userId: string) {
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId, action: 'self_assign' }),
      })
      if (res.ok) {
        fetchRoles()
        fetchAllProjectMembers()
      }
    } catch {}
  }

  async function handleAssignCollaborator(roleId: string, collaboratorRowId: string) {
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId, action: 'link_collaborator', collaborator_row_id: collaboratorRowId }),
      })
      if (res.ok) {
        fetchRoles()
        fetchAllProjectMembers()
      }
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
      if (res.ok) {
        fetchRoles()
        fetchAllProjectMembers()
      }
    } catch {}
  }

  async function handleInvite(roleId: string, email: string) {
    setError('')
    try {
      const roleName = roles.find(r => r.id === roleId)?.role_name || sectionTitle
      const res = await fetch(`/api/scripts/${submissionId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role: category === 'cast' ? 'actor' : 'other',
          role_other: roleName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to invite')
        return
      }

      // Link the collaborator row to the crew/cast role
      await fetch(`/api/scripts/${submissionId}/crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: roleId,
          action: 'link_collaborator',
          collaborator_row_id: data.id,
        }),
      })

      fetchRoles()
      fetchAllProjectMembers()
    } catch {}
  }

  async function handleDeleteRole(roleId: string) {
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/crew?roleId=${roleId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchRoles()
        fetchAllProjectMembers()
      }
    } catch {}
  }

  if (loading) return null

  const visibleRoles = isOwner ? roles : roles.filter(r => r.assigned_user_id || (r.collaborator && r.collaborator.status === 'accepted'))
  if (!isOwner && visibleRoles.length === 0) return null

  return (
    <div>
      <h2
        className="text-[15px] font-bold uppercase tracking-[0.14em] m-0 mb-4"
        style={{ color: 'var(--gem-gold)' }}
      >
        {sectionEmoji} {sectionTitle}
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
            teamMembers={getTeamMembers(role.id)}
            onAssignUser={(userId) => handleAssignUser(role.id, userId)}
            onAssignCollaborator={(collabId) => handleAssignCollaborator(role.id, collabId)}
            onUnassign={() => handleUnassign(role.id)}
            onInvite={(email) => handleInvite(role.id, email)}
            onDelete={() => handleDeleteRole(role.id)}
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
                placeholder={category === 'cast' ? 'Character name' : 'Role name (e.g. Cinematographer)'}
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
              {category === 'cast' ? 'Add Character' : 'Add Role'}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}
    </div>
  )
}

/* ── Individual Role Slot with assign dropdown ── */

function RoleSlot({
  role,
  isOwner,
  currentUserId,
  teamMembers,
  onAssignUser,
  onAssignCollaborator,
  onUnassign,
  onInvite,
  onDelete,
}: {
  role: CrewRole
  isOwner: boolean
  currentUserId: string | null
  teamMembers: TeamMember[]
  onAssignUser: (userId: string) => void
  onAssignCollaborator: (collabId: string) => void
  onUnassign: () => void
  onInvite: (email: string) => void
  onDelete: () => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [inviteMode, setInviteMode] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isFilled = role.assigned_user_id || (role.collaborator && role.collaborator.status === 'accepted')
  const isPending = role.collaborator?.status === 'pending' && !role.assigned_user_id

  // Determine display name and avatar
  let displayName = ''
  let avatar: string | null = null

  if (role.assigned_user_id && role.profile) {
    displayName = role.profile.full_name || 'Assigned'
    avatar = role.profile.avatar_url
  } else if (role.collaborator?.status === 'accepted' && role.collaborator.profile) {
    displayName = role.collaborator.profile.full_name || role.collaborator.email
    avatar = role.collaborator.profile.avatar_url
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setInviteMode(false)
        setInviteEmail('')
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [dropdownOpen])

  async function handleInviteSubmit() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    await onInvite(inviteEmail.trim())
    setInviting(false)
    setInviteEmail('')
    setInviteMode(false)
    setDropdownOpen(false)
  }

  function handlePickMember(member: TeamMember) {
    if (member.type === 'owner' || member.type === 'user') {
      if (member.userId) onAssignUser(member.userId)
    } else if (member.type === 'collaborator') {
      if (member.collaboratorRowId) onAssignCollaborator(member.collaboratorRowId)
    }
    setDropdownOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
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
          {isPending && isOwner && (
            <span className="text-[12px] italic ml-2" style={{ color: '#D97706' }}>
              invite pending
            </span>
          )}
          {!isFilled && !isPending && (
            <span className="text-[13px] ml-2" style={{ color: '#A8A29E' }}>
              Open
            </span>
          )}
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex items-center gap-1 opacity-0 group-hover/slot:opacity-100 transition-opacity">
            {/* The assign button — opens dropdown */}
            {!isFilled && !isPending && (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-0 transition-colors"
                style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
              >
                Assign <ChevronDown size={12} />
              </button>
            )}
            {/* Unassign */}
            {(isFilled || isPending) && (
              <button
                onClick={onUnassign}
                className="px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer border-0 transition-colors"
                style={{ background: 'rgba(239,68,68,0.06)', color: '#EF4444' }}
                title="Unassign"
              >
                <X size={14} />
              </button>
            )}
            {/* Delete role */}
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

      {/* ── Assign Dropdown ── */}
      {dropdownOpen && isOwner && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E7E5E4',
            minWidth: 240,
            maxWidth: 320,
          }}
        >
          {/* Team member list */}
          <div className="py-1">
            {teamMembers.map(member => (
              <button
                key={member.id}
                onClick={() => handlePickMember(member)}
                className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-0 bg-transparent text-left transition-colors hover:bg-stone-50"
              >
                {member.avatar ? (
                  <img src={member.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium m-0 truncate" style={{ color: '#1C1917' }}>
                    {member.name}{member.type === 'owner' ? ' (you)' : ''}
                  </p>
                  {member.email && (
                    <p className="text-[11px] m-0 truncate" style={{ color: '#78716C' }}>
                      {member.email}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #E7E5E4' }} />

          {/* Invite new person */}
          {!inviteMode ? (
            <button
              onClick={() => setInviteMode(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-0 bg-transparent text-left transition-colors hover:bg-stone-50"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.08)' }}
              >
                <Mail size={13} style={{ color: '#7C3AED' }} />
              </div>
              <span className="text-[13px] font-medium" style={{ color: '#7C3AED' }}>
                Invite new person
              </span>
            </button>
          ) : (
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleInviteSubmit()
                    if (e.key === 'Escape') { setInviteMode(false); setInviteEmail('') }
                  }}
                  placeholder="Email address"
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
                  style={{ background: '#f5f5f4', border: '1px solid #d6d3d1', color: '#1c1917' }}
                  autoFocus
                />
                <button
                  onClick={handleInviteSubmit}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-3 py-2 rounded-lg text-[12px] font-semibold cursor-pointer border-0 disabled:opacity-50 text-white shrink-0"
                  style={{ background: '#7c3aed' }}
                >
                  {inviting ? <Loader2 size={13} className="animate-spin" /> : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
