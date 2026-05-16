'use client'

// DiscoverToggle — compact pill toggle for publishing a script to Discover.
// Sits in the footer row of script cards. Calls /api/scripts/[id]/visibility.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  scriptId: string
  isPublic: boolean
  isPro: boolean
}

export function DiscoverToggle({ scriptId, isPublic, isPro }: Props) {
  const [on, setOn] = useState(isPublic)
  const [busy, setBusy] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function toggle() {
    if (busy) return

    // Gate non-Pro users
    if (!on && !isPro) {
      window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal', {
        detail: { contextMessage: 'Become a member to publish on Discover.' },
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
      } else if (res.status === 403) {
        window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal', {
          detail: { contextMessage: 'Become a member to publish on Discover.' },
        }))
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
      {/* Toggle dot */}
      <span
        className="w-2 h-2 rounded-full transition-colors"
        style={{ background: on ? '#059669' : '#d1d5db' }}
      />
      {busy ? '...' : on ? 'On Discover' : 'Discover'}
    </button>
  )
}
