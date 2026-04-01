'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

interface LikeButtonProps {
  evaluationId: string
  initialLiked: boolean
  initialCount: number
}

export function LikeButton({ evaluationId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/scripts/${evaluationId}/like`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
        setCount(prev => data.liked ? prev + 1 : prev - 1)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
        liked
          ? 'border-red-700 bg-red-950/50 text-red-400 hover:bg-red-950/70'
          : 'border-[var(--gem-gray-600)] bg-[var(--gem-gray-800)] text-[var(--gem-gray-400)] hover:bg-[var(--gem-gray-700)]'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
