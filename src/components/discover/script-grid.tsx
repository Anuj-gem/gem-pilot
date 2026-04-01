'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { TIER_META } from '@/types'
import type { LeaderboardEntry, Tier } from '@/types'

interface ScriptGridProps {
  scripts: LeaderboardEntry[]
  userLikes: string[]
  loggedIn?: boolean
}

export function ScriptGrid({ scripts, userLikes, loggedIn = true }: ScriptGridProps) {
  return (
    <div className="space-y-3">
      {scripts.map((script, index) => (
        <ScriptRow
          key={script.evaluation_id}
          script={script}
          rank={index + 1}
          initialLiked={userLikes.includes(script.evaluation_id)}
          loggedIn={loggedIn}
        />
      ))}
    </div>
  )
}

function ScriptRow({
  script,
  rank,
  initialLiked,
  loggedIn,
}: {
  script: LeaderboardEntry
  rank: number
  initialLiked: boolean
  loggedIn: boolean
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(script.like_count)
  const [loading, setLoading] = useState(false)

  const tierMeta = TIER_META[script.tier as Tier]

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!loggedIn) {
      router.push(`/login?redirect=/discover`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/scripts/${script.evaluation_id}/like`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
        setLikeCount(prev => data.liked ? prev + 1 : prev - 1)
      }
    } finally {
      setLoading(false)
    }
  }

  const scoreColor =
    script.weighted_score >= 80 ? 'text-emerald-400' :
    script.weighted_score >= 70 ? 'text-amber-400' :
    script.weighted_score >= 60 ? 'text-blue-400' :
    script.weighted_score >= 50 ? 'text-zinc-400' :
    'text-zinc-500'

  return (
    <Link
      href={`/report/${script.evaluation_id}`}
      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)] bg-[var(--gem-gray-900)] transition-colors"
    >
      {/* Rank */}
      <div className="w-6 sm:w-8 text-center shrink-0">
        <span className={`text-base sm:text-lg font-bold ${rank <= 3 ? 'text-[var(--gem-accent)]' : 'text-[var(--gem-gray-500)]'}`}>
          {rank}
        </span>
      </div>

      {/* Score ring */}
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shrink-0 ${
        script.weighted_score >= 80 ? 'border-emerald-500' :
        script.weighted_score >= 70 ? 'border-amber-500' :
        script.weighted_score >= 60 ? 'border-blue-500' :
        script.weighted_score >= 50 ? 'border-zinc-500' :
        'border-zinc-600'
      }`}>
        <span className={`text-xs sm:text-sm font-bold ${scoreColor}`}>
          {Math.round(script.weighted_score)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-medium text-sm sm:text-base text-white truncate group-hover:text-[var(--gem-accent)] transition-colors">
            {script.title}
          </h3>
          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${tierMeta?.bgClass ?? ''} ${tierMeta?.colorClass ?? ''}`}>
            {tierMeta?.label ?? script.tier}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-[var(--gem-gray-400)]">
          <span className="truncate">{script.author_name}</span>
          <span className="text-[var(--gem-gray-600)]">&middot;</span>
          <span className="hidden sm:inline">{script.format}</span>
          <span className="hidden sm:inline text-[var(--gem-gray-600)]">&middot;</span>
          <span className="truncate">{script.genre}</span>
        </div>
        {script.logline && (
          <p className="text-[10px] sm:text-xs text-[var(--gem-gray-500)] mt-1 line-clamp-1 hidden sm:block">
            {script.logline}
          </p>
        )}
      </div>

      {/* Like */}
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors shrink-0 ${
          liked
            ? 'text-red-400'
            : 'text-[var(--gem-gray-500)] hover:text-red-400'
        } ${loading ? 'opacity-50' : ''}`}
      >
        <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>
    </Link>
  )
}
