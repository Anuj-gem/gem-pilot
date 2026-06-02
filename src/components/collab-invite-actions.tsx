'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

interface Invite {
  id: string
  submissionId: string
  role: string
  status: string
}

export function CollabInviteActions({ invites }: { invites: Invite[] }) {
  const [responded, setResponded] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function handleRespond(invite: Invite, status: 'accepted' | 'declined') {
    setLoading(prev => ({ ...prev, [invite.id]: true }))
    try {
      const res = await fetch(`/api/scripts/${invite.submissionId}/collaborators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborator_id: invite.id, status }),
      })
      if (res.ok) {
        setResponded(prev => ({ ...prev, [invite.id]: status }))
      }
    } finally {
      setLoading(prev => ({ ...prev, [invite.id]: false }))
    }
  }

  const pending = invites.filter(inv => inv.status === 'pending' && !responded[inv.id])
  if (pending.length === 0) return null

  return (
    <div
      style={{
        background: 'rgba(124,58,237,0.08)',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 6,
        padding: '12px 16px',
        marginBottom: 16,
      }}
    >
      <p style={{ color: '#c4b5fd', fontSize: 14, fontWeight: 600, margin: '0 0 10px' }}>
        {pending.length === 1
          ? `You've been invited as ${pending[0].role}`
          : `You have ${pending.length} pending invites`}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map(inv => {
          const isLoading = loading[inv.id]
          return (
            <div
              key={inv.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'capitalize',
                }}
              >
                {inv.role}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleRespond(inv, 'declined')}
                  disabled={isLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.6)',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  <X size={13} />
                  Decline
                </button>
                <button
                  onClick={() => handleRespond(inv, 'accepted')}
                  disabled={isLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: '#7c3aed',
                    color: '#fff',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  <Check size={13} />
                  Accept
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show responded items */}
      {Object.entries(responded).map(([id, status]) => {
        const inv = invites.find(i => i.id === id)
        if (!inv) return null
        return (
          <div
            key={id}
            style={{
              marginTop: 6,
              fontSize: 12,
              color: status === 'accepted' ? '#a78bfa' : 'rgba(255,255,255,0.4)',
            }}
          >
            {status === 'accepted' ? '✓' : '✗'} {inv.role} — {status}
          </div>
        )
      })}
    </div>
  )
}
