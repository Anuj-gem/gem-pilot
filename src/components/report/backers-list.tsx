'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Loader2, Mail, Trash2 } from 'lucide-react'

interface Backer {
  id: string
  source: 'direct' | 'opportunity'
  amount: number
  status: string
  name: string
  avatar_url: string | null
  email: string | null
  user_id: string | null
  opportunity_title?: string | null
  created_at: string | null
}

interface Props {
  submissionId: string
  budgetTotal: number
  isOwner: boolean
  currentUserId: string | null
  ownerName: string | null
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`
  return `$${n.toLocaleString()}`
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`
}

export function BackersList({ submissionId, budgetTotal, isOwner, currentUserId, ownerName }: Props) {
  const [directBackers, setDirectBackers] = useState<Backer[]>([])
  const [opportunityBackers, setOpportunityBackers] = useState<Backer[]>([])
  const [loading, setLoading] = useState(true)

  // Add-self state
  const [addingSelf, setAddingSelf] = useState(false)
  const [selfAmount, setSelfAmount] = useState('')
  const [savingSelf, setSavingSelf] = useState(false)

  // Invite state
  const [inviting, setInviting] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteAmount, setInviteAmount] = useState('')
  const [savingInvite, setSavingInvite] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    fetchBackers()
  }, [submissionId])

  async function fetchBackers() {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/backers`)
      if (res.ok) {
        const data = await res.json()
        setDirectBackers(data.direct || [])
        setOpportunityBackers(data.opportunity || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const allBackers = [...directBackers, ...opportunityBackers]
  const totalBacked = allBackers.reduce((s, b) => s + (b.amount || 0), 0)
  const pct = budgetTotal > 0 ? Math.min(100, Math.round((totalBacked / budgetTotal) * 100)) : 0
  const selfBacker = directBackers.find(b => b.user_id === currentUserId)

  async function handleAddSelf() {
    const amt = parseInt(selfAmount.replace(/[^0-9]/g, ''), 10)
    if (!amt || isNaN(amt)) return
    setSavingSelf(true)
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/backers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_self', amount: amt }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed')
        return
      }
      setSelfAmount('')
      setAddingSelf(false)
      fetchBackers()
    } finally {
      setSavingSelf(false)
    }
  }

  async function handleInvite() {
    const amt = parseInt(inviteAmount.replace(/[^0-9]/g, ''), 10)
    if (!inviteEmail.trim()) return
    setSavingInvite(true)
    setError('')
    try {
      const res = await fetch(`/api/scripts/${submissionId}/backers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          email: inviteEmail.trim(),
          name: inviteName.trim() || null,
          amount: amt || 0,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed')
        return
      }
      setInviteName('')
      setInviteEmail('')
      setInviteAmount('')
      setInviting(false)
      fetchBackers()
    } finally {
      setSavingInvite(false)
    }
  }

  async function handleRemove(backerId: string) {
    setError('')
    await fetch(`/api/scripts/${submissionId}/backers?backerId=${backerId}`, {
      method: 'DELETE',
    })
    fetchBackers()
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-2xl p-5 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-600 font-medium">Funding</h3>
        {allBackers.length > 0 && (
          <span className="text-sm font-semibold" style={{ color: '#534AB7' }}>
            {allBackers.length} backer{allBackers.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {budgetTotal > 0 && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-gray-900">{fmt(totalBacked)}</span>
              <span className="text-sm text-gray-600 ml-1.5">of {fmt(budgetTotal)} goal</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: pct >= 100 ? '#15803d' : '#534AB7' }}>
              {pct}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#f0edf9' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct >= 100
                  ? 'linear-gradient(90deg, #15803d, #22c55e)'
                  : 'linear-gradient(90deg, #534AB7, #7C3AED)',
              }}
            />
          </div>
          {totalBacked < budgetTotal && totalBacked > 0 && (
            <p className="text-xs mt-1.5" style={{ color: '#78716C' }}>
              {fmt(budgetTotal - totalBacked)} to go
            </p>
          )}
        </div>
      )}

      {/* Backer list */}
      {allBackers.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {allBackers.map(backer => (
            <div
              key={backer.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl group/backer"
              style={{
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {/* Avatar */}
              {backer.avatar_url ? (
                <img src={backer.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                  style={{ background: 'rgba(83,74,183,0.12)', color: '#534AB7' }}
                >
                  {backer.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-gray-900 truncate">
                    {backer.name}
                    {backer.user_id === currentUserId ? ' (you)' : ''}
                  </span>
                  {backer.source === 'opportunity' && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#EEEDFE', color: '#534AB7' }}
                    >
                      via opportunity
                    </span>
                  )}
                  {backer.status === 'pending' && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#fffbeb', color: '#92400e' }}
                    >
                      pending
                    </span>
                  )}
                  {backer.status === 'considering' && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#fffbeb', color: '#92400e' }}
                    >
                      considering
                    </span>
                  )}
                </div>
                {backer.email && backer.source === 'direct' && (
                  <p className="text-[12px] m-0 mt-0.5 truncate" style={{ color: '#78716C' }}>{backer.email}</p>
                )}
              </div>

              {/* Amount */}
              {backer.amount > 0 && (
                <span className="text-[16px] font-bold shrink-0" style={{ color: '#15803d' }}>
                  {fmt(backer.amount)}
                </span>
              )}

              {/* Remove button (owner only, direct backers only) */}
              {isOwner && backer.source === 'direct' && (
                <button
                  onClick={() => handleRemove(backer.id)}
                  className="opacity-0 group-hover/backer:opacity-100 transition-opacity px-1.5 py-1 rounded cursor-pointer border-0 bg-transparent"
                  style={{ color: '#A8A29E' }}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Owner actions: add self + invite */}
      {isOwner && (
        <div className="flex flex-col gap-2">
          {/* Add self */}
          {!selfBacker && !addingSelf && (
            <button
              onClick={() => setAddingSelf(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-all w-full justify-center"
              style={{
                background: 'rgba(83,74,183,0.08)',
                color: '#534AB7',
                border: '1px solid rgba(83,74,183,0.15)',
              }}
            >
              <Plus size={16} />
              Add yourself as backer
            </button>
          )}

          {addingSelf && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: '#f5f5f4', border: '1px solid #d6d3d1' }}
            >
              <span className="text-[13px] text-gray-600 shrink-0">Your amount</span>
              <input
                type="text"
                placeholder="$10,000"
                value={selfAmount}
                onChange={e => setSelfAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSelf()}
                className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none border border-gray-200 focus:border-[#534AB7]"
                autoFocus
              />
              <button
                onClick={handleAddSelf}
                disabled={savingSelf}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-0 text-white disabled:opacity-50 shrink-0"
                style={{ background: '#534AB7' }}
              >
                {savingSelf ? <Loader2 size={13} className="animate-spin" /> : 'Add'}
              </button>
              <button
                onClick={() => { setAddingSelf(false); setSelfAmount('') }}
                className="p-1.5 rounded cursor-pointer border-0 bg-transparent"
                style={{ color: '#78716c' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Invite backer */}
          {!inviting && (
            <button
              onClick={() => setInviting(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-all w-full justify-center"
              style={{
                background: 'rgba(0,0,0,0.04)',
                color: '#57534E',
                border: '1px solid rgba(0,0,0,0.10)',
              }}
            >
              <Mail size={16} />
              Invite a backer
            </button>
          )}

          {inviting && (
            <div
              className="px-4 py-3 rounded-xl space-y-2"
              style={{ background: '#f5f5f4', border: '1px solid #d6d3d1' }}
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none border border-gray-200 focus:border-[#534AB7]"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Amount"
                  value={inviteAmount}
                  onChange={e => setInviteAmount(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded-lg text-[13px] outline-none border border-gray-200 focus:border-[#534AB7] text-right"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none border border-gray-200 focus:border-[#534AB7]"
                />
                <button
                  onClick={handleInvite}
                  disabled={savingInvite || !inviteEmail.trim()}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-0 text-white disabled:opacity-50 shrink-0"
                  style={{ background: '#534AB7' }}
                >
                  {savingInvite ? <Loader2 size={13} className="animate-spin" /> : 'Invite'}
                </button>
                <button
                  onClick={() => { setInviting(false); setInviteName(''); setInviteEmail(''); setInviteAmount('') }}
                  className="p-1.5 rounded cursor-pointer border-0 bg-transparent"
                  style={{ color: '#78716c' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state for visitors */}
      {!isOwner && allBackers.length === 0 && (
        <p className="text-[13px] m-0" style={{ color: '#78716C' }}>
          No backers yet.
        </p>
      )}

      {error && <p className="text-[12px] text-red-500 mt-2 mb-0">{error}</p>}
    </div>
  )
}
