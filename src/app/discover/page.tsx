// /discover — community surface (login-gated).
// v0.6 redesign: typographic poster grid, activity strip, full-width grid,
// client-side sort/filter. No leaderboard sidebar (writers live elsewhere).
//
// Anuj 2026-04-30.

import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
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

// Re-render at most every 60s. Was force-dynamic; the latency that gave us
// (re-fetching everything on every tab click) was the bigger UX cost.
export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ sort?: string; format?: string; genres?: string; budgets?: string }>
}

const VALID_GENRE_IDS = ['drama', 'comedy', 'thriller', 'horror', 'sci-fi', 'fantasy', 'crime', 'romance', 'action', 'family', 'documentary', 'musical', 'western'] as const
type GenreId = (typeof VALID_GENRE_IDS)[number]
const VALID_BUDGET_IDS = ['micro', 'indie', 'mid', 'studio', 'agnostic'] as const
type BudgetId = (typeof VALID_BUDGET_IDS)[number]

function parseCsv<T extends string>(input: string | undefined, valid: readonly T[]): T[] {
  if (!input) return []
  return input.split(',').map((s) => s.trim()).filter((s): s is T => (valid as readonly string[]).includes(s))
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/discover')

  const sp = await searchParams
  const initialSort = (['recent', 'top_gem', 'most_reviewed'].includes(sp.sort || '')
    ? sp.sort
    : 'recent') as 'recent' | 'top_gem' | 'most_reviewed'
  const initialFormat = (['all', 'feature', 'series'].includes(sp.format || '')
    ? sp.format
    : 'all') as 'all' | 'feature' | 'series'
  const initialGenres = parseCsv<GenreId>(sp.genres, VALID_GENRE_IDS)
  const initialBudgets = parseCsv<BudgetId>(sp.budgets, VALID_BUDGET_IDS)

  const service = svc()

  // Pull scripts first, then enrich with evaluations + profiles via separate
  // batched queries. Avoids any PostgREST relation-name ambiguity caused by
  // having multiple tables with FKs to script_submissions.
  const { data: rows } = await service
    .from('script_submissions')
    .select('id, title, declared_format, created_at, user_id')
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(200)
  type SubRow = { id: string; title: string; declared_format: string | null; created_at: string; user_id: string | null }
  const scripts = (rows as SubRow[] | null) || []
  const submissionIds = scripts.map((s) => s.id)
  const writerIds = Array.from(new Set(scripts.map((s) => s.user_id).filter(Boolean) as string[]))

  const [{ data: evs }, { data: writers }, stats] = await Promise.all([
    service.from('script_evaluations').select('id, submission_id, weighted_score, evaluation').in('submission_id', submissionIds),
    service.from('profiles').select('id, handle, full_name, avatar_url, headline').in('id', writerIds),
    getScriptStats(submissionIds),
  ])

  type EvalRow = { id: string; weighted_score: number | null; logline: string | null; genre: string | null; genreKey: string | null; budget: BudgetId | null }
  const evalBySubmission = new Map<string, EvalRow>()
  for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
    const evJson = e.evaluation as Record<string, unknown> | null
    const fmt = (evJson?.format_detection as Record<string, unknown> | undefined) || {}
    const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
    const logline =
      (fmt.logline_one_line as string | undefined) ||
      (evJson?.positioning_hook as string | undefined) ||
      null
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
      id: e.id, weighted_score: e.weighted_score, logline, genre, genreKey, budget,
    })
  }

  type WriterRow = { handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null }
  type WriterRowWithId = WriterRow & { id: string }
  const writerById = new Map<string, WriterRow>()
  for (const w of (writers as WriterRowWithId[] | null) || []) {
    writerById.set(w.id, { handle: w.handle, full_name: w.full_name, avatar_url: w.avatar_url, headline: w.headline })
  }

  // Build card data (drop scripts with no evaluation).
  const cards: DiscoverCard[] = scripts
    .map((s): DiscoverCard | null => {
      const ev = evalBySubmission.get(s.id)
      if (!ev) return null
      const wp = s.user_id ? writerById.get(s.user_id) : null
      const st = stats.get(s.id)
      const data: ScriptCardData = {
        submission_id: s.id,
        evaluation_id: ev.id,
        title: s.title,
        format: s.declared_format,
        genre: ev.genre,
        logline: ev.logline,
        selznick_score: ev.weighted_score,
        writer_handle: wp?.handle ?? null,
        writer_name: wp?.full_name ?? null,
        writer_avatar_url: wp?.avatar_url ?? null,
        review_count: st?.reviewCount ?? 0,
        avg_peer_score: st?.avgPeerScore ?? null,
      }
      return {
        data,
        recentTs: new Date(s.created_at).getTime(),
        selznick: Number(ev.weighted_score ?? 0),
        reviews: st?.reviewCount ?? 0,
        genreKey: ev.genreKey,
        budget: ev.budget,
      }
    })
    .filter((c): c is DiscoverCard => c !== null)

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <Nav />
      <main className="max-w-6xl mx-auto px-5 py-6">
        {/* No big page title — sort tabs + filter pills do the chrome work,
            and the nav already tells the user where they are. App-shell
            feel, not blog-post feel. (Anuj 2026-04-30) */}
        <DiscoverGrid
          cards={cards}
          initialSort={initialSort}
          initialFilters={{
            format: initialFormat,
            genres: initialGenres,
            budgets: initialBudgets,
          }}
        />
      </main>
    </div>
  )
}
