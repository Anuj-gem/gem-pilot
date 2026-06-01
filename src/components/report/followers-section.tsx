'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'

interface Follower {
  id: string
  type: 'following' | 'attached'
  amount: number | null
  conditions: string[] | null
  note: string | null
  opportunity: {
    id: string
    title: string
    deal_type: string | null
  } | null
  partner: {
    name: string | null
    avatar_url: string | null
    headline: string | null
  } | null
}

interface Props {
  submissionId: string
  totalFollowing: number
  followerCount: number
  totalBacking: number
  backerCount: number
}

export function FollowersSection({ submissionId, totalFollowing, followerCount, totalBacking, backerCount }: Props) {
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFollowers()
  }, [submissionId])

  async function fetchFollowers() {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/followers`)
      if (res.ok) {
        const data = await res.json()
        setFollowers(data)
      }
    } finally {
      setLoading(false)
    }
  }

  const attached = followers.filter(f => f.type === 'attached')
  const following = followers.filter(f => f.type === 'following')
  const totalCount = attached.length + following.length

  if (loading) return null
  if (totalCount === 0 && backerCount === 0 && followerCount === 0) return null

  return (
    <div>
      <h2
        className="text-[15px] font-bold uppercase tracking-[0.14em] m-0 mb-4"
        style={{ color: 'var(--gem-gold)' }}
      >
        👥 Followers
        <span style={{ color: '#A8A29E' }}> ({totalCount})</span>
      </h2>

      {/* Aggregate stats */}
      {(totalBacking > 0 || totalFollowing > 0) && (
        <div className="flex items-center gap-3 mb-3">
          {totalBacking > 0 && (
            <span
              className="text-[13px] font-bold px-2.5 py-1 rounded-lg"
              style={{ background: '#ecfdf5', color: '#15803d', border: '1px solid #6ee7b7' }}
            >
              {totalBacking >= 1000 ? `$${Math.round(totalBacking / 1000)}K` : `$${totalBacking}`} backed
            </span>
          )}
          {totalFollowing > 0 && (
            <span
              className="text-[13px] font-bold px-2.5 py-1 rounded-lg"
              style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}
            >
              {totalFollowing >= 1000 ? `$${Math.round(totalFollowing / 1000)}K` : `$${totalFollowing}`} following
            </span>
          )}
        </div>
      )}

      {/* Individual follower rows */}
      {totalCount > 0 ? (
        <div className="flex flex-col gap-2">
          {[...attached, ...following].map(f => (
            <FollowerRow key={f.id} follower={f} />
          ))}
        </div>
      ) : (
        <p className="text-[13px] m-0" style={{ color: '#A8A29E' }}>
          No followers yet.
        </p>
      )}
    </div>
  )
}

function FollowerRow({ follower }: { follower: Follower }) {
  const isAttached = follower.type === 'attached'
  const amount = follower.amount
  const fmtAmount = amount != null && amount > 0
    ? (amount >= 1000 ? `$${Math.round(amount / 1000)}K` : `$${amount.toLocaleString()}`)
    : null

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: 'rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Anonymous avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
        style={{ background: isAttached ? '#ecfdf5' : '#fffbeb' }}
      >
        💰
      </div>

      {/* Amount is the headline */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {fmtAmount && (
            <span
              className="text-[18px] font-bold"
              style={{ color: isAttached ? '#15803d' : '#92400e' }}
            >
              {fmtAmount}
            </span>
          )}
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded"
            style={{
              background: isAttached ? '#ecfdf5' : '#fffbeb',
              color: isAttached ? '#15803d' : '#92400e',
              border: isAttached ? '1px solid #6ee7b7' : '1px solid #fcd34d',
            }}
          >
            {isAttached ? 'Backed' : 'Following'}
          </span>
        </div>
        <p className="text-[12px] m-0 mt-0.5" style={{ color: '#78716C' }}>
          Investor
        </p>
      </div>

      {/* Link to opportunity */}
      {follower.opportunity && (
        <a
          href={`/opportunities/${follower.opportunity.id}`}
          className="text-[12px] no-underline flex items-center gap-1 shrink-0"
          style={{ color: '#7C3AED' }}
          title={follower.opportunity.title}
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  )
}
