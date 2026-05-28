'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ──

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

type SortMode = 'top_gem' | 'top_heat' | 'recent'
type FormatFilter = 'all' | 'feature' | 'series'

const VALID_GENRE_IDS = ['drama', 'comedy', 'thriller', 'horror', 'sci-fi', 'fantasy', 'crime', 'romance', 'action', 'family', 'documentary', 'musical', 'western'] as const
type GenreId = (typeof VALID_GENRE_IDS)[number]

const GENRE_LABELS: Record<GenreId, string> = {
  drama: 'Drama', comedy: 'Comedy', thriller: 'Thriller', horror: 'Horror',
  'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', crime: 'Crime', romance: 'Romance',
  action: 'Action', family: 'Family', documentary: 'Documentary', musical: 'Musical', western: 'Western',
}

const VALID_BUDGET_IDS = ['micro', 'indie', 'mid', 'studio', 'agnostic'] as const
type BudgetId = (typeof VALID_BUDGET_IDS)[number]

const BUDGET_LABELS: Record<BudgetId, string> = {
  micro: 'Micro', indie: 'Indie', mid: 'Mid-Budget', studio: 'Studio', agnostic: 'Budget Agnostic',
}

const placeholderGradient = 'linear-gradient(135deg, #7c3aed, #6d28d9)'

// ── Helpers ──

function gemDiamond(size = 7) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center shrink-0 rotate-45"
      style={{ width: size * 1.8, height: size * 1.8 }}
    >
      <span className="absolute rotate-0" style={{ width: size * 1.8, height: size * 1.8, background: 'rgba(167, 139, 250, 0.15)', borderRadius: size * 0.06 }} />
      <span className="absolute rotate-0" style={{ width: size * 1.35, height: size * 1.35, background: 'rgba(139, 92, 246, 0.35)', borderRadius: size * 0.06 }} />
      <span className="absolute rotate-0" style={{ width: size, height: size, background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', borderRadius: size * 0.06 }} />
    </span>
  )
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function writerInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Collaborators dropdown ──

function CollaboratorsDropdown({ collaborators, count }: { collaborators: CollabDetail[]; count: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const accepted = collaborators.filter(c => c.status === 'accepted')

  return (
    <div className="relative flex items-center gap-1.5" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0"
      >
        <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>Collaborators</span>
        <span className="text-[12px]">🧑</span>
        <span className="text-[13px] font-bold leading-none" style={{ color: count > 0 ? '#6d28d9' : '#d1d5db' }}>{count}</span>
        <span className="text-[10px]" style={{ color: '#9ca3af' }}>▾</span>
      </button>

      {open && accepted.length > 0 && (
        <div
          className="absolute left-0 top-full mt-1.5 z-30 rounded-lg py-2 px-3"
          style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 200 }}
        >
          <p className="text-[11px] font-semibold m-0 mb-2" style={{ color: '#6b7280' }}>Collaborators</p>
          <div className="space-y-1.5">
            {accepted.map(c => (
              <div key={c.id} className="flex items-center gap-2">
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white" style={{ background: placeholderGradient }}>
                    {writerInitials(c.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[12px] font-medium m-0 truncate" style={{ color: '#374151' }}>{c.name || c.email}</p>
                  <p className="text-[10px] m-0" style={{ color: '#9ca3af' }}>{c.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Filter Sheet ──

function FiltersBar({
  format, setFormat,
  genres, setGenres,
  budgets, setBudgets,
}: {
  format: FormatFilter; setFormat: (f: FormatFilter) => void
  genres: GenreId[]; setGenres: (g: GenreId[]) => void
  budgets: BudgetId[]; setBudgets: (b: BudgetId[]) => void
}) {
  const [showFilters, setShowFilters] = useState(false)
  const activeFilterCount = (format !== 'all' ? 1 : 0) + genres.length + budgets.length

  function toggleGenre(g: GenreId) {
    setGenres(genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g])
  }
  function toggleBudget(b: BudgetId) {
    setBudgets(budgets.includes(b) ? budgets.filter(x => x !== b) : [...budgets, b])
  }

  return (
    <>
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer border-0"
        style={{ background: activeFilterCount > 0 ? 'rgba(124,58,237,0.15)' : 'transparent', color: activeFilterCount > 0 ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}
      >
        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
      </button>

      {showFilters && (
        <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Format */}
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-white/40 m-0 mb-1.5">Format</p>
            <div className="flex gap-1 flex-wrap">
              {(['all', 'feature', 'series'] as FormatFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer border-0 transition-colors ${format === f ? 'bg-white/15 text-white' : 'bg-transparent text-white/50 hover:text-white/70'}`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* Genres */}
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-white/40 m-0 mb-1.5">Genre</p>
            <div className="flex gap-1 flex-wrap">
              {VALID_GENRE_IDS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer border-0 transition-colors ${genres.includes(g) ? 'bg-white/15 text-white' : 'bg-transparent text-white/50 hover:text-white/70'}`}
                >
                  {GENRE_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          {/* Budgets */}
          <div>
            <p className="text-[11px] font-semibold text-white/40 m-0 mb-1.5">Budget</p>
            <div className="flex gap-1 flex-wrap">
              {VALID_BUDGET_IDS.map(b => (
                <button
                  key={b}
                  onClick={() => toggleBudget(b)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer border-0 transition-colors ${budgets.includes(b) ? 'bg-white/15 text-white' : 'bg-transparent text-white/50 hover:text-white/70'}`}
                >
                  {BUDGET_LABELS[b]}
                </button>
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFormat('all'); setGenres([]); setBudgets([]) }}
              className="text-[11px] text-white/50 hover:text-white/70 mt-2 cursor-pointer border-0 bg-transparent"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </>
  )
}

// ── Main Component ──

export function LeaderboardCards({
  cards,
  initialSort,
  initialFilters,
  basePath,
  isInsider,
  isLoggedIn,
}: {
  cards: LeaderboardCard[]
  initialSort: SortMode
  initialFilters: { format: FormatFilter; genres: GenreId[]; budgets: BudgetId[] }
  basePath: string
  isInsider: boolean
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sort, setSort] = useState<SortMode>(initialSort)
  const [format, setFormat] = useState<FormatFilter>(initialFilters.format)
  const [genres, setGenres] = useState<GenreId[]>(initialFilters.genres)
  const [budgets, setBudgets] = useState<BudgetId[]>(initialFilters.budgets)

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (sort !== 'top_gem') params.set('sort', sort)
    if (format !== 'all') params.set('format', format)
    if (genres.length > 0) params.set('genres', genres.join(','))
    if (budgets.length > 0) params.set('budgets', budgets.join(','))
    const qs = params.toString()
    const newUrl = qs ? `${basePath}?${qs}` : basePath
    router.replace(newUrl, { scroll: false })
  }, [sort, format, genres, budgets, basePath, router])

  // Filter
  let filtered = cards
  if (format !== 'all') {
    const match = format === 'feature' ? 'Feature' : 'Series'
    filtered = filtered.filter(c => c.format === match)
  }
  if (genres.length > 0) {
    filtered = filtered.filter(c => c.genreKey && genres.some(g => g === c.genreKey))
  }
  if (budgets.length > 0) {
    filtered = filtered.filter(c => c.budget && budgets.includes(c.budget as BudgetId))
  }

  // Sort
  if (sort === 'top_gem') {
    filtered = [...filtered].sort((a, b) => {
      const sa = a.scoreVisible ? (a.score ?? 0) : 0
      const sb = b.scoreVisible ? (b.score ?? 0) : 0
      return sb - sa
    })
  } else if (sort === 'top_heat') {
    filtered = [...filtered].sort((a, b) => b.heat - a.heat)
  } else {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Compute tied display ranks — same rounded value = same rank
  const displayRanks = new Map<string, number>()
  if (sort === 'top_gem' || sort === 'top_heat') {
    let currentRank = 1
    filtered.forEach((c, i) => {
      if (i > 0) {
        const prev = filtered[i - 1]
        const curVal = sort === 'top_gem' ? Math.round(c.scoreVisible ? (c.score ?? 0) : 0) : c.heat
        const prevVal = sort === 'top_gem' ? Math.round(prev.scoreVisible ? (prev.score ?? 0) : 0) : prev.heat
        if (curVal < prevVal) currentRank = i + 1
      }
      displayRanks.set(c.submissionId, currentRank)
    })
  }

  // Cap at 60
  const visible = filtered.slice(0, 60)

  const sortLabel = (key: SortMode) => {
    const labels: Record<SortMode, string> = { top_gem: 'GEM Score', top_heat: 'Heat', recent: 'Recent' }
    return labels[key]
  }

  const arrow = (key: SortMode) => sort === key ? ' ↓' : ''

  return (
    <div>
      <style>{`
        @keyframes lbCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Sort + filter controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[12px] text-white/50 mr-1">Sort:</span>
          {(['top_gem', 'top_heat', 'recent'] as SortMode[]).map(key => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer border-0 ${sort === key ? 'bg-white/15 text-white' : 'bg-transparent text-white/50 hover:text-white/70'}`}
            >
              {sortLabel(key)}{arrow(key)}
            </button>
          ))}
          <span className="mx-1 text-white/20">|</span>
          <FiltersBar format={format} setFormat={setFormat} genres={genres} setGenres={setGenres} budgets={budgets} setBudgets={setBudgets} />
        </div>
        <span className="text-[12px] text-white/50 shrink-0">
          {visible.length} {visible.length === 1 ? 'script' : 'scripts'}
        </span>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="px-6 py-10 text-center" style={{ background: '#ffffff', border: '1px dashed #d1d5db', borderRadius: 4 }}>
          <p className="text-[14px] font-semibold m-0 mb-1" style={{ color: '#111827' }}>No scripts match your filters</p>
          <p className="text-[13px] m-0" style={{ color: '#6b7280' }}>Try changing the sort or clearing your filters.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((c, idx) => {
            const rounded = c.score ? Math.round(c.score) : null
            const reportHref = `/report/${c.evaluationId}`
            const rank = displayRanks.get(c.submissionId) ?? null
            const staggerDelay = Math.min(idx * 40, 600)

            return (
              <div
                key={c.submissionId}
                className="relative min-w-0 px-3 py-2.5"
                style={{
                  background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  animation: `lbCardIn 0.35s ease-out ${staggerDelay}ms both`,
                }}
              >
                {/* Rank badge */}
                {rank && rank <= 3 && (
                  <div
                    className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white z-10"
                    style={{ background: rank === 1 ? '#7c3aed' : rank === 2 ? '#8b5cf6' : '#a78bfa' }}
                  >
                    {rank}
                  </div>
                )}

                {/* Row 1: poster + title + format/genre/date */}
                <Link href={reportHref} className="no-underline group">
                  <div className="flex items-center gap-2.5">
                    {c.posterUrl ? (
                      <div className="w-[40px] h-[50px] shrink-0 rounded overflow-hidden">
                        <img src={c.posterUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-[40px] h-[50px] shrink-0 rounded flex items-center justify-center" style={{ background: placeholderGradient }}>
                        <span className="text-white text-[10px] font-bold">{c.title.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold m-0 truncate group-hover:text-purple-600 transition-colors" style={{ color: '#111827' }}>{c.title}</p>
                      <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>
                        {[c.format, c.genre?.replace(/^\w/, (ch: string) => ch.toUpperCase()), fmtDate(c.createdAt)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Row 2: GEM Score + rank | Heat + rank | Collaborators | View report → */}
                <div className="flex items-center mt-2 flex-wrap gap-y-1" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>GEM Score</span>
                    <span className="inline-flex">{gemDiamond(5)}</span>
                    {c.scoreVisible ? (
                      <span className="text-[15px] font-extrabold leading-none" style={{ color: '#6d28d9' }}>{rounded || '—'}</span>
                    ) : (
                      <span className="text-[15px] font-extrabold leading-none" style={{ color: '#d1d5db' }}>—</span>
                    )}
                    {c.scoreVisible && c.scoreRank ? (
                      <span className="text-[11px] font-semibold" style={{ color: '#7c3aed' }}>#{c.scoreRank}</span>
                    ) : (
                      <span className="text-[11px] font-semibold" style={{ color: '#9ca3af' }}>Rank: N/A</span>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>Heat</span>
                    <span className="text-[11px]">🔥</span>
                    <span className="text-[15px] font-extrabold leading-none" style={{ color: c.heat > 0 ? '#ea580c' : '#d1d5db' }}>{c.heat}</span>
                    {c.heat > 0 && c.heatRank ? (
                      <span className="text-[11px] font-semibold" style={{ color: '#ea580c' }}>#{c.heatRank}</span>
                    ) : (
                      <span className="text-[11px] font-semibold" style={{ color: '#9ca3af' }}>Rank: N/A</span>
                    )}
                  </div>
                  <div className="ml-4">
                    <CollaboratorsDropdown collaborators={c.collaborators} count={c.collaboratorCount} />
                  </div>
                  <span className="flex-1" />
                  <Link href={reportHref} className="text-[12px] font-semibold no-underline shrink-0" style={{ color: '#7c3aed' }}>
                    View report →
                  </Link>
                </div>

                {/* Row 3: Author card (not clickable) */}
                {c.writer && (
                  <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
                    {c.writer.avatarUrl ? (
                      <img src={c.writer.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white" style={{ background: placeholderGradient }}>
                        {writerInitials(c.writer.fullName)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold m-0 truncate" style={{ color: '#374151' }}>
                        {c.writer.fullName || 'Anonymous'}
                      </p>
                      {c.writer.headline && (
                        <p className="text-[11px] m-0 truncate" style={{ color: '#9ca3af' }}>{c.writer.headline}</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
