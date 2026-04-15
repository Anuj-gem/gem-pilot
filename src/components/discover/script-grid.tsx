'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, ArrowRight } from 'lucide-react'
import type { LeaderboardEntry } from '@/types'

interface ScriptGridProps {
  scripts: LeaderboardEntry[]
  userLikes: string[]
  loggedIn?: boolean
}

export function ScriptGrid({ scripts, userLikes, loggedIn = true }: ScriptGridProps) {
  return (
    <div className="space-y-3">
      {scripts.map((script) => (
        <ScriptRow
          key={script.evaluation_id}
          script={script}
          initialLiked={userLikes.includes(script.evaluation_id)}
          loggedIn={loggedIn}
        />
      ))}
    </div>
  )
}

function ScriptRow({
  script,
  initialLiked,
  loggedIn,
}: {
  script: LeaderboardEntry
  initialLiked: boolean
  loggedIn: boolean
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(script.like_count)
  const [loading, setLoading] = useState(false)

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
        setLikeCount((prev) => (data.liked ? prev + 1 : prev - 1))
      }
    } finally {
      setLoading(false)
    }
  }

  const isNew =
    script.created_at &&
    new Date().getTime() - new Date(script.created_at).getTime() <
      7 * 24 * 60 * 60 * 1000

  // The pitch line: prefer positioning_hook (v4), fall back to headline/logline.
  const pitchLine =
    script.positioning_hook || script.overall_take || script.logline || ''

  return (
    <Link
      href={`/report/${script.evaluation_id}`}
      className="group block rounded-xl border border-[var(--gem-gray-200)] bg-white hover:border-[var(--gem-accent)]/40 transition-colors overflow-hidden"
    >
      <div className="flex">
        {/* Gold rail */}
        <div
          aria-hidden
          className="shrink-0 w-1"
          style={{ background: 'var(--gem-gold)' }}
        />

        <div className="flex-1 min-w-0 py-5 px-5 sm:px-6">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--gem-gray-900)] truncate group-hover:text-[var(--gem-accent)] transition-colors m-0">
                  {script.title}
                </h3>
                {isNew && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full whitespace-nowrap border border-emerald-200 font-medium">
                    NEW
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--gem-gray-500)] mt-0.5">
                by {script.author_name}
              </div>
            </div>
          </div>

          {/* Positioning hook — the pitch line */}
          {pitchLine && (
            <p className="text-sm sm:text-[15px] text-[var(--gem-gray-800)] mt-3 leading-snug line-clamp-3">
              {pitchLine}
            </p>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {script.format && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 font-medium">
                {script.format}
              </span>
            )}
            {script.genre && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 font-medium">
                {script.genre}
              </span>
            )}
            {script.genre_tags?.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 font-medium"
              >
                {tag}
              </span>
            ))}
            {script.tone && (
              <span className="text-[10px] px-2 py-0.5 rounded-full text-[var(--gem-gray-500)] italic">
                {script.tone}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
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

            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--gem-accent)] font-medium group-hover:underline">
              Read the pitch <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
