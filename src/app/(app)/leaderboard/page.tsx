// /leaderboard — public script directory, ranked by score.
//
// Shows all non-hidden completed scripts (up to 25), sorted by GEM score.
// Login-gated for now. Loglines stripped from cards — writers and public
// see title, genre, format, score, writer name only.
//
// Anuj 2026-05-13 v0.1.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'
import { DiscoverGrid, type DiscoverCard } from '@/components/discover/discover-grid'

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
  // Auth-gated for now — Anuj wants to open it up later.
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/leaderboard')

  const sp = await searchParams
  const initialSort = (['recent', 'top_gem', 'most_reviewed'].includes(sp.sort || '')
    ? sp.sort
    : 'top_gem') as 'recent' | 'top_gem' | 'most_reviewed'
  const initialFormat = (['all', 'feature', 'series'].includes(sp.format || '')
    ? sp.format
    : 'all') as 'all' | 'feature' | 'series'
  const initialGenres = parseCsv<GenreId>(sp.genres, VALID_GENRE_IDS)
  const initialBudgets = parseCsv<BudgetId>(sp.budgets, VALID_BUDGET_IDS)

  const service = svc()

  // All non-hidden completed scripts, capped at 25.
  // NOT filtered by is_public — we show everything that isn't hidden.
  const { data: rows } = await service
    .from('script_submissions')
    .select('id, title, declared_format, created_at, user_id, report_privacy, allow_reviews, allow_industry')
    .eq('status', 'completed')
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
    .limit(25)
  type SubRow = {
    id: string
    title: string
    declared_format: string | null
    created_at: string
    user_id: string | null
    report_privacy: { show_score?: boolean } | null
    allow_reviews: boolean | null
    allow_industry: boolean | null
  }
  const scripts = (rows as SubRow[] | null) || []
  const submissionIds = scripts.map((s) => s.id)
  const writerIds = Array.from(new Set(scripts.map((s) => s.user_id).filter(Boolean) as string[]))

  const [{ data: evs }, { data: writers }, stats] = await Promise.all([
    service.from('script_evaluations').select('id, submission_id, weighted_score, evaluation').in('submission_id', submissionIds),
    service.from('profiles').select('id, handle, full_name, avatar_url, headline').in('id', writerIds),
    getScriptStats(submissionIds),
  ])

  type EvalRow = { id: string; weighted_score: number | null; genre: string | null; genreKey: string | null; budget: BudgetId | null }
  const evalBySubmission = new Map<string, EvalRow>()
  for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
    const evJson = e.evaluation as Record<string, unknown> | null
    const fmt = (evJson?.format_detection as Record<string, unknown> | undefined) || {}
    const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
    const genre =
      (cls.genre_primary as string | undefined) ||
      (fmt.genre_primary as string | undefined) ||
      null
    const genreKey = genre ? genre.toLowerCase().replace(/[^a-z]/g, '') : null
    const packaging = (evJson?.packaging as Record<string, unknown> | undefined) || {}
    const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
    const rawBudget = (budgetTier?.tier as string | undefined)?.toLowerCase() ?? null
    const budget = (rawBudget && (VALID_BUDGET_IDS as readonly string[]).includes(rawBudget)) ? (rawBudget as BudgetId) : null
    evalBySubmission.set(e.submission_id, {
      id: e.id, weighted_score: e.weighted_score, genre, genreKey, budget,
    })
  }

  type WriterRow = { handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null }
  type WriterRowWithId = WriterRow & { id: string }
  const writerById = new Map<string, WriterRow>()
  for (const w of (writers as WriterRowWithId[] | null) || []) {
    writerById.set(w.id, { handle: w.handle, full_name: w.full_name, avatar_url: w.avatar_url, headline: w.headline })
  }

  // Build card data — strip loglines for Leaderboard view.
  const cards: DiscoverCard[] = scripts
    .map((s): DiscoverCard | null => {
      const ev = evalBySubmission.get(s.id)
      if (!ev) return null
      const wp = s.user_id ? writerById.get(s.user_id) : null
      const st = stats.get(s.id)
      const scoreVisible = s.report_privacy?.show_score !== false
      const data: ScriptCardData = {
        submission_id: s.id,
        evaluation_id: ev.id,
        title: s.title,
        format: s.declared_format,
        genre: ev.genre,
        logline: null, // intentionally stripped — Leaderboard hides loglines
        selznick_score: ev.weighted_score,
        writer_handle: wp?.handle ?? null,
        writer_name: wp?.full_name ?? null,
        writer_avatar_url: wp?.avatar_url ?? null,
        review_count: st?.reviewCount ?? 0,
        avg_peer_score: st?.avgPeerScore ?? null,
        score_visible: scoreVisible,
        allow_reviews: s.allow_reviews ?? true,
        allow_industry: s.allow_industry ?? true,
      }
      return {
        data,
        recentTs: new Date(s.created_at).getTime(),
        selznick: Number(ev.weighted_score ?? 0),
        scoreVisible,
        reviews: st?.reviewCount ?? 0,
        genreKey: ev.genreKey,
        budget: ev.budget,
      }
    })
    .filter((c): c is DiscoverCard => c !== null)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="mt-1 text-sm text-gray-500">Scripts from the GEM community, ranked by score.</p>
      </div>
      <DiscoverGrid
        cards={cards}
        initialSort={initialSort}
        initialFilters={{
          format: initialFormat,
          genres: initialGenres,
          budgets: initialBudgets,
        }}
        basePath="/leaderboard"
      />
    </div>
  )
}
