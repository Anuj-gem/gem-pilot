'use client'

// CollaboratorsSection — sits below "View categories" on the report page.
// Owner can add collaborators by email. Invited users see accept/decline bar.

import { useState, useEffect } from 'react'
import { UserPlus, Check, X, Loader2 } from 'lucide-react'

interface Collaborator {
  id: string
  collaborator_email: string
  collaborator_id: string | null
  status: 'pending' | 'accepted' | 'declined'
  role: string
  created_at: string
  profile: {
    full_name: string | null
    avatar_url: string | null
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
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [showInput, setShowInput] = useState(false)

  // Find pending invitation for the current user (if any)
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
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add')
        return
      }
      setEmail('')
      setShowInput(false)
      fetchCollaborators()
    } catch {
      setError('Failed to add collaborator')
    } finally {
      setAdding(false)
    }
  }

  async function handleRespond(collabId: string, status: 'accepted' | 'declined') {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/collaborators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborator_id: collabId, status }),
      })
      if (res.ok) {
        fetchCollaborators()
      }
    } catch {}
  }

  // Filter to show: accepted collaborators always, pending if owner
  const visibleCollabs = collaborators.filter(
    c => c.status === 'accepted' || (isOwner && c.status === 'pending')
  )

  if (loading) return null

  return (
    <>
      {/* Collaborators section — below categories */}
      <div className="mt-4">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          {visibleCollabs.length > 0 && (
            <span className="text-[13px] font-medium text-[var(--gem-gray-400)]">
              Collaborators
            </span>
          )}
          {isOwner && (
            <button
              onClick={() => setShowInput(v => !v)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-0 bg-transparent transition-colors"
              style={{
                color: showInput ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
              }}
            >
              <UserPlus size={14} />
              {visibleCollabs.length === 0 ? 'Add collaborators' : 'Add'}
            </button>
          )}
        </div>

        {/* Email input */}
        {isOwner && showInput && (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Email address"
              className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
              }}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={adding || !email.trim()}
              className="px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-0 disabled:opacity-50 transition-colors text-white"
              style={{ background: '#7c3aed' }}
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : 'Invite'}
            </button>
          </div>
        )}
        {error && (
          <p className="text-[12px] text-red-400 mb-2">{error}</p>
        )}

        {/* Collaborator list */}
        {visibleCollabs.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {visibleCollabs.map(c => (
              <CollaboratorChip key={c.id} collaborator={c} isOwner={isOwner} />
            ))}
          </div>
        )}
      </div>

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

function CollaboratorChip({ collaborator, isOwner }: { collaborator: Collaborator; isOwner: boolean }) {
  const name = collaborator.profile?.full_name || collaborator.collaborator_email
  const avatar = collaborator.profile?.avatar_url
  const isPending = collaborator.status === 'pending'

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="w-5 h-5 rounded-full object-cover"
        />
      ) : (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            background: 'rgba(124,58,237,0.3)',
            color: '#c4b5fd',
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-[12px] font-medium text-white/80">
        {name}
      </span>
      {isPending && isOwner && (
        <span className="text-[10px] text-white/40 italic">pending</span>
      )}
    </div>
  )
}
