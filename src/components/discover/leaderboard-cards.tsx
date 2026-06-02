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

type FilterKey = 'all' | 'funding' | 'open_roles'
type FormatKey = 'all' | 'feature' | 'series'
type SortKey = 'heat' | 'recent' | 'score'

const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Fantasy',
  'Crime', 'Romance', 'Action', 'Family',
] as const

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
  const [filter, setFilter] = useState<FilterKey>('all')
  const [format, setFormat] = useState<FormatKey>('all')
  const [genre, setGenre] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('heat')

  // Filter
  const filtered = cards.filter(c => {
    if (filter === 'funding') { if (c.budget == null) return false }
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
    return b.heat - a.heat
  })

  // Counts
  const fundingCount = cards.filter(c => c.budget != null).length
  const openRolesCount = cards.filter(c => c.collaboratorCount > 0).length
  const featureCount = cards.filter(c => c.format === 'Feature').length
  const seriesCount = cards.filter(c => c.format === 'Series').length

  return (
    <div>
      {/* Row 1: Main filters + sort */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        {/* Filter chips */}
        <Chip label={`All ${cards.length}`} active={filter === 'all'} onClick={() => setFilter('all')} />
        {fundingCount > 0 && <Chip label={`Looking for funding ${fundingCount}`} active={filter === 'funding'} onClick={() => setFilter('funding')} />}
        {openRolesCount > 0 && <Chip label={`Open roles ${openRolesCount}`} active={filter === 'open_roles'} onClick={() => setFilter('open_roles')} />}

        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Chip label={`Feature ${featureCount}`} active={format === 'feature'} onClick={() => setFormat(format === 'feature' ? 'all' : 'feature')} />
        <Chip label={`Series ${seriesCount}`} active={format === 'series'} onClick={() => setFormat(format === 'series' ? 'all' : 'series')} />

        {/* Sort */}
        <DiscoverSortDropdown value={sort} onChange={setSort} />
      </div>

      {/* Row 2: Genre chips */}
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

      {/* Cards grid — responsive 3-col on wide, 2-col on medium */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No projects match this filter.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {sorted.map(c => (
            <DiscoverTile key={c.submissionId} card={c} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Chip ── */

const DISCOVER_SORT_LABELS: Record<SortKey, string> = { heat: 'Most funded', recent: 'Newest', score: 'Top score' }

function DiscoverSortDropdown({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '6px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Sort: {DISCOVER_SORT_LABELS[value]}
        <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '4px 0', zIndex: 50, minWidth: 160,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {(['heat', 'recent', 'score'] as SortKey[]).map(k => (
              <button
                key={k}
                onClick={() => { onChange(k); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  fontSize: 13, padding: '8px 16px', border: 'none', cursor: 'pointer',
                  background: k === value ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: k === value ? '#fff' : 'rgba(255,255,255,0.6)',
                  fontWeight: k === value ? 500 : 400,
                }}
              >
                {DISCOVER_SORT_LABELS[k]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        background: active ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.04)',
        border: `0.5px solid ${active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`,
        padding: '6px 14px',
        borderRadius: 18,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

/* ── Tile ── */

function DiscoverTile({ card: c }: { card: LeaderboardCard }) {
  const href = `/report/${c.evaluationId}`
  const authorName = c.writer?.fullName || 'Anonymous'

  const crewCount = c.collaborators.filter(
    col => col.status === 'accepted' && !['actor', 'actress', 'cast'].includes(col.role.toLowerCase())
  ).length
  const castCount = c.collaborators.filter(
    col => col.status === 'accepted' && ['actor', 'actress', 'cast'].includes(col.role.toLowerCase())
  ).length

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', cursor: 'pointer', transition: 'transform 0.15s' }}>
        {/* Image hero */}
        <div style={{ position: 'relative', height: 180, background: 'linear-gradient(135deg, #2a2040 0%, #1a1530 100%)', overflow: 'hidden' }}>
          {c.posterUrl ? (
            <img src={c.posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
          ) : (
            <div style={{ width: '100%', height: '100%' }} />
          )}

          {/* Genre pill top-right */}
          {c.genre && (
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4,
                background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)',
              }}>
                {c.genre}
              </span>
            </div>
          )}

          {/* Title + author overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 14px',
            background: c.posterUrl ? 'linear-gradient(transparent, rgba(0,0,0,0.8))' : 'none',
          }}>
            <p style={{
              fontSize: 16, fontWeight: 500, margin: 0,
              color: '#fff', lineHeight: 1.3,
            }}>
              {c.title || 'Untitled'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '3px 0 0' }}>
              by {authorName}
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12,
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
          <span style={{
            marginLeft: 'auto',
            fontSize: 12,
            fontWeight: 500,
            color: '#534AB7',
            whiteSpace: 'nowrap',
          }}>
            View project →
          </span>
        </div>
      </div>
    </Link>
  )
}
