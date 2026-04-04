'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Mail } from 'lucide-react'
import { TIER_META } from '@/types'
import type { LeaderboardEntry, Tier } from '@/types'

function tierColor(tier: string) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

interface ScriptGridProps {
  scripts: LeaderboardEntry[]
  userLikes: string[]
  loggedIn?: boolean
}

export function ScriptGrid({ scripts, userLikes, loggedIn = true }: ScriptGridProps) {
  return (
    <div className="divide-y divide-[var(--gem-gray-700)]">
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

  const isNew = script.created_at &&
    new Date().getTime() - new Date(script.created_at).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <Link
      href={`/report/${script.evaluation_id}`}
      className="group flex items-center gap-4 py-4 sm:py-5 px-1 hover:bg-[var(--gem-gray-800)]/50 transition-colors -mx-1 rounded-lg"
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        <span className={`font-bold tabular-nums ${
          rank <= 3 ? 'text-xl' : 'text-base text-[var(--gem-gray-500)]'
        }`} style={rank <= 3 ? { color: 'var(--gem-gold)' } : undefined}>
          {rank}
        </span>
      </div>

      {/* Score — labeled */}
      <div className="shrink-0 w-12 text-center">
        <span className="text-lg font-bold tabular-nums" style={{ color: tierColor(script.tier) }}>
          {Math.round(script.weighted_score)}
        </span>
        <div className="text-[8px] uppercase tracking-wider text-[var(--gem-gray-500)] leading-tight">Score</div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm sm:text-base font-semibold truncate group-hover:text-[var(--gem-accent)] transition-colors">
            {script.title}
          </h3>
          {isNew && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 border border-emerald-200">
              NEW
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--gem-gray-400)]">
          {script.author_name}
        </div>
        <div className="flex gap-1.5 mt-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
            {script.format}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            {script.genre}
          </span>
        </div>
      </div>

      {/* Tier badge — GEM Verdict */}
      <div className="shrink-0 hidden sm:block text-center">
        <div className="text-[8px] uppercase tracking-wider text-[var(--gem-gray-500)] mb-0.5">Verdict</div>
        <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${tierMeta?.bgClass ?? ''} ${tierMeta?.colorClass ?? ''}`}>
          {tierMeta?.label ?? script.tier}
        </span>
      </div>

      {/* Contact */}
      <a
        href={`mailto:contact@gem.studio?subject=${encodeURIComponent(`Regarding "${script.title}" on GEM`)}&body=${encodeURIComponent(`I'd like to connect with ${script.author_name} regarding their script "${script.title}" on the GEM leaderboard.`)}`}
        onClick={(e) => e.stopPropagation()}
        className="text-[var(--gem-gray-500)] hover:text-[var(--gem-accent)] transition-colors shrink-0"
        title="Contact writer"
      >
        <Mail size={14} />
      </a>

      {/* Like */}
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors shrink-0 ${
          liked
            ? 'text-red-500'
            : 'text-[var(--gem-gray-500)] hover:text-red-500'
        } ${loading ? 'opacity-50' : ''}`}
      >
        <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>
    </Link>
  )
}
