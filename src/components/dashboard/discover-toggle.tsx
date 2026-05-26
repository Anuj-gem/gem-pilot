'use client'

// DiscoverToggle — "Share on Leaderboard" with on/off toggle switch.
// Sits in the footer row of script cards. Calls /api/scripts/[id]/visibility.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  scriptId: string
  isPublic: boolean
  isPro?: boolean
  isAnon?: boolean
}

export function DiscoverToggle({ scriptId, isPublic, isAnon }: Props) {
  const [on, setOn] = useState(isPublic)
  const [busy, setBusy] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function toggle() {
    if (busy) return
    if (isAnon && !on) {
      window.dispatchEvent(new CustomEvent('gem:open-signup-gate', {
        detail: { contextMessage: 'Create an account to save your scripts, post to the leaderboard, and apply for opportunities.' },
      }))
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !on }),
      })
      if (res.ok) {
        setOn(!on)
        startTransition(() => router.refresh())
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle() }}
      disabled={busy}
      className="inline-flex items-center gap-2 cursor-pointer border-0 bg-transparent p-0 disabled:opacity-50 shrink-0"
      aria-label={on ? 'Published to Leaderboard' : 'Not published to Leaderboard'}
    >
      <span className="text-[11px] font-bold text-white">
        Leaderboard
      </span>
      {/* Toggle switch with On/Off labels */}
      <span className="inline-flex items-center gap-1">
        <span className="text-[10px] font-bold" style={{ color: on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)' }}>Off</span>
        <span
          className="relative inline-flex items-center rounded-full transition-colors"
          style={{
            width: 36,
            height: 20,
            background: on ? '#7c3aed' : 'rgba(255,255,255,0.2)',
          }}
        >
          <span
            className="absolute rounded-full bg-white transition-all shadow-sm"
            style={{
              width: 16,
              height: 16,
              top: 2,
              left: on ? 18 : 2,
            }}
          />
        </span>
        <span className="text-[10px] font-bold" style={{ color: on ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>On</span>
      </span>
    </button>
  )
}
