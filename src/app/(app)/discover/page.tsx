// /discover — shell page with placeholder cards.
//
// Three sections: Recent, Top by GEM Score, Top by Heat.
// Fake cards with blurred scores for non-members.
// Logged-in Pro users see real data; everyone else sees the shell.
//
// Anuj 2026-05-14 v0.3.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UploadCTAButton } from '@/components/upload-cta-button'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const dynamic = 'force-dynamic'

/* ── Placeholder data ────────────────────────────────────── */

const PLACEHOLDER_RECENT = [
  { title: 'The Salt Flats', format: 'Feature film', genre: 'Drama', score: 84 },
  { title: 'Meridian', format: 'Series', genre: 'Thriller', score: 78 },
  { title: 'Every Last Light', format: 'Feature film', genre: 'Sci-Fi', score: 72 },
]

const PLACEHOLDER_SCORE = [
  { title: 'Iron Chorus', format: 'Series', genre: 'Drama', score: 91 },
  { title: 'The Wren House', format: 'Feature film', genre: 'Horror', score: 87 },
  { title: 'Paper Saints', format: 'Series', genre: 'Comedy-Drama', score: 83 },
]

const PLACEHOLDER_HEAT = [
  { title: 'Exit Wounds', format: 'Feature film', genre: 'Action', score: 79 },
  { title: 'Night Shift', format: 'Series', genre: 'Crime', score: 76 },
  { title: 'The Understory', format: 'Feature film', genre: 'Drama', score: 74 },
]

/* ── Components ──────────────────────────────────────────── */

function PlaceholderCard({
  rank,
  title,
  format,
  genre,
  score,
}: {
  rank: number
  title: string
  format: string
  genre: string
  score: number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-center gap-3">
        {/* Rank */}
        <span className="text-[14px] font-semibold text-gray-300 w-5 text-center shrink-0">
          {rank}
        </span>

        {/* Blurred score badge */}
        <div
          className="shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center select-none"
          style={{ background: '#f3f4f6', border: '1.5px solid #e5e7eb', filter: 'blur(5px)' }}
        >
          <span className="text-[16px] font-extrabold leading-none text-gray-800">{score}</span>
          <span className="text-[7px] font-bold uppercase tracking-wide mt-0.5 text-gray-400">Score</span>
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-gray-800 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[12px] text-gray-400">{format}</span>
            <span className="text-[12px] text-gray-300">·</span>
            <span className="text-[12px] text-gray-400">{genre}</span>
          </div>
        </div>

        {/* Blurred report link */}
        <span
          className="text-[12px] font-semibold text-purple-500 whitespace-nowrap select-none"
          style={{ filter: 'blur(4px)' }}
        >
          View report →
        </span>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-3">
      {label}
    </h2>
  )
}

/* ── Real card (for logged-in Pro users once we have data) ── */

function RealCard({
  rank,
  title,
  format,
  genre,
  score,
  reportHref,
}: {
  rank: number
  title: string
  format: string | null
  genre: string | null
  score: number | null
  reportHref: string | null
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-purple-200 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-[14px] font-semibold text-gray-300 w-5 text-center shrink-0">
          {rank}
        </span>

        {score != null && (
          <div
            className="shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center"
            style={{ background: '#f3f4f6', border: '1.5px solid #e5e7eb' }}
          >
            <span className="text-[16px] font-extrabold leading-none text-gray-800">{Math.round(score)}</span>
            <span className="text-[7px] font-bold uppercase tracking-wide mt-0.5 text-gray-400">Score</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-gray-800 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {format && <span className="text-[12px] text-gray-400">{format}</span>}
            {genre && <><span className="text-[12px] text-gray-300">·</span><span className="text-[12px] text-gray-400">{genre}</span></>}
          </div>
        </div>

        {reportHref && (
          <Link
            href={reportHref}
            className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 whitespace-nowrap"
          >
            View report →
          </Link>
        )}
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────── */

export default async function DiscoverPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  // Check if user is Pro
  let isPro = false
  if (user) {
    const { data: profile } = await auth
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  }

  // Fetch real data for Pro users
  type RealScript = {
    id: string
    title: string
    declared_format: string | null
    user_id: string | null
    created_at: string
    heat_score: number | null
  }
  type EvalData = { id: string; score: number | null; genre: string | null }

  let realRecent: (RealScript & { eval?: EvalData })[] = []
  let realByScore: (RealScript & { eval?: EvalData })[] = []
  let realByHeat: (RealScript & { eval?: EvalData })[] = []

  if (isPro) {
    const service = svc()

    const { data: rows } = await service
      .from('script_submissions')
      .select('id, title, declared_format, user_id, created_at, heat_score')
      .eq('status', 'completed')
      .eq('is_public', true)
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    const scripts = (rows as RealScript[] | null) || []
    const submissionIds = scripts.map(s => s.id)

    const evalBySubmission = new Map<string, EvalData>()
    if (submissionIds.length > 0) {
      const { data: evs } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score, evaluation')
        .in('submission_id', submissionIds)
      for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
        const evJson = e.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
        const genre = (cls.genre_primary as string | undefined) || null
        evalBySubmission.set(e.submission_id, { id: e.id, score: e.weighted_score, genre })
      }
    }

    const withEvals = scripts.map(s => ({ ...s, eval: evalBySubmission.get(s.id) }))

    // Recent = chronological (already sorted)
    realRecent = withEvals.slice(0, 10)

    // By score = sorted by weighted_score descending
    realByScore = [...withEvals]
      .sort((a, b) => (b.eval?.score ?? 0) - (a.eval?.score ?? 0))
      .slice(0, 10)

    // By heat = sorted by heat_score descending
    realByHeat = [...withEvals]
      .sort((a, b) => (b.heat_score ?? 0) - (a.heat_score ?? 0))
      .slice(0, 10)
  }

  const hasRealData = isPro && realRecent.length > 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-[26px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
          Discover
        </h1>
        <p className="mt-2 text-[15px] text-gray-500">
          Scripts ranked. Writers discovered.
        </p>
        {!user && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <UploadCTAButton
              className="text-[13px] font-semibold px-5 py-2 rounded-lg text-white border-0 cursor-pointer transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              Get started
            </UploadCTAButton>
            <Link
              href="/login?redirect=/discover"
              className="text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 rounded-lg border border-gray-200"
            >
              Log in
            </Link>
          </div>
        )}
      </div>

      {/* ── Section: Recent ──────────────────────────────── */}
      <div className="mb-8">
        <SectionHeader label="Recent" />
        <div className="space-y-2">
          {hasRealData
            ? realRecent.map((s, i) => (
                <RealCard
                  key={s.id}
                  rank={i + 1}
                  title={s.title}
                  format={s.declared_format}
                  genre={s.eval?.genre ?? null}
                  score={s.eval?.score ?? null}
                  reportHref={s.eval ? `/report/${s.eval.id}` : null}
                />
              ))
            : PLACEHOLDER_RECENT.map((s, i) => (
                <PlaceholderCard key={i} rank={i + 1} {...s} />
              ))
          }
        </div>
      </div>

      {/* Inline CTA (after first section) */}
      {!isPro && (
        <div className="mb-8 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-6 text-center">
          <p className="text-[14px] font-semibold text-gray-800 m-0 mb-1">
            Scores and reports are for GEM members.
          </p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">
            Get your script evaluated to unlock full access.
          </p>
          <UploadCTAButton
            className="text-[13px] font-semibold px-5 py-2 rounded-lg text-white border-0 cursor-pointer transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            Get started
          </UploadCTAButton>
        </div>
      )}

      {/* ── Section: Top by GEM Score ────────────────────── */}
      <div className="mb-8">
        <SectionHeader label="Top by GEM Score" />
        <div className="space-y-2">
          {hasRealData
            ? realByScore.map((s, i) => (
                <RealCard
                  key={s.id}
                  rank={i + 1}
                  title={s.title}
                  format={s.declared_format}
                  genre={s.eval?.genre ?? null}
                  score={s.eval?.score ?? null}
                  reportHref={s.eval ? `/report/${s.eval.id}` : null}
                />
              ))
            : PLACEHOLDER_SCORE.map((s, i) => (
                <PlaceholderCard key={i} rank={i + 1} {...s} />
              ))
          }
        </div>
      </div>

      {/* ── Section: Top by Heat ─────────────────────────── */}
      <div className="mb-8">
        <SectionHeader label="Top by Heat" />
        <div className="space-y-2">
          {hasRealData
            ? realByHeat.map((s, i) => (
                <RealCard
                  key={s.id}
                  rank={i + 1}
                  title={s.title}
                  format={s.declared_format}
                  genre={s.eval?.genre ?? null}
                  score={s.eval?.score ?? null}
                  reportHref={s.eval ? `/report/${s.eval.id}` : null}
                />
              ))
            : PLACEHOLDER_HEAT.map((s, i) => (
                <PlaceholderCard key={i} rank={i + 1} {...s} />
              ))
          }
        </div>
      </div>
    </div>
  )
}
