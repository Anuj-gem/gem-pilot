'use client'

import { useState, useRef, useEffect } from 'react'
import { DiscoverToggle } from './discover-toggle'
import Link from 'next/link'

type Props = {
  scriptId: string
  isPublic: boolean
  isPro?: boolean
  isAnon?: boolean
  qualifyingOppsCount: number
}

export function PendingActionsDropdown({ scriptId, isPublic, isPro, isAnon, qualifyingOppsCount }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Count pending actions: share toggle (if not public) + opportunities (if any)
  const actionCount = (!isPublic ? 1 : 0) + (qualifyingOppsCount > 0 ? 1 : 0)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-lg text-[12px] lg:text-[13px] font-semibold transition-all cursor-pointer border"
        style={{
          background: '#EEEDFE',
          borderColor: '#AFA9EC',
          color: '#534AB7',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
        Pending actions
        {actionCount > 0 && (
          <span className="text-[10px] lg:text-[11px] font-semibold px-1.5 py-0.5 rounded-full ml-0.5"
            style={{ background: '#E24B4A', color: 'white' }}>
            {actionCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 lg:right-auto lg:w-72 mt-2 rounded-lg border p-2.5 z-30"
          style={{ background: '#F8F7FE', borderColor: '#AFA9EC' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          {/* Share on Leaderboard */}
          <div className="flex items-center justify-between py-2 px-1" style={{ borderBottom: '0.5px solid #E0DDF5' }}>
            <span className="text-[12px] lg:text-[13px] font-semibold" style={{ color: '#3C3489' }}>Share on Leaderboard</span>
            <DiscoverToggle scriptId={scriptId} isPublic={isPublic} isPro={isPro} isAnon={isAnon} />
          </div>
          {/* Apply to opportunities */}
          <Link
            href="/opportunities"
            className="flex items-center justify-between py-2 px-1 no-underline"
            onClick={() => setOpen(false)}
          >
            <span className="text-[12px] lg:text-[13px] font-semibold" style={{ color: '#534AB7' }}>
              Apply to opportunities{qualifyingOppsCount > 0 ? ` (${qualifyingOppsCount} matches)` : ''}
            </span>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="#534AB7">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
