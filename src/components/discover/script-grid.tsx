'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Mail } from 'lucide-react'
import { ScoreRing } from '@/components/ui/score-ring'
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

  // Check if script is new (created within last 7 days)
  const isNew = script.created_at &&
    new Date().getTime() - new Date(script.created_at).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <Link
      href={`/report/${script.evaluation_id}`}
      className="group flex items-center gap-4 p-4 sm:p-5 rounded-xl border border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)] bg-[var(--gem-gray-900)] transition-colors"
    >
      {/* Rank number */}
      <div className="shrink-0">
        <span className={`font-bold ${
          rank <= 3 ? 'text-2xl text-amber-400' : 'text-lg text-[var(--gem-gray-500)]'
        }`}>
          {rank}
        </span>
      </div>

      {/* Score ring */}
      <div className="shrink-0">
        <ScoreRing
          score={script.weighted_score}
          size={48}
          strokeWidth={3}
        />
      </div>

      {/* Info section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-white truncate group-hover:text-[var(--gem-accent)] transition-colors">
            {script.title}
          </h3>
          {isNew && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
              NEW
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--gem-gray-400)] mb-1">
          {script.author_name}
        </div>
        <div className="flex gap-2 mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gem-accent)]/10 text-[var(--gem-accent)]">
            {script.format}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
            {script.genre}
          </span>
        </div>
        {script.logline && (
          <p className="text-xs text-[var(--gem-gray-500)] line-clamp-1">
            {script.logline}
          </p>
        )}
      </div>

      {/* Tier badge */}
      <div className="shrink-0">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tierMeta?.bgClass ?? ''} ${tierMeta?.colorClass ?? ''}`}>
          {tierMeta?.label ?? script.tier}
        </span>
      </div>

      {/* Contact button */}
      <a
        href={`mailto:contact@gem.studio?subject=Regarding "${script.title}" on GEM&body=I'd like to connect with ${encodeURIComponent(script.author_name)} regarding their script "${script.title}" on the GEM leaderboard.`}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          window.location.href = `mailto:contact@gem.studio?subject=${encodeURIComponent(`Regarding "${script.title}" on GEM`)}&body=${encodeURIComponent(`I'd like to connect with ${script.author_name} regarding their script "${script.title}" on the GEM leaderboard.`)}`
        }}
        className="text-[var(--gem-gray-500)] hover:text-[var(--gem-accent)] transition-colors shrink-0"
        title="Contact writer"
      >
        <Mail size={14} />
      </a>

      {/* Like button */}
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
