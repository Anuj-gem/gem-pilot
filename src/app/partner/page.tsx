// /partner — producer "industry partner" dashboard.
//
// Server component. Auth + role gating sequence:
//   1. Not signed in           → /login?redirect=/partner
//   2. Signed in, not producer → /dashboard (writer side)
//   3. Producer with no lane   → /onboarding/producer
//   4. Producer with lane      → render this page
//
// Data shape: pull all script_matches for the current producer where
// status != 'passed', join in submission + evaluation. Sort interested →
// commented → opened → pending, then created_at DESC. Cap at 50.
//
// Layout mirrors `Selznick_3/gem-app/../GEM/partner_dashboard_mockup_v2.html`:
//   - Header: "Welcome back, X" + Industry partner badge
//   - Greeting strip: gold rule + "Your inbox this week — N new matches"
//   - Lane chip + edit-lane link
//   - Filter row (static for v1)
//   - Hero "top choice" card (highest-score pending/opened)
//   - Rest-of-list cards
//   - Empty state when no rows

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { LaneChip } from '@/components/partner/lane-chip'
import { HeroMatchCard, MatchCard, type MatchCardData } from '@/components/partner/match-card'

export const dynamic = 'force-dynamic'

type MatchStatus = 'pending' | 'opened' | 'interested' | 'passed' | 'commented'

// Status sort order: most actionable / most recent activity first.
const STATUS_RANK: Record<MatchStatus, number> = {
  interested: 0,
  commented: 1,
  opened: 2,
  pending: 3,
  passed: 4,
}

const FORMAT_LABEL: Record<string, string> = {
  feature: 'Feature',
  series: 'Series',
  'feature film': 'Feature',
}

const BUDGET_TAG_LABEL: Record<string, string> = {
  micro: 'Sub-$1M',
  indie: '$1–15M',
  mid: '$15–50M',
  studio: '$50M+',
}

function titleCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

interface RawMatchRow {
  id: string
  status: MatchStatus
  created_at: string
  script_submissions: {
    id: string
    title: string
    declared_format: string | null
    script_evaluations:
      | Array<{
          weighted_score: number | null
          tier: string | null
          evaluation: {
            classification?: { genre_primary?: string; genre_tags?: string[] }
            positioning_hook?: string
            packaging?: { budget_tier?: { tier?: string } }
          } | null
          edited_fields?: { logline?: string } | null
        }>
      | {
          weighted_score: number | null
          tier: string | null
          evaluation: {
            classification?: { genre_primary?: string; genre_tags?: string[] }
            positioning_hook?: string
            packaging?: { budget_tier?: { tier?: string } }
          } | null
          edited_fields?: { logline?: string } | null
        }
      | null
  } | null
}

function shapeMatch(row: RawMatchRow): MatchCardData | null {
  const sub = row.script_submissions
  if (!sub) return null
  const evalRaw = Array.isArray(sub.script_evaluations)
    ? sub.script_evaluations[0]
    : sub.script_evaluations
  const evaluation = evalRaw?.evaluation ?? null

  // Prefer the writer's edited headline if they've set one — keeps the
  // dashboard in sync with what they signed off on as the public framing.
  const editedHeadline =
    typeof evalRaw?.edited_fields?.logline === 'string' &&
    evalRaw.edited_fields.logline.trim().length > 0
      ? evalRaw.edited_fields.logline.trim()
      : null
  const headline = editedHeadline ?? evaluation?.positioning_hook ?? null

  const score =
    typeof evalRaw?.weighted_score === 'number'
      ? evalRaw.weighted_score
      : evalRaw?.weighted_score != null
        ? Number(evalRaw.weighted_score)
        : null

  const formatRaw =
    sub.declared_format ?? evaluation?.classification?.genre_primary ?? ''
  const formatTag = formatRaw
    ? FORMAT_LABEL[formatRaw.toLowerCase()] || titleCase(formatRaw)
    : null

  const genreTags: string[] = []
  if (evaluation?.classification?.genre_primary) {
    genreTags.push(titleCase(evaluation.classification.genre_primary))
  }
  for (const t of evaluation?.classification?.genre_tags ?? []) {
    if (typeof t === 'string' && t.trim() && !genreTags.includes(titleCase(t))) {
      genreTags.push(titleCase(t))
    }
  }

  const budgetTier = evaluation?.packaging?.budget_tier?.tier
  const budgetTag = budgetTier
    ? BUDGET_TAG_LABEL[budgetTier.toLowerCase()] || titleCase(budgetTier)
    : null

  const tags: string[] = []
  if (formatTag) tags.push(formatTag)
  for (const g of genreTags.slice(0, 2)) tags.push(g)
  if (budgetTag) tags.push(budgetTag)

  return {
    matchId: row.id,
    status: row.status,
    title: sub.title || 'Untitled',
    score: typeof score === 'number' && !Number.isNaN(score) ? score : null,
    headline,
    tags,
  }
}

export default async function PartnerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/partner')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, account_type, lane')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') {
    redirect('/dashboard')
  }
  if (!profile?.lane) {
    redirect('/onboarding/producer')
  }

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'there'

  // Fetch matches. RLS already filters by producer_id, but we add an
  // explicit predicate so it's obvious in the code path. Pull joined
  // submission + most-recent evaluation for the card render.
  const { data: rawMatches } = await supabase
    .from('script_matches')
    .select(
      `
      id, status, created_at,
      script_submissions (
        id, title, declared_format,
        script_evaluations ( weighted_score, tier, evaluation, edited_fields )
      )
      `
    )
    .eq('producer_id', user.id)
    .neq('status', 'passed')
    .order('created_at', { ascending: false })
    .limit(50)

  const matches = ((rawMatches ?? []) as unknown as RawMatchRow[])
    .map(shapeMatch)
    .filter((m): m is MatchCardData => m !== null)
    .sort((a, b) => {
      const ar = STATUS_RANK[a.status] ?? 99
      const br = STATUS_RANK[b.status] ?? 99
      if (ar !== br) return ar - br
      return 0 // created_at order is preserved by the SQL sort
    })

  // The hero slot is the highest-scoring pending/opened match. Falls back
  // to the highest-scoring match overall if everything has been reacted to.
  const heroCandidates = matches.filter(
    (m) => m.status === 'pending' || m.status === 'opened'
  )
  const sortedByScore = [...(heroCandidates.length > 0 ? heroCandidates : matches)].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  )
  const hero = sortedByScore[0] ?? null
  const restOfList = matches.filter((m) => !hero || m.matchId !== hero.matchId)

  const newMatchCount = matches.filter(
    (m) => m.status === 'pending' || m.status === 'opened'
  ).length

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16">
        {/* Top row — welcome + industry partner badge + edit lane link */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0">
              Welcome back, {firstName}.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-bold px-2.5 py-1 rounded-full"
              style={{
                color: 'var(--gem-accent)',
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.30)',
              }}
            >
              Industry partner
            </span>
          </div>
        </div>

        {/* Greeting strip — gold rule + "Your inbox this week" */}
        <div className="mb-6">
          <div
            aria-hidden
            style={{
              width: 48,
              height: 2,
              background: 'var(--gem-gold)',
              borderRadius: 1,
              marginBottom: 14,
            }}
          />
          <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-1">
            Your inbox this week —{' '}
            <span style={{ color: 'var(--gem-accent)' }}>
              {newMatchCount} new {newMatchCount === 1 ? 'match' : 'matches'}
            </span>{' '}
            in your lane
          </h2>
          <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0 mb-4">
            Curated against the lane you set up. Newest at the top.
          </p>
          <LaneChip lane={profile.lane} />
        </div>

        {/* Filter row — static label for v1, no filter switching yet. */}
        <div
          className="flex items-center gap-3 flex-wrap py-3 mb-6"
          style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
        >
          <span
            className="inline-flex items-center gap-2 text-[13px] font-medium px-3 py-1.5 rounded-md"
            style={{
              background: '#fff',
              border: '1px solid var(--gem-gray-700)',
              color: 'var(--gem-gray-200)',
            }}
          >
            Showing matches in your lane
          </span>
          <span className="text-[12.5px] text-[var(--gem-gray-400)] ml-auto">
            Sort: most recent
          </span>
        </div>

        {/* Hero + rest, or empty state */}
        {matches.length === 0 ? (
          <div
            className="text-center rounded-2xl px-6 py-16"
            style={{
              border: '1px dashed var(--gem-gray-700)',
              background: 'var(--gem-gray-900)',
            }}
          >
            <Inbox
              size={28}
              className="mx-auto mb-3 text-[var(--gem-gray-500)]"
            />
            <p className="text-[15px] font-semibold text-[var(--gem-gray-100)] m-0 mb-1">
              No matches yet.
            </p>
            <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0">
              We&apos;ll notify you the moment a script in your lane comes through.
            </p>
            <Link
              href="/discover"
              className="inline-block mt-4 text-[13px] font-medium text-[var(--gem-accent)] hover:text-[var(--gem-accent-hover)]"
            >
              Browse Discover →
            </Link>
          </div>
        ) : (
          <>
            {hero && (
              <div className="mb-8">
                <HeroMatchCard data={hero} />
              </div>
            )}
            {restOfList.length > 0 && (
              <>
                <div className="flex items-baseline gap-3 mb-3">
                  <h3 className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-400)] m-0">
                    More matches in your lane
                  </h3>
                  <span className="text-[12.5px] text-[var(--gem-gray-400)]">
                    {restOfList.length}{' '}
                    {restOfList.length === 1 ? 'script' : 'scripts'}
                  </span>
                </div>
                <div className="space-y-3">
                  {restOfList.map((m) => (
                    <MatchCard key={m.matchId} data={m} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
