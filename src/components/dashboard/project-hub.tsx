'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ── Types ── */

export interface ProjectCard {
  id: string
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
  role: 'creator' | 'collaborator'
  collab_role_label: string | null
  status: 'processing' | 'completed' | 'error'
  has_pending_apps: boolean
  needs_funding: boolean
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
type SortKey = 'date' | 'score' | 'heat'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  creator: 'Creator',
  collaborator: 'Collaborator',
  needs_funding: 'Needs funding',
  pending_apps: 'Pending apps',
}

const SORT_LABELS: Record<SortKey, string> = {
  date: 'Newest',
  score: 'Score',
  heat: 'Heat',
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
    if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1)
    if (sort === 'heat') return b.heat_score - a.heat_score
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e1b2e',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: 12,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <span style={{ fontSize: 13, color: '#fff' }}>{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            style={{ fontSize: 12, color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Hide
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Project tile ── */

function ProjectTile({ project: p, isSelected, onToggleSelect }: {
  project: ProjectCard
  isSelected: boolean
  onToggleSelect: () => void
}) {
  const href = p.status === 'completed' ? `/report/${p.id}` : undefined

  const card = (
    <div
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        cursor: href ? 'pointer' : 'default',
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
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px',
            }}>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)' }}>+</span>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: 0 }}>Add image</p>
          </div>
        )}

        {/* Role badge */}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 3,
            background: p.role === 'collaborator' ? 'rgba(83,74,183,0.7)' : 'rgba(0,0,0,0.5)',
            color: '#fff',
          }}>
            {p.role === 'creator' ? 'Creator' : p.collab_role_label || 'Collaborator'}
          </span>
        </div>

        {/* Score badge */}
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
            background: p.score != null ? 'rgba(124,58,237,0.85)' : 'rgba(255,255,255,0.1)',
            color: p.score != null ? '#fff' : 'rgba(255,255,255,0.35)',
          }}>
            {p.score ?? '--'}
          </span>
        </div>

        {/* Select checkbox */}
        <div
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSelect() }}
          style={{
            position: 'absolute', top: 8, right: 46,
            width: 20, height: 20, borderRadius: 4,
            background: isSelected ? '#534AB7' : 'rgba(0,0,0,0.3)',
            border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: isSelected ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
          className="group-hover-visible"
        >
          {isSelected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
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
        <span>💰 <span style={{ color: p.budget_display ? '#534AB7' : '#A8A29E', fontWeight: p.budget_display ? 500 : 400 }}>{p.budget_display || '--'}</span></span>
        <span>🎬 <span style={{ color: p.crew_count > 0 ? '#57534E' : '#A8A29E' }}>{p.crew_count}</span></span>
        <span>🎭 <span style={{ color: p.cast_count > 0 ? '#57534E' : '#A8A29E' }}>{p.cast_count}</span></span>
        {p.heat_score > 0 && (
          <span>🔥 <span style={{ color: '#f97316', fontWeight: 500 }}>{p.heat_score}</span></span>
        )}
      </div>

      {/* Hover show checkbox */}
      <style>{`
        div:hover .group-hover-visible { opacity: 1 !important; }
      `}</style>
    </div>
  )

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link>
  }
  return card
}
