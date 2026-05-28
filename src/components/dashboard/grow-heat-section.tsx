'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  qualifyingOpps?: { id: string; title: string; slug: string; subtitle: string | null }[]
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
  qualifyingOpps = [],
}: Props) {
  const [oppsExpanded, setOppsExpanded] = useState(false)

  return (
    <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 8 }}>
      {/* Header */}
      <div className="flex items-center gap-1.5 pt-2.5 pb-1">
        <span className="text-[12px] font-semibold" style={{ color: '#111827' }}>Grow your heat</span>
        <span className="text-[11px]">🔥</span>
      </div>

      <div className="space-y-1.5 pb-2">
        {/* Add collaborators */}
        {!isCollab && (
          <div className="px-2.5 py-1.5" style={{ background: '#fafafa', borderRadius: 6 }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] shrink-0">🧑</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold m-0" style={{ color: '#111827' }}>
                  Collaborators
                  {collaboratorCount > 0 && (
                    <span className="font-normal" style={{ color: '#6b7280' }}> · {collaboratorCount} added</span>
                  )}
                </p>
                <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6b7280' }}>+1 heat each</p>
              </div>
              <AddCollaboratorButton scriptId={scriptId} collaboratorCount={collaboratorCount} />
            </div>
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

        {/* Heat earned — only show if heat > 0 */}
        {heat > 0 && (
          <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 6 }}>
            <span className="text-[11px]" style={{ color: '#9ca3af' }}>Heat earned:</span>
            <span className="text-[11px]">🔥</span>
            <span className="text-[12px] font-semibold" style={{ color: '#ea580c' }}>{heat}</span>
          </div>
        )}
      </div>
    </div>
  )
}
