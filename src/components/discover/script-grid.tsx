'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Mail, ArrowRight } from 'lucide-react'
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

  const isNew = script.created_at &&
    new Date().getTime() - new Date(script.created_at).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <Link
      href={`/report/${script.evaluation_id}`}
      className="group block rounded-xl card-glass overflow-hidden"
    >
      <div className="flex" style={{ borderLeft: `4px solid ${tierColor(script.tier)}` }}>
        {/* Rank + Score — left column */}
        <div className="shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center py-4 sm:py-5 bg-[var(--gem-gray-800)]/30">
          <span className={`text-base sm:text-lg font-bold tabular-nums ${
            rank <= 3 ? 'text-[var(--gem-gold)]' : 'text-[var(--gem-gray-400)]'
          }`}>#{rank}</span>
          <span className="text-xl sm:text-2xl font-bold tabular-nums mt-0.5" style={{ color: tierColor(script.tier) }}>
            {Math.round(script.weighted_score)}
          </span>
          <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-[var(--gem-gray-500)] mt-0.5">GEM Score</span>
        </div>

        {/* Content — center */}
        <div className="flex-1 min-w-0 py-4 sm:py-5 px-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold truncate group-hover:text-[var(--gem-accent)] transition-colors">
                  {script.title}
                </h3>
                {isNew && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 border border-emerald-200">
                    NEW
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--gem-gray-400)] mt-0.5">
                by {script.author_name}
              </div>
            </div>
            {/* Verdict badge */}
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold shrink-0 ${tierMeta?.bgClass ?? ''} ${tierMeta?.colorClass ?? ''}`}>
              {tierMeta?.label ?? script.tier}
            </span>
          </div>

          {/* Logline or overall take */}
          {(script.logline || script.overall_take) && (
            <p className="text-xs text-[var(--gem-gray-400)] mt-2 line-clamp-2 leading-relaxed">
              {script.logline || script.overall_take}
            </p>
          )}

          {/* Tone */}
          {script.tone && (
            <p className="text-[11px] text-[var(--gem-gray-500)] mt-1.5 italic truncate">
              {script.tone}
            </p>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {script.format && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-medium">
                {script.format}
              </span>
            )}
            {script.genre && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                {script.genre}
              </span>
            )}
            {script.genre_tags && script.genre_tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              {/* Contact */}
              <a
                href={`mailto:contact@gem.studio?subject=${encodeURIComponent(`Regarding "${script.title}" on GEM`)}&body=${encodeURIComponent(`I'd like to connect with ${script.author_name} regarding their script "${script.title}" on the GEM leaderboard.`)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--gem-gray-500)] hover:text-[var(--gem-accent)] transition-colors"
                title="Contact writer"
              >
                <Mail size={14} />
              </a>

              {/* Like */}
              <button
                onClick={handleLike}
                disabled={loading}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  liked
                    ? 'text-red-500'
                    : 'text-[var(--gem-gray-500)] hover:text-red-500'
                } ${loading ? 'opacity-50' : ''}`}
              >
                <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>
            </div>

            {/* View Report — visible on all screens */}
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] font-medium group-hover:underline">
              View Full Report <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
