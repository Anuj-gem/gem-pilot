// /leaderboard — public script directory, ranked by score.
//
// Dashboard-style white expanded cards. No loglines, no grow-heat.
// Collaborators dropdown on score/heat row. Author card inline.
//
// Anuj 2026-05-28 v0.2 — redesign to match dashboard cards.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { getScriptStats } from '@/lib/script-stats'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LeaderboardCards } from '@/components/discover/leaderboard-cards'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 60

const VALID_GENRE_IDS = ['drama', 'comedy', 'thriller', 'horror', 'sci-fi', 'fantasy', 'crime', 'romance', 'action', 'family', 'documentary', 'musical', 'western'] as const
type GenreId = (typeof VALID_GENRE_IDS)[number]
const VALID_BUDGET_IDS = ['micro', 'indie', 'mid', 'studio', 'agnostic'] as const
type BudgetId = (typeof VALID_BUDGET_IDS)[number]

function parseCsv<T extends string>(input: string | undefined, valid: readonly T[]): T[] {
  if (!input) return []
  return input.split(',').map((s) => s.trim()).filter((s): s is T => (valid as readonly string[]).includes(s))
}

interface PageProps {
  searchParams: Promise<{ sort?: string; format?: string; genres?: string; budgets?: string }>
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  // Determine insider status (Pro/trialing member)
  let isInsider = false
  if (user) {
    const service = svc()
    const { data: profile } = await service
      .from('profiles')
      .select('subscription_status, account_type')
      .eq('id', user.id)
      .single()
    isInsider = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing' || profile?.account_type === 'producer' || profile?.account_type === 'admin'
  }

  const sp = await searchParams
  const initialSort = (['recent', 'top_gem', 'top_heat'].includes(sp.sort || '')
    ? sp.sort
    : 'top_gem') as 'recent' | 'top_gem' | 'top_heat'
  const initialFormat = (['all', 'feature', 'series'].includes(sp.format || '')
    ? sp.format
    : 'all') as 'all' | 'feature' | 'series'
  const initialGenres = parseCsv<GenreId>(sp.genres, VALID_GENRE_IDS)
  const initialBudgets = parseCsv<BudgetId>(sp.budgets, VALID_BUDGET_IDS)

  const service = svc()

  // All public completed scripts
  const { data: rows } = await service
    .from('script_submissions')
    .select('id, title, declared_format, created_at, user_id, report_privacy, allow_reviews, allow_industry, heat_score, poster_url')
    .eq('status', 'completed')
    .eq('is_public', true)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  type SubRow = {
    id: string; title: string; declared_format: string | null; created_at: string
    user_id: string | null; report_privacy: { show_score?: boolean } | null
    allow_reviews: boolean | null; allow_industry: boolean | null
    heat_score: number | null; poster_url: string | null
  }
  const scripts = (rows as SubRow[] | null) || []
  const submissionIds = scripts.map((s) => s.id)
  const writerIds = Array.from(new Set(scripts.map((s) => s.user_id).filter(Boolean) as string[]))

  // Evaluations + writers + stats
  const [{ data: evs }, { data: writers }, stats] = await Promise.all([
    service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, genre_cls:evaluation->classification->>genre_primary, genre_fmt:evaluation->format_detection->>genre_primary, budget_raw:evaluation->packaging->budget_tier->>tier')
      .in('submission_id', submissionIds),
    service.from('profiles').select('id, handle, full_name, avatar_url, headline').in('id', writerIds),
    getScriptStats(submissionIds),
  ])

  type EvalRow = { id: string; weighted_score: number | null; genre: string | null; genreKey: string | null; budget: BudgetId | null }
  const evalBySubmission = new Map<string, EvalRow>()
  for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; genre_cls: string | null; genre_fmt: string | null; budget_raw: string | null }[] | null) || []) {
    const genre = e.genre_cls || e.genre_fmt || null
    const genreKey = genre ? genre.toLowerCase().replace(/[^a-z]/g, '') : null
    const rawBudget = e.budget_raw?.toLowerCase() ?? null
    const budget = (rawBudget && (VALID_BUDGET_IDS as readonly string[]).includes(rawBudget)) ? (rawBudget as BudgetId) : null
    evalBySubmission.set(e.submission_id, {
      id: e.id, weighted_score: e.weighted_score, genre, genreKey, budget,
    })
  }

  type WriterRow = { id: string; handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null }
  const writerById = new Map<string, WriterRow>()
  for (const w of (writers as WriterRow[] | null) || []) {
    writerById.set(w.id, w)
  }

  // Collaborator counts per script
  const collabCountByScript = new Map<string, number>()
  type CollabDetail = { id: string; email: string; name: string | null; avatarUrl: string | null; role: string; status: string }
  const collabsByScript = new Map<string, CollabDetail[]>()

  if (submissionIds.length > 0) {
    const { data: collabRows } = await service
      .from('script_collaborators')
      .select('id, submission_id, collaborator_email, collaborator_id, role, role_other, status')
      .in('submission_id', submissionIds)
      .in('status', ['accepted', 'pending'])

    const collabUserIds = (collabRows || []).map((c: any) => c.collaborator_id).filter(Boolean) as string[]
    let collabProfiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
    if (collabUserIds.length > 0) {
      const { data: profileRows } = await service
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', collabUserIds)
      if (profileRows) {
        collabProfiles = Object.fromEntries(profileRows.map((p: any) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]))
      }
    }

    for (const c of (collabRows || []) as any[]) {
      const roleName = c.role === 'other' ? (c.role_other || 'Collaborator') : c.role.replace('_', ' ').replace(/^\w/, (ch: string) => ch.toUpperCase())
      const prof = c.collaborator_id ? collabProfiles[c.collaborator_id] : null
      const info: CollabDetail = { id: c.id, email: c.collaborator_email, name: prof?.full_name || null, avatarUrl: prof?.avatar_url || null, role: roleName, status: c.status }
      const list = collabsByScript.get(c.submission_id) || []
      list.push(info)
      collabsByScript.set(c.submission_id, list)
      if (c.status === 'accepted') {
        collabCountByScript.set(c.submission_id, (collabCountByScript.get(c.submission_id) || 0) + 1)
      }
    }
  }

  // Score + heat ranks across all public scripts
  // Tied ranks: same rounded score = same rank number
  const scoreRankMap = new Map<string, number>()
  const heatRankMap = new Map<string, number>()
  const publicWithScores = scripts.map(s => ({
    id: s.id,
    score: evalBySubmission.get(s.id)?.weighted_score ?? 0,
    roundedScore: Math.round(evalBySubmission.get(s.id)?.weighted_score ?? 0),
    heat: s.heat_score ?? 0,
  }))
  const byScore = [...publicWithScores].sort((a, b) => b.roundedScore - a.roundedScore)
  let currentScoreRank = 1
  byScore.forEach((s, i) => {
    if (i > 0 && s.roundedScore < byScore[i - 1].roundedScore) {
      currentScoreRank = i + 1
    }
    scoreRankMap.set(s.id, currentScoreRank)
  })
  const byHeat = [...publicWithScores].sort((a, b) => b.heat - a.heat)
  let currentHeatRank = 1
  byHeat.forEach((s, i) => {
    if (i > 0 && s.heat < byHeat[i - 1].heat) {
      currentHeatRank = i + 1
    }
    heatRankMap.set(s.id, currentHeatRank)
  })

  // 7-day new script count for header
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const recentCount = scripts.filter(s => s.created_at >= sevenDaysAgo).length

  // Build card data
  type LeaderboardCard = {
    submissionId: string
    evaluationId: string
    title: string
    format: string | null
    genre: string | null
    genreKey: string | null
    budget: BudgetId | null
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

  const cards: LeaderboardCard[] = scripts
    .map((s): LeaderboardCard | null => {
      const ev = evalBySubmission.get(s.id)
      if (!ev) return null
      const wp = s.user_id ? writerById.get(s.user_id) : null
      const st = stats.get(s.id)
      const scoreVisible = s.report_privacy?.show_score !== false
      return {
        submissionId: s.id,
        evaluationId: ev.id,
        title: s.title,
        format: s.declared_format,
        genre: ev.genre,
        genreKey: ev.genreKey,
        budget: ev.budget,
        score: ev.weighted_score,
        scoreVisible,
        heat: s.heat_score ?? 0,
        scoreRank: scoreRankMap.get(s.id) ?? null,
        heatRank: heatRankMap.get(s.id) ?? null,
        posterUrl: s.poster_url ?? null,
        createdAt: s.created_at,
        reviewCount: st?.reviewCount ?? 0,
        avgPeerScore: st?.avgPeerScore ?? null,
        collaboratorCount: collabCountByScript.get(s.id) ?? 0,
        collaborators: collabsByScript.get(s.id) ?? [],
        writer: wp ? { handle: wp.handle, fullName: wp.full_name, avatarUrl: wp.avatar_url, headline: wp.headline } : null,
      }
    })
    .filter((c): c is LeaderboardCard => c !== null)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white m-0" style={{ fontFamily: 'Georgia, serif' }}>
          Discover
        </h1>
        <p className="text-[13px] text-white/50 mt-1 m-0">
          {cards.length} scripts published{recentCount > 0 ? ` · ${recentCount} added this week` : ''}
        </p>
      </div>

      {/* Logged-out CTA */}
      {!user && (
        <div
          className="rounded-2xl px-6 py-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05) 65%), rgba(255,255,255,0.05)',
            border: '1.5px solid rgba(124,58,237,0.3)',
          }}
        >
          <p className="text-[15px] font-bold text-white m-0 leading-snug">
            Get your scripts ranked among the top unproduced screenplays
          </p>
          <Link
            href="/get-started"
            className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-bold text-white transition-all hover:brightness-110"
            style={{ background: '#7c3aed' }}
          >
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      )}

      <LeaderboardCards
        cards={cards}
        initialSort={initialSort}
        initialFilters={{ format: initialFormat, genres: initialGenres, budgets: initialBudgets }}
        basePath="/leaderboard"
        isInsider={isInsider}
        isLoggedIn={!!user}
      />
    </div>
  )
}
