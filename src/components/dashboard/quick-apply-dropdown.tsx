'use client'

// QuickApplyDropdown — collapsible dropdown on script cards showing
// matching opportunities with one-click apply buttons.
// Applied opportunities show "Applied ✓" and are locked.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Opportunity = {
  id: string
  title: string
  slug: string
  subtitle?: string | null
}

type Props = {
  scriptId: string
  opportunities: Opportunity[]
  appliedOppIds: string[]  // opportunity IDs already applied to (across ALL scripts)
  className?: string
}

export function QuickApplyDropdown({ scriptId, opportunities, appliedOppIds, className }: Props) {
  const [open, setOpen] = useState(false)
  const [localApplied, setLocalApplied] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const total = opportunities.length
  if (total === 0) return null

  const isApplied = (oppId: string) => appliedOppIds.includes(oppId) || localApplied.has(oppId)
  const unappliedCount = opportunities.filter(o => !isApplied(o.id)).length

  async function handleApply(oppId: string) {
    setApplying(oppId)
    try {
      const res = await fetch('/api/consideration/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: oppId,
          script_ids: [scriptId],
        }),
      })
      if (res.ok) {
        setLocalApplied(prev => new Set([...prev, oppId]))
        startTransition(() => router.refresh())
      }
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-purple-600 hover:text-purple-800 transition-colors bg-transparent border-none cursor-pointer p-0"
      >
        {unappliedCount > 0
          ? `${total} matching ${total === 1 ? 'opportunity' : 'opportunities'}`
          : `${total} ${total === 1 ? 'opportunity' : 'opportunities'} — all applied`}
        <span className="text-[10px]">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {opportunities.map(opp => {
            const applied = isApplied(opp.id)
            const isApplying = applying === opp.id

            return (
              <div
                key={opp.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                style={{ background: applied ? '#f0fdf4' : '#f8f8fa' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-gray-900 truncate">{opp.title}</div>
                  {opp.subtitle && (
                    <div className="text-[11px] text-gray-500 truncate">{opp.subtitle}</div>
                  )}
                </div>
                {applied ? (
                  <span className="shrink-0 text-[10px] font-bold px-3 py-1 rounded-md text-white"
                    style={{ background: '#059669' }}>
                    Applied ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handleApply(opp.id)}
                    disabled={isApplying}
                    className="shrink-0 text-[10px] font-bold px-3 py-1 rounded-md text-white border-none cursor-pointer transition-opacity disabled:opacity-50"
                    style={{ background: '#7c3aed' }}
                  >
                    {isApplying ? '...' : 'Apply now'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
