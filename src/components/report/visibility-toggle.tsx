'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { trackScriptPublished, trackUpgradePromptShown } from '@/lib/posthog'

interface VisibilityToggleProps {
  submissionId: string
  initialPublic: boolean
  title?: string
  score?: number
  isSubscribed?: boolean
}

export function VisibilityToggle({
  submissionId,
  initialPublic,
  title = '',
  score,
  isSubscribed = false,
}: VisibilityToggleProps) {
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [loading, setLoading] = useState(false)
  const [justPublished, setJustPublished] = useState(false)

  const openUpgradeModal = () => {
    trackUpgradePromptShown('visibility_toggle')
    // Re-open the SubscribeGate modal instead of bouncing straight to Stripe.
    // SubscribeGate listens for this event and resets its dismissed state.
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  const toggle = async () => {
    // v5: all users can publish to Discover — no subscription gate.
    setLoading(true)
    try {
      const res = await fetch(`/api/scripts/${submissionId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !isPublic }),
      })
      if (res.ok) {
        const nowPublic = !isPublic
        setIsPublic(nowPublic)
        if (nowPublic) {
          trackScriptPublished({ title, score, submissionId })
          setJustPublished(true)
          // brief pulse on publish
          setTimeout(() => setJustPublished(false), 1500)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
        isPublic
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-[var(--gem-gray-600)] bg-[var(--gem-gray-800)] text-[var(--gem-gray-400)] hover:bg-[var(--gem-gray-700)]'
      } ${justPublished ? 'animate-pulse ring-2 ring-emerald-300' : ''} ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
      {isPublic ? 'Public on Discover' : 'Hidden from Discover'}
    </button>
  )
}
