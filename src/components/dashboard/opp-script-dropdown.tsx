'use client'

// OppScriptDropdown — on opportunity cards, shows matching scripts
// with one-click apply. Used in the dashboard opportunity grid.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type MatchingScript = {
  id: string
  title: string
  score: number | null
}

type Props = {
  opportunityId: string
  matchingScripts: MatchingScript[]
  appliedOppIds: string[]  // opp IDs already applied to
}

export function OppScriptDropdown({ opportunityId, matchingScripts, appliedOppIds }: Props) {
  const [open, setOpen] = useState(false)
  const [localApplied, setLocalApplied] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const alreadyApplied = appliedOppIds.includes(opportunityId) || localApplied
  const count = matchingScripts.length

  if (count === 0) {
    return <span className="text-[13px] text-gray-400">0 scripts match</span>
  }

  async function handleApply(scriptId: string) {
    setApplying(scriptId)
    try {
      const res = await fetch('/api/consideration/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          script_ids: [scriptId],
        }),
      })
      if (res.ok) {
        setLocalApplied(true)
        setOpen(false)
        startTransition(() => router.refresh())
      } else if (res.status === 403) {
        window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal', {
          detail: { contextMessage: "You've used your 2 free applications. Become a member for unlimited access." },
        }))
      }
    } finally {
      setApplying(null)
    }
  }

  if (alreadyApplied) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-600">
        ✓ Applied
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[13px] font-semibold text-purple-600 hover:text-purple-800 transition-colors bg-transparent border-none cursor-pointer p-0"
      >
        {count} {count === 1 ? 'script matches' : 'scripts match'}
        <span className="text-[10px]">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-1 w-[240px] bg-white rounded-lg shadow-lg border border-gray-100 py-1.5 z-20">
          <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Apply with</div>
          {matchingScripts.map(s => (
            <button
              key={s.id}
              onClick={() => handleApply(s.id)}
              disabled={applying === s.id}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-purple-50 transition-colors cursor-pointer border-0 bg-transparent text-left disabled:opacity-50"
            >
              <span className="text-[12px] font-medium text-gray-900 truncate">{s.title}</span>
              {applying === s.id ? (
                <span className="text-[10px] text-gray-400">...</span>
              ) : (
                <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded shrink-0"
                  style={{ background: '#7c3aed' }}>Apply</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
