'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DiscoverToggle } from '@/components/dashboard/discover-toggle'

/* ── Types ── */

export interface ProjectCard {
  id: string
  eval_id: string | null
  title: string
  logline: string | null
  poster_url: string | null
  score: number | null
  tier: string | null
  format: string | null
  genres: string[]
  heat_score: number
  budget_display: string | null
  crew_count: number
  cast_count: number
  backing_total: number
  following_total: number
  role: 'creator' | 'collaborator'
  collab_role_label: string | null
  status: 'processing' | 'completed' | 'error'
  has_pending_apps: boolean
  needs_funding: boolean
  is_public: boolean
  created_at: string
}

export interface CollabRequest {
  id: string
  submission_id: string
  title: string
  poster_url: string | null
  owner_name: string
  role_type: 'crew' | 'cast'
  role_name: string
  character_detail: string | null
  score: number | null
}

interface Props {
  projects: ProjectCard[]
  requests: CollabRequest[]
  userName: string
}

/* ── Helpers ── */

type FilterKey = 'all' | 'creator' | 'collaborator' | 'needs_funding' | 'pending_apps'
type SortKey = 'date' | 'funding' | 'collabs'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  creator: 'Creator',
  collaborator: 'Collaborator',
  needs_funding: 'Needs funding',
  pending_apps: 'Pending apps',
}

const SORT_LABELS: Record<SortKey, string> = {
  date: 'Newest',
  funding: 'Most Funding',
  collabs: 'Most Collaborators',
}

/* ── Main ── */

export function ProjectHub({ projects: initialProjects, requests: initialRequests, userName }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('date')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingRequests, setPendingRequests] = useState(initialRequests)
  const [projects, setProjects] = useState(initialProjects)
  const [accepting, setAccepting] = useState<Set<string>>(new Set())

  // Filter
  const filtered = projects.filter(p => {
    if (filter === 'creator') return p.role === 'creator'
    if (filter === 'collaborator') return p.role === 'collaborator'
    if (filter === 'needs_funding') return p.needs_funding
    if (filter === 'pending_apps') return p.has_pending_apps
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'funding') return (b.backing_total + b.following_total) - (a.backing_total + a.following_total)
    if (sort === 'collabs') return b.crew_count - a.crew_count
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Counts
  const counts: Record<FilterKey, number> = {
    all: projects.length,
    creator: projects.filter(p => p.role === 'creator').length,
    collaborator: projects.filter(p => p.role === 'collaborator').length,
    needs_funding: projects.filter(p => p.needs_funding).length,
    pending_apps: projects.filter(p => p.has_pending_apps).length,
  }

  // Selection
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Accept/decline collab requests
  async function handleRequest(req: CollabRequest, action: 'accepted' | 'declined') {
    setAccepting(prev => new Set(prev).add(req.id))
    try {
      const res = await fetch(`/api/scripts/${req.submission_id}/collaborators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborator_id: req.id, status: action }),
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => r.id !== req.id))
        if (action === 'accepted') {
          router.refresh()
        }
      }
    } finally {
      setAccepting(prev => { const n = new Set(prev); n.delete(req.id); return n })
    }
  }

  // Bulk delete
  async function handleBulkDelete() {
    for (const id of selected) {
      await fetch(`/api/scripts/${id}/hide`, { method: 'POST' })
    }
    setProjects(prev => prev.filter(p => !selected.has(p.id)))
    setSelected(new Set())
  }

  // Only show filters that have items (except 'all' always shows)
  const visibleFilters = (Object.keys(counts) as FilterKey[]).filter(
    k => k === 'all' || counts[k] > 0
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 20, fontWeight: 500, color: '#fff', margin: 0 }}>Your projects</p>
        <Link
          href="/dashboard/settings"
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            padding: '5px 10px',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          <span style={{ marginRight: 4 }}>⚙</span>Account
        </Link>
      </div>

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
        <div style={{ marginLeft: 'auto' }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#1a0f35', color: '#fff' }}>Sort: {v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pending collaboration requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Pending requests
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingRequests.map(req => (
              <div key={req.id} style={{ borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  {/* Image */}
                  <div style={{ width: 160, minHeight: 100, position: 'relative', background: 'linear-gradient(135deg, #1e1535, #2d1b4e)', flexShrink: 0 }}>
                    {req.poster_url ? (
                      <img src={req.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%' }} />
                    )}
                    {req.score != null && (
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, background: 'rgba(124,58,237,0.85)', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>{req.score}</span>
                      </div>
                    )}
                  </div>
                  {/* Info + actions */}
                  <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 500, color: '#1C1917', margin: 0 }}>{req.title}</p>
                      <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0' }}>by {req.owner_name}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                        {req.role_name}
                      </span>
                      <span style={{ fontSize: 12, color: '#57534E' }}>
                        Invited you as {req.role_type}
                      </span>
                    </div>
                    {req.character_detail && (
                      <p style={{ fontSize: 11, color: '#A8A29E', margin: 0 }}>{req.character_detail}</p>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button
                        onClick={() => handleRequest(req, 'accepted')}
                        disabled={accepting.has(req.id)}
                        style={{ fontSize: 11, fontWeight: 500, color: '#fff', background: '#534AB7', padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', opacity: accepting.has(req.id) ? 0.5 : 1 }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRequest(req, 'declined')}
                        disabled={accepting.has(req.id)}
                        style={{ fontSize: 11, fontWeight: 500, color: '#78716C', background: '#f5f5f4', padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', opacity: accepting.has(req.id) ? 0.5 : 1 }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project grid */}
      {sorted.length > 0 && (
        <div>
          {(pendingRequests.length > 0 || filter !== 'all') && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Your projects
            </p>
          )}
          <div style={{ display: 'grid', gap: 12 }} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map(p => (
              <ProjectTile
                key={p.id}
                project={p}
                isSelected={selected.has(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && pendingRequests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>No projects yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>Upload your first screenplay to get started.</p>
        </div>
      )}

      {/* Empty filter state */}
      {sorted.length === 0 && projects.length > 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No projects match this filter.</p>
        </div>
      )}

      {/* Multiselect action bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e1b2e',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: 14,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          zIndex: 50,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            style={{ fontSize: 14, fontWeight: 500, color: '#fff', background: '#dc2626', border: 'none', cursor: 'pointer', padding: '6px 18px', borderRadius: 8 }}
          >
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: '6px 18px', borderRadius: 8 }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Helpers ── */

function fmtK(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return n.toLocaleString()
}

/* ── Project tile ── */

function ProjectTile({ project: p, isSelected, onToggleSelect }: {
  project: ProjectCard
  isSelected: boolean
  onToggleSelect: () => void
}) {
  const href = p.status === 'completed' ? `/report/${p.eval_id || p.id}` : undefined

  const roleLabel = p.role === 'creator'
    ? 'Role: Creator'
    : `Role: ${p.collab_role_label || 'Collaborator'}`

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        outline: isSelected ? '2px solid #7C3AED' : 'none',
        outlineOffset: -2,
        position: 'relative',
      }}
    >
      {/* Image hero */}
      <div style={{ position: 'relative', height: 140, background: 'linear-gradient(135deg, #2a2040 0%, #1a1530 100%)', overflow: 'hidden' }}>
        {p.poster_url ? (
          <img src={p.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
        ) : (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -55%)', textAlign: 'center' }}>
            {href ? (
              <Link
                href={href}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
                  padding: '6px 14px', borderRadius: 6,
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                + Add image
              </Link>
            ) : (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No image</span>
            )}
          </div>
        )}

        {/* Select checkbox — top left */}
        <div
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSelect() }}
          style={{
            position: 'absolute', top: 8, left: 8,
            width: 22, height: 22, borderRadius: 4,
            background: isSelected ? '#534AB7' : 'rgba(0,0,0,0.3)',
            border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: isSelected ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
          className="tile-checkbox"
        >
          {isSelected && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
        </div>

        {/* Role badge — top right */}
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 3,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            backdropFilter: 'blur(4px)',
          }}>
            {roleLabel}
          </span>
        </div>

        {/* Title overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 12px',
          background: p.poster_url ? 'linear-gradient(transparent, rgba(0,0,0,0.75))' : 'none',
        }}>
          <p style={{
            fontSize: 15, fontWeight: 500, margin: 0,
            color: p.title ? '#fff' : 'rgba(255,255,255,0.5)',
          }}>
            {p.title || 'Untitled'}
          </p>
          {p.status === 'processing' && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Processing...</p>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 11,
        borderTop: '0.5px solid #f0f0f0',
      }}>
        <span style={{ color: p.backing_total > 0 ? '#15803d' : '#A8A29E' }}>
          💰 Funding {p.backing_total > 0 ? `$${fmtK(p.backing_total)}` : '$0'}
        </span>
        {p.following_total > 0 && (
          <span style={{ color: '#534AB7' }}>
            {fmtK(p.following_total)} pending
          </span>
        )}
        <span style={{ color: p.crew_count > 0 ? '#57534E' : '#A8A29E' }}>
          🎬 Crew {p.crew_count}
        </span>
        <span style={{ color: p.cast_count > 0 ? '#57534E' : '#A8A29E' }}>
          🎭 Cast {p.cast_count}
        </span>
      </div>

      {/* Action row: Discover toggle + View project */}
      <div style={{
        padding: '6px 12px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ transform: 'scale(0.9)', transformOrigin: 'left center' }}>
          <DiscoverToggle scriptId={p.id} isPublic={p.is_public} />
        </div>
        {href && (
          <Link
            href={href}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#534AB7',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            View project →
          </Link>
        )}
      </div>

      {/* Hover show checkbox */}
      <style>{`
        div:hover .tile-checkbox { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
