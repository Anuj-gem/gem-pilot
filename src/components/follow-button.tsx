'use client'

// FollowButton — toggle follow state on a writer profile.
// Anuj 2026-04-29 (v0.4).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { followUser, unfollowUser } from '@/app/(app)/w/[handle]/follow-actions'

interface Props {
  followeeId: string
  initiallyFollowing: boolean
  size?: 'sm' | 'md'
}

export function FollowButton({ followeeId, initiallyFollowing, size = 'md' }: Props) {
  const router = useRouter()
  const [following, setFollowing] = useState(initiallyFollowing)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      const res = next
        ? await followUser({ followeeId })
        : await unfollowUser({ followeeId })
      if (res.error) {
        setFollowing(!next) // revert on failure
      }
      router.refresh()
    })
  }

  const small = size === 'sm'
  const base = 'rounded-md font-bold transition-colors'
  const dims = small ? 'text-[11px] px-3 py-1' : 'text-[13px] px-4 py-2'
  const styles = following
    ? 'bg-white text-gray-900 border border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
    : 'bg-purple-600 text-white border border-purple-600 hover:bg-purple-700'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`${base} ${dims} ${styles}`}
    >
      {following ? (pending ? '…' : 'Following') : (pending ? '…' : 'Follow')}
    </button>
  )
}
