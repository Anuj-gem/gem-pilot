// /leaderboard — public script directory, ranked by score.
//
// Shows all non-hidden completed scripts (up to 25), sorted by GEM score.
// Login-gated for now. Loglines stripped from cards — writers and public
// see title, genre, format, score, writer name only.
//
// Anuj 2026-05-13 v0.1.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'
import { DiscoverGrid, type DiscoverCard } from '@/components/discover/discover-grid'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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

  // All public completed scripts — the leaderboard.
  const { data: rows } = await service
    .from('script_submissions')
    .select('id, title, declared_format, created_at, user_id, report_privacy, allow_reviews, allow_industry, heat_score')
    .eq('status', 'completed')
    .eq('is_public', true)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
  type SubRow = {
    id: string
    title: string
    declared_format: string | null
    created_at: string
    user_id: string | null
    report_privacy: { show_score?: boolean } | null
    allow_reviews: boolean | null
    allow_industry: boolean | null
    heat_score: number | null
  }
  const scripts = (rows as SubRow[] | null) || []
  const submissionIds = scripts.map((s) => s.id)
  const writerIds = Array.from(new Set(scripts.map((s) => s.user_id).filter(Boolean) as string[]))

  // Only extract the 3 fields we need from the evaluation JSONB — avoids
  // pulling the full ~50KB blob per script.  Anuj 2026-05-18 perf fix.
  const [{ data: evs }, { data: writers }, stats] = await Promise.all([
    service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, genre_cls:evaluation->classification->>genre_primary, genre_fmt:evaluation->format_detection->>genre_primary, budget_raw:evaluation->packaging->budget_tier->>tier, logline:evaluation->>positioning_hook')
      .in('submission_id', submissionIds),
    service.from('profiles').select('id, handle, full_name, avatar_url, headline').in('id', writerIds),
    getScriptStats(submissionIds),
  ])

  type EvalRow = { id: string; weighted_score: number | null; genre: string | null; genreKey: string | null; budget: BudgetId | null; logline: string | null }
  const evalBySubmission = new Map<string, EvalRow>()
  for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; genre_cls: string | null; genre_fmt: string | null; budget_raw: string | null; logline: string | null }[] | null) || []) {
    const genre = e.genre_cls || e.genre_fmt || null
    const genreKey = genre ? genre.toLowerCase().replace(/[^a-z]/g, '') : null
    const rawBudget = e.budget_raw?.toLowerCase() ?? null
    const budget = (rawBudget && (VALID_BUDGET_IDS as readonly string[]).includes(rawBudget)) ? (rawBudget as BudgetId) : null
    evalBySubmission.set(e.submission_id, {
      id: e.id, weighted_score: e.weighted_score, genre, genreKey, budget, logline: e.logline,
    })
  }

  type WriterRow = { handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null }
  type WriterRowWithId = WriterRow & { id: string }
  const writerById = new Map<string, WriterRow>()
  for (const w of (writers as WriterRowWithId[] | null) || []) {
    writerById.set(w.id, { handle: w.handle, full_name: w.full_name, avatar_url: w.avatar_url, headline: w.headline })
  }

  // Build card data — loglines passed through (shown blurred for non-insiders).
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
        logline: ev.logline,
        selznick_score: ev.weighted_score,
        heat_score: s.heat_score ?? 0,
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
        heat: s.heat_score ?? 0,
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
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
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
            Get your scripts in front of our industry partner network
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
      <DiscoverGrid
        cards={cards}
        initialSort={initialSort}
        initialFilters={{
          format: initialFormat,
          genres: initialGenres,
          budgets: initialBudgets,
        }}
        basePath="/leaderboard"
        isInsider={isInsider}
      />
    </div>
  )
}
