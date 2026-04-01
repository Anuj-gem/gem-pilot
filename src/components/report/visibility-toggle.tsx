'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface VisibilityToggleProps {
  submissionId: string
  initialPublic: boolean
}

export function VisibilityToggle({ submissionId, initialPublic }: VisibilityToggleProps) {
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
        setIsPublic(!isPublic)
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
          ? 'border-emerald-700 bg-emerald-950/50 text-emerald-400 hover:bg-emerald-950/70'
          : 'border-[var(--gem-gray-600)] bg-[var(--gem-gray-800)] text-[var(--gem-gray-400)] hover:bg-[var(--gem-gray-700)]'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
      {isPublic ? 'Public on Discover' : 'Private'}
    </button>
  )
}
