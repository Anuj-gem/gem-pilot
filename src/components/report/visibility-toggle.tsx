'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { trackScriptPublished } from '@/lib/posthog'

interface VisibilityToggleProps {
  submissionId: string
  initialPublic: boolean
  title?: string
  score?: number
}

export function VisibilityToggle({ submissionId, initialPublic, title = '', score }: VisibilityToggleProps) {
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
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
        // Fire PostHog event only when publishing (not when unpublishing)
        if (nowPublic) {
          trackScriptPublished({ title, score, submissionId })
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
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
          : 'border-[var(--gem-gray-600)] bg-[var(--gem-gray-800)] text-[var(--gem-gray-400)] hover:bg-[var(--gem-gray-700)]'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
      {isPublic ? 'Public on Discover' : 'Private'}
    </button>
  )
}
