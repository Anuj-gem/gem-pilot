'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ── Types ── */

type CollabDetail = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: string
  status: string
}

type LeaderboardCard = {
  submissionId: string
  evaluationId: string
  title: string
  format: string | null
  genre: string | null
  genreKey: string | null
  budget: string | null
  score: number | null
  scoreVisible: boolean
  heat: number
  scoreRank: number | null
  heatRank: number | null
  posterUrl: string | null
  createdAt: string
  reviewCount: number
  avgPeerScore: number | null
  collaboratorCount: number
  collaborators: CollabDetail[]
  writer: { handle: string | null; fullName: string | null; avatarUrl: string | null; headline: string | null } | null
}

type FilterKey = 'all' | 'funding' | 'feature' | 'series' | 'open_roles'
type SortKey = 'heat' | 'recent' | 'score'

const SORT_LABELS: Record<SortKey, string> = {
  heat: 'Most funded',
  recent: 'Newest',
  score: 'Top score',
}

/* ── Main ── */

export function LeaderboardCards({
  cards,
  initialSort,
  initialFilters,
  basePath,
  isInsider,
  isLoggedIn,
}: {
  cards: LeaderboardCard[]
  initialSort: string
  initialFilters: { format: string; genres: string[]; budgets: string[] }
  basePath: string
  isInsider: boolean
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('heat')

  // Filter
  const filtered = cards.filter(c => {
    if (filter === 'funding') return c.budget != null
    if (filter === 'feature') return c.format === 'Feature'
    if (filter === 'series') return c.format === 'Series'
    if (filter === 'open_roles') return c.collaboratorCount > 0
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'score') {
      const sa = a.scoreVisible ? (a.score ?? 0) : 0
      const sb = b.scoreVisible ? (b.score ?? 0) : 0
      return sb - sa
    }
    if (sort === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return b.heat - a.heat
  })

  // Counts
  const counts: Record<FilterKey, number> = {
    all: cards.length,
    funding: cards.filter(c => c.budget != null).length,
    feature: cards.filter(c => c.format === 'Feature').length,
    series: cards.filter(c => c.format === 'Series').length,
    open_roles: cards.filter(c => c.collaboratorCount > 0).length,
  }

  const FILTER_LABELS: Record<FilterKey, string> = {
    all: 'All',
    funding: 'Looking for funding',
    feature: 'Feature',
    series: 'Series',
    open_roles: 'Open roles',
  }

  // Only show filters that have items (except 'all' always shows)
  const visibleFilters = (Object.keys(counts) as FilterKey[]).filter(
    k => k === 'all' || counts[k] > 0
  )

  return (
    <div>
      {/* Filter chips + sort */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {visibleFilters.map(key => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              fontSize: 11,
              fontWeight: filter === key ? 500 : 400,
              color: filter === key ? '#fff' : 'rgba(255,255,255,0.5)',
              background: filter === key ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.04)',
              border: `0.5px solid ${filter === key ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`,
              padding: '5px 12px',
              borderRadius: 16,
              cursor: 'pointer',
            }}
          >
            {FILTER_LABELS[key]} {counts[key]}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: 4,
            }}
          >
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#1a0f35', color: '#fff' }}>Sort: {v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards grid */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No projects match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {sorted.map(c => (
            <DiscoverTile key={c.submissionId} card={c} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Tile ── */

function DiscoverTile({ card: c }: { card: LeaderboardCard }) {
  const href = `/report/${c.evaluationId}`
  const authorName = c.writer?.fullName || 'Anonymous'

  // Count crew vs cast from collaborators
  const crewCount = c.collaborators.filter(
    col => col.status === 'accepted' && !['actor', 'actress', 'cast'].includes(col.role.toLowerCase())
  ).length
  const castCount = c.collaborators.filter(
    col => col.status === 'accepted' && ['actor', 'actress', 'cast'].includes(col.role.toLowerCase())
  ).length

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', background: '#fff', position: 'relative' }}>
      {/* Image hero */}
      <div style={{ position: 'relative', height: 140, background: 'linear-gradient(135deg, #2a2040 0%, #1a1530 100%)', overflow: 'hidden' }}>
        {c.posterUrl ? (
          <img src={c.posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
        ) : (
          <div style={{ width: '100%', height: '100%' }} />
        )}

        {/* Title + author overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 12px',
          background: c.posterUrl ? 'linear-gradient(transparent, rgba(0,0,0,0.75))' : 'none',
        }}>
          <p style={{
            fontSize: 15, fontWeight: 500, margin: 0,
            color: c.title ? '#fff' : 'rgba(255,255,255,0.5)',
          }}>
            {c.title || 'Untitled'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>
            by {authorName}
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 11,
        borderTop: '0.5px solid #f0f0f0',
      }}>
        <span style={{ color: crewCount > 0 ? '#57534E' : '#A8A29E' }}>
          Crew {crewCount}
        </span>
        <span style={{ color: castCount > 0 ? '#57534E' : '#A8A29E' }}>
          Cast {castCount}
        </span>
        {c.format && (
          <span style={{
            fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
            background: '#EEEDFE', color: '#534AB7',
          }}>
            {c.format}
          </span>
        )}
        <Link
          href={href}
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 500,
            color: '#534AB7',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          View project →
        </Link>
      </div>
    </div>
  )
}
