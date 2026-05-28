'use client'

import { useState } from 'react'
import { AddCollaboratorButton } from './add-collaborator-button'
import { DiscoverToggle } from './discover-toggle'

type Props = {
  scriptId: string
  isPublic: boolean
  collaboratorCount: number
  availableOppCount: number
  pendingAppCount: number
  heat: number
  isCollab: boolean
  isAnon?: boolean
}

export function GrowHeatSection({
  scriptId,
  isPublic,
  collaboratorCount,
  availableOppCount,
  pendingAppCount,
  heat,
  isCollab,
  isAnon,
}: Props) {
  const [open, setOpen] = useState(false)

  // Count how many ways to earn are available
  const ways = 3 // collaborators, opportunities, leaderboard

  return (
    <div style={{ borderTop: '1px solid #f3f4f6' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 border-0 bg-transparent cursor-pointer"
        style={{ outline: 'none' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold" style={{ color: '#111827' }}>Grow your heat</span>
          <span className="text-[11px]">🔥</span>
        </span>
        <span className="flex items-center gap-1.5">
          {!open && (
            <span className="text-[11px]" style={{ color: '#9ca3af' }}>{ways} ways to earn</span>
          )}
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-3 pb-3 space-y-2" style={{ marginTop: -4 }}>
          {/* Add collaborators */}
          {!isCollab && (
            <div className="flex items-center gap-2.5 px-2.5 py-2" style={{ background: '#fafafa', borderRadius: 8 }}>
              <span className="text-[14px] shrink-0">🧑‍🤝‍🧑</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold m-0" style={{ color: '#111827' }}>Add collaborators</p>
                <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6b7280' }}>Each collaborator adds +1 heat</p>
              </div>
              <AddCollaboratorButton scriptId={scriptId} collaboratorCount={collaboratorCount} />
            </div>
          )}

          {/* Apply to opportunities */}
          <div className="flex items-center gap-2.5 px-2.5 py-2" style={{ background: '#fafafa', borderRadius: 8 }}>
            <span className="text-[14px] shrink-0">💼</span>
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
          </div>

          {/* Leaderboard toggle */}
          {!isCollab && (
            <div className="flex items-center gap-2.5 px-2.5 py-2" style={{ background: '#fafafa', borderRadius: 8 }}>
              <span className="text-[14px] shrink-0">🌐</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold m-0" style={{ color: '#111827' }}>Leaderboard</p>
                <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6b7280' }}>Get noticed by industry professionals</p>
              </div>
              <DiscoverToggle scriptId={scriptId} isPublic={isPublic} isAnon={isAnon} />
            </div>
          )}

          {/* Heat earned breakdown — only show if heat > 0 */}
          {heat > 0 && (
            <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 6 }}>
              <span className="text-[11px]" style={{ color: '#9ca3af' }}>Heat earned:</span>
              <span className="text-[11px]">🔥</span>
              <span className="text-[12px] font-semibold" style={{ color: '#ea580c' }}>{heat}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
