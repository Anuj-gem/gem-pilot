'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScriptGrid } from './script-grid'
import type { LeaderboardEntry } from '@/types'

interface Props {
  initialScripts: LeaderboardEntry[]
  initialLikes: string[]
  loggedIn: boolean
  filters: { q: string; genre: string; format: string; tab: '' | 'gem-select' }
  hasMoreInitial: boolean
}

export function InfiniteScriptGrid({
  initialScripts,
  initialLikes,
  loggedIn,
  filters,
  hasMoreInitial,
}: Props) {
  const [scripts, setScripts] = useState<LeaderboardEntry[]>(initialScripts)
  const [likes, setLikes] = useState<Set<string>>(new Set(initialLikes))
  const [hasMore, setHasMore] = useState<boolean>(hasMoreInitial)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.genre) params.set('genre', filters.genre)
      if (filters.format) params.set('format', filters.format)
      if (filters.tab) params.set('tab', filters.tab)
      params.set('offset', String(scripts.length))
      const res = await fetch(`/api/discover?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setHasMore(false)
        return
      }
      const data = await res.json()
      const incoming: LeaderboardEntry[] = data.entries ?? []
      const incomingLiked: string[] = data.likedIds ?? []
      // Dedup by evaluation_id in case of overlaps.
      setScripts((prev) => {
        const seen = new Set(prev.map((s) => s.evaluation_id))
        return [...prev, ...incoming.filter((s) => !seen.has(s.evaluation_id))]
      })
      setLikes((prev) => {
        const next = new Set(prev)
        for (const id of incomingLiked) next.add(id)
        return next
      })
      setHasMore(!!data.hasMore)
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [filters.q, filters.genre, filters.format, filters.tab, scripts.length, loading, hasMore])

  useEffect(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMore()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <>
      <ScriptGrid
        scripts={scripts}
        userLikes={Array.from(likes)}
        loggedIn={loggedIn}
      />
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="py-10 text-center text-xs text-[var(--gem-gray-500)]"
        >
          {loading ? 'Loading more…' : ''}
        </div>
      ) : scripts.length > 0 ? (
        <div className="py-10 text-center text-xs text-[var(--gem-gray-600)]">
          You&apos;ve reached the end.
        </div>
      ) : null}
    </>
  )
}
