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
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer border-0 disabled:opacity-50 shrink-0"
      style={{
        background: on ? '#ecfdf5' : '#f3f4f6',
        color: on ? '#059669' : '#9ca3af',
      }}
    >
      <span className="text-[11px]">Share on Leaderboard</span>
      {/* Toggle switch */}
      <span
        className="relative inline-flex items-center rounded-full transition-colors"
        style={{
          width: 28,
          height: 16,
          background: on ? '#059669' : '#d1d5db',
        }}
      >
        <span
          className="absolute rounded-full bg-white transition-all shadow-sm"
          style={{
            width: 12,
            height: 12,
            top: 2,
            left: on ? 14 : 2,
          }}
        />
      </span>
    </button>
  )
}
