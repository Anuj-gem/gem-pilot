'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AddCollaboratorButton } from './add-collaborator-button'
import { DiscoverToggle } from './discover-toggle'

type CollabInfo = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: string
  status: string
}

type Props = {
  scriptId: string
  isPublic: boolean
  collaboratorCount: number
  collaborators?: CollabInfo[]
  availableOppCount: number
  pendingAppCount: number
  heat: number
  isCollab: boolean
  isAnon?: boolean
  qualifyingOpps?: { id: string; title: string; slug: string; subtitle: string | null }[]
}

export function GrowHeatSection({
  scriptId,
  isPublic,
  collaboratorCount,
  collaborators = [],
  availableOppCount,
  pendingAppCount,
  heat,
  isCollab,
  isAnon,
  qualifyingOpps = [],
}: Props) {
  const router = useRouter()
  const [oppsExpanded, setOppsExpanded] = useState(false)
  const [collabsExpanded, setCollabsExpanded] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const accepted = collaborators.filter(c => c.status === 'accepted')
  const pending = collaborators.filter(c => c.status === 'pending')
  const totalCount = accepted.length + pending.length
  const allCollabs = [...accepted, ...pending]
  const MAX_VISIBLE = 4

  async function handleRemove(collabId: string) {
    setRemoving(collabId)
    try {
      await fetch(`/api/scripts/${scriptId}/collaborators?collabId=${collabId}`, { method: 'DELETE' })
      router.refresh()
    } catch {
      // silent
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 8 }}>
      {/* Header */}
      <div className="flex items-center gap-1.5 pt-2.5 pb-1">
        <span className="text-[12px] font-semibold" style={{ color: '#111827' }}>Grow your heat</span>
        <span className="text-[11px]">🔥</span>
      </div>

      <div className="space-y-1.5 pb-2">
        {/* Collaborators */}
        {!isCollab && (
          <div className="px-2.5 py-1.5" style={{ background: '#fafafa', borderRadius: 6 }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] shrink-0">🧑</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold m-0" style={{ color: '#111827' }}>
                  Collaborators
                  <span className="font-normal" style={{ color: '#6b7280' }}> ({totalCount})</span>
                </p>
                <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6b7280' }}>+1 🔥 heat each</p>
              </div>
              <AddCollaboratorButton scriptId={scriptId} collaboratorCount={collaboratorCount} />
            </div>

            {/* Avatar circles row — always show when there are collaborators */}
            {totalCount > 0 && (
              <div className="mt-1.5 ml-[27px]">
                <div className="flex items-center gap-0.5">
                  {allCollabs.slice(0, MAX_VISIBLE).map((c) => (
                    <div
                      key={c.id}
                      className="relative group"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          background: c.avatarUrl ? `url(${c.avatarUrl}) center/cover` : c.status === 'pending' ? '#e5e7eb' : '#ddd6fe',
                          color: c.status === 'pending' ? '#9ca3af' : '#7c3aed',
                          border: c.status === 'pending' ? '1px dashed #d1d5db' : '1px solid #c4b5fd',
                        }}
                      >
                        {!c.avatarUrl && (c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase())}
                      </div>
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                        style={{ background: '#1f2937', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                      >
                        <p className="text-[11px] font-semibold text-white m-0">{c.name || c.email}</p>
                        <p className="text-[10px] m-0" style={{ color: '#9ca3af' }}>
                          {c.role}{c.status === 'pending' ? ' · Pending' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Expand/collapse button */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCollabsExpanded(!collabsExpanded) }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 cursor-pointer border-0"
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  >
                    {totalCount > MAX_VISIBLE ? `+${totalCount - MAX_VISIBLE}` : '▾'}
                  </button>
                </div>

                {/* Expanded list — shows ALL collaborators with remove buttons */}
                {collabsExpanded && (
                  <div className="mt-1.5 space-y-1" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                    {allCollabs.map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{
                            background: c.avatarUrl ? `url(${c.avatarUrl}) center/cover` : c.status === 'pending' ? '#e5e7eb' : '#ddd6fe',
                            color: c.status === 'pending' ? '#9ca3af' : '#7c3aed',
                            border: c.status === 'pending' ? '1px dashed #d1d5db' : '1px solid #c4b5fd',
                          }}
                        >
                          {!c.avatarUrl && (c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase())}
                        </div>
                        <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: '#374151' }}>{c.name || c.email}</span>
                        <span className="text-[10px] shrink-0" style={{ color: '#6b7280' }}>{c.role}</span>
                        {c.status === 'pending' && (
                          <span className="text-[10px] font-semibold shrink-0" style={{ color: '#f59e0b' }}>Pending</span>
                        )}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(c.id) }}
                          disabled={removing === c.id}
                          className="text-[10px] cursor-pointer border-0 bg-transparent px-1 py-0.5 rounded shrink-0 hover:bg-red-50 transition-colors"
                          style={{ color: '#ef4444', opacity: removing === c.id ? 0.5 : 1 }}
                        >
                          {removing === c.id ? '...' : '✕'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Apply to opportunities — expandable */}
        <div style={{ background: '#fafafa', borderRadius: 6 }}>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOppsExpanded(!oppsExpanded) }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 w-full border-0 bg-transparent cursor-pointer text-left"
          >
            <span className="text-[13px] shrink-0">💼</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold m-0" style={{ color: '#111827' }}>Apply to opportunities</p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6b7280' }}>Earn heat from industry reviews</p>
            </div>
            {availableOppCount > 0 ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 shrink-0" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', borderRadius: 99 }}>
                {availableOppCount} available
              </span>
            ) : pendingAppCount > 0 ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 shrink-0" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c', borderRadius: 99 }}>
                {pendingAppCount} pending
              </span>
            ) : null}
            <span className="text-[10px] shrink-0 transition-transform" style={{ color: '#9ca3af', transform: oppsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {oppsExpanded && (
            <div className="px-2.5 pb-2" style={{ borderTop: '1px solid #f0f0f0' }}>
              {qualifyingOpps.length > 0 ? (
                <div className="space-y-1 pt-1.5">
                  {qualifyingOpps.map(opp => (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.slug}`}
                      className="block px-2 py-1.5 no-underline hover:bg-white transition-colors"
                      style={{ borderRadius: 4 }}
                    >
                      <p className="text-[12px] font-semibold m-0" style={{ color: '#111827' }}>{opp.title}</p>
                      {opp.subtitle && (
                        <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6b7280' }}>{opp.subtitle}</p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] m-0 pt-1.5" style={{ color: '#9ca3af' }}>No matching opportunities right now</p>
              )}
              <Link href="/opportunities" className="text-[11px] font-semibold no-underline mt-1.5 inline-block" style={{ color: '#7c3aed' }}>
                Browse all →
              </Link>
            </div>
          )}
        </div>

        {/* Leaderboard toggle */}
        {!isCollab && (
          <div className="px-2.5 py-1.5" style={{ background: '#fafafa', borderRadius: 6 }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] shrink-0">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold m-0" style={{ color: '#111827' }}>Leaderboard</p>
                <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6b7280' }}>Get ranked and seen by industry professionals</p>
              </div>
              <DiscoverToggle scriptId={scriptId} isPublic={isPublic} isAnon={isAnon} />
            </div>
            {!isPublic && (
              <p className="text-[11px] m-0 mt-1.5 ml-[27px]" style={{ color: '#9ca3af' }}>
                Turn on to get ranked on the leaderboard
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
