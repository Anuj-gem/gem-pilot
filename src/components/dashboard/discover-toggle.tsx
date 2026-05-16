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
      className="inline-flex items-center cursor-pointer border-0 bg-transparent p-0 disabled:opacity-50 shrink-0"
      aria-label={on ? 'Visible on Discover' : 'Hidden from Discover'}
    >
      {/* Toggle switch */}
      <span
        className="relative inline-flex items-center rounded-full transition-colors"
        style={{
          width: 36,
          height: 20,
          background: on ? '#534AB7' : '#d1d5db',
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
    </button>
  )
}
