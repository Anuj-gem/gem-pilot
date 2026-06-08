'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ── Types ── */

type CollabDetail = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: string
  status: string
}

export type LeaderboardCard = {
  submissionId: string
  evaluationId: string
  title: string
  format: string | null
  genre: string | null
  genreKey: string | null
  budget: string | null
  budgetDisplay: string | null
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
  fundingNeeded: number
  leadCharCount: number
  totalBacking?: number
  budgetHigh?: number
}

type FilterKey = 'all' | 'funding' | 'open_roles'
type FormatKey = 'all' | 'feature' | 'series'
type SortKey = 'score' | 'recent' | 'funded'

const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Fantasy',
  'Crime', 'Romance', 'Action', 'Family',
] as const

const SORTS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'score', label: 'Top GEM Score', icon: '◆' },
  { key: 'recent', label: 'Newest', icon: '🕑' },
  { key: 'funded', label: 'Most Funded', icon: '💰' },
]

/* ── Main ── */

export function LeaderboardCards({
  cards,
  initialFilters,
  isInsider,
  isLoggedIn,
}: {
  cards: LeaderboardCard[]
  initialSort?: string
  initialFilters: { format: string; genres: string[]; budgets: string[] }
  basePath: string
  isInsider: boolean
  isLoggedIn: boolean
}) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [format, setFormat] = useState<FormatKey>('all')
  const [genre, setGenre] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('score')

  // Filter
  const filtered = cards.filter(c => {
    if (filter === 'open_roles') { if (c.collaboratorCount <= 0) return false }
    if (format === 'feature') { if (c.format !== 'Feature') return false }
    if (format === 'series') { if (c.format !== 'Series') return false }
    if (genre) {
      const g = (c.genre || '').toLowerCase()
      if (!g.includes(genre.toLowerCase())) return false
    }
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
    // funded: by funding attached, tie-break on budget size
    const fa = a.totalBacking ?? 0, fb = b.totalBacking ?? 0
    if (fb !== fa) return fb - fa
    return (b.budgetHigh ?? 0) - (a.budgetHigh ?? 0)
  })

  // Counts
  const fundingCount = cards.length // every project needs funding
  const openRolesCount = cards.filter(c => c.collaboratorCount > 0).length
  const featureCount = cards.filter(c => c.format === 'Feature').length
  const seriesCount = cards.filter(c => c.format === 'Series').length

  return (
    <div>
      {/* Prominent sort — the ranking is the point */}
      <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 9px' }}>
        Ranked by
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {SORTS.map(s => {
          const active = sort === s.key
          return (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              style={{
                fontSize: 14,
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: 11,
                border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                background: active ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.04)',
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: active ? '0 6px 18px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              <span style={{ fontSize: 13 }}>{s.icon}</span> {s.label}
            </button>
          )
        })}
      </div>

      {/* Secondary filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <Chip label={`All ${cards.length}`} active={filter === 'all'} onClick={() => setFilter('all')} />
        {fundingCount > 0 && <Chip label={`Need funding ${fundingCount}`} active={filter === 'funding'} onClick={() => setFilter(filter === 'funding' ? 'all' : 'funding')} />}
        {openRolesCount > 0 && <Chip label={`Open roles ${openRolesCount}`} active={filter === 'open_roles'} onClick={() => setFilter(filter === 'open_roles' ? 'all' : 'open_roles')} />}
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        <Chip label={`Feature ${featureCount}`} active={format === 'feature'} onClick={() => setFormat(format === 'feature' ? 'all' : 'feature')} />
        <Chip label={`Series ${seriesCount}`} active={format === 'series'} onClick={() => setFormat(format === 'series' ? 'all' : 'series')} />
      </div>

      {/* Genre chips */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 20 }}>
        {GENRE_OPTIONS.map(g => (
          <button
            key={g}
            onClick={() => setGenre(genre === g ? null : g)}
            style={{
              fontSize: 11,
              color: genre === g ? '#fff' : 'rgba(255,255,255,0.4)',
              background: genre === g ? 'rgba(124,58,237,0.35)' : 'transparent',
              border: `0.5px solid ${genre === g ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.06)'}`,
              padding: '4px 10px',
              borderRadius: 14,
              cursor: 'pointer',
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No projects match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sorted.map((c, i) => (
            <DiscoverTile key={c.submissionId} card={c} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Chip ── */

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? '#fff' : 'rgba(255,255,255,0.7)',
        background: active ? '#534AB7' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${active ? '#534AB7' : 'rgba(255,255,255,0.15)'}`,
        padding: '6px 14px',
        borderRadius: 18,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  )
}

/* ── Tile ── */

function fmtShort(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`
  return `$${n}`
}

export function DiscoverTile({ card: c, rank }: { card: LeaderboardCard; rank?: number }) {
  const href = `/report/${c.evaluationId}`
  const authorName = c.writer?.fullName || 'Anonymous'

  const crewCollabCount = c.collaborators.filter(
    col => col.status === 'accepted' && !['actor', 'actress', 'cast'].includes(col.role.toLowerCase())
  ).length
  const castCollabCount = c.collaborators.filter(
    col => col.status === 'accepted' && ['actor', 'actress', 'cast'].includes(col.role.toLowerCase())
  ).length
  const crewOpen = Math.max(0, 3 - crewCollabCount)
  const castOpen = Math.max(0, c.leadCharCount - castCollabCount)
  const showScore = c.scoreVisible && c.score != null

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', cursor: 'pointer', transition: 'transform 0.15s' }}>
        {/* Image hero */}
        <div style={{ position: 'relative', height: 180, background: 'linear-gradient(135deg, #2a2040 0%, #1a1530 100%)', overflow: 'hidden' }}>
          {c.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
          ) : (
            <div style={{ width: '100%', height: '100%' }} />
          )}

          {/* Rank badge top-left */}
          {rank != null && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {rank}
            </div>
          )}

          {/* Genre pill top-right */}
          {(c.format || c.genre) && (
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
              {c.format && (
                <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4, background: 'rgba(83,74,183,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                  {c.format}
                </span>
              )}
              {c.genre && (
                <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                  {c.genre}
                </span>
              )}
            </div>
          )}

          {/* Title + author overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px', background: c.posterUrl ? 'linear-gradient(transparent, rgba(0,0,0,0.8))' : 'none' }}>
            <p style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#fff', lineHeight: 1.3 }}>{c.title || 'Untitled'}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '3px 0 0' }}>by {authorName}</p>
          </div>
        </div>

        {/* Stats row — GEM score resurfaced */}
        <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, borderTop: '0.5px solid #f0f0f0' }}>
          {showScore && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 800, color: '#534AB7' }}>
              <span style={{ width: 9, height: 9, transform: 'rotate(45deg)', background: '#7c3aed', borderRadius: 1, display: 'inline-block' }} />
              {Math.round(c.score as number)}
            </span>
          )}
          <span style={{ color: '#57534E' }}>💰 {fmtShort(c.fundingNeeded)}</span>
          <span style={{ color: '#57534E' }}>🎭 {castOpen} open</span>
        </div>
        {/* Action row */}
        <div style={{ padding: '4px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#534AB7', whiteSpace: 'nowrap' }}>View project →</span>
        </div>
      </div>
    </Link>
  )
}
