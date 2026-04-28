// /partner — producer "industry partner" dashboard.
//
// Selznick-4 v4 design pass (2026-04-25): cut chrome down to the bare
// minimum — small header, small tab links, one feed of cards. Everything
// the producer doesn't need to see while scanning is gone.
//
// Server component. Auth + role gating sequence:
//   1. Not signed in           → /login?redirect=/partner
//   2. Signed in, not producer → /dashboard (writer side)
//   3. Producer with no lane   → /onboarding/producer
//   4. Producer with lane      → render this page
//
// Data shape: pull all script_matches for the current producer (status
// filtered client-side via tabs). Sort interested → commented → opened →
// pending, then created_at DESC. Cap at 100.
//
// Visit tracking preserved — read OLD `last_visited_partner_at` BEFORE
// updating it so we can mark each card "New since last visit".
//
// What's gone vs the prior v3 layout:
//   - "X new since you last visited" banner strip → just per-card "New" pills
//   - "Welcome back" + "Your inbox this week" greeting block → one line
//   - Industry partner badge → dropped (the existence of the page is enough)
//   - "Showing matches in your lane" filter row → dropped
//   - LaneChip (large) → small text "Lane: X · Edit" in the header
//   - Tag filter bar + sort row → dropped (default is score desc)
//   - "Top choice for you this week" hero card → dropped (every card same size)
//   - "Load more" pagination → dropped (show all, scroll)

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { DashboardTabs, type DashboardMatchData } from '@/components/partner/dashboard-tabs'
import { RealtimeRefresh } from '@/components/partner/realtime-refresh'

export const dynamic = 'force-dynamic'

type MatchStatus = 'pending' | 'opened' | 'interested' | 'passed' | 'commented'

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
  unmatched_at: string | null
  script_submissions: {
    id: string
    title: string
    declared_format: string | null
    tags: string[] | null
    hidden_at: string | null
    is_public: boolean | null
    script_evaluations:
      | Array<{
          weighted_score: number | null
          tier: string | null
          evaluation: {
            classification?: {
              genre_primary?: string
              genre_secondary?: string[]
              genre_tags?: string[]
            }
            positioning_hook?: string
            packaging?: { budget_tier?: { tier?: string } }
          } | null
          edited_fields?: { logline?: string } | null
        }>
      | {
          weighted_score: number | null
          tier: string | null
          evaluation: {
            classification?: {
              genre_primary?: string
              genre_secondary?: string[]
              genre_tags?: string[]
            }
            positioning_hook?: string
            packaging?: { budget_tier?: { tier?: string } }
          } | null
          edited_fields?: { logline?: string } | null
        }
      | null
  } | null
}

function shapeMatch(row: RawMatchRow): DashboardMatchData | null {
  const sub = row.script_submissions
  if (!sub) return null
  // Removed posts (hidden_at set) are dropped regardless — that's the
  // writer ending the post entirely.
  if (sub.hidden_at) return null
  // Unpublished posts (is_public=false) only get hidden from producers
  // who hadn't already engaged. Producers already in the slate
  // (interested/commented) keep access — the writer can mark the post
  // private to limit comms from new producers while continuing to work
  // with the ones already in flight. (Anuj 2026-04-27.)
  if (sub.is_public !== true) {
    if (row.status !== 'interested' && row.status !== 'commented') {
      return null
    }
  }
  const evalRaw = Array.isArray(sub.script_evaluations)
    ? sub.script_evaluations[0]
    : sub.script_evaluations
  const evaluation = evalRaw?.evaluation ?? null

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
  const secondaryGenres =
    evaluation?.classification?.genre_secondary ??
    evaluation?.classification?.genre_tags ??
    []
  for (const t of secondaryGenres) {
    if (typeof t === 'string' && t.trim() && !genreTags.includes(titleCase(t))) {
      genreTags.push(titleCase(t))
    }
  }

  const budgetTier = evaluation?.packaging?.budget_tier?.tier
  const budgetTag = budgetTier
    ? BUDGET_TAG_LABEL[budgetTier.toLowerCase()] || titleCase(budgetTier)
    : null

  // Display tags shown on the match card (format / genre / budget summary).
  const tags: string[] = []
  if (formatTag) tags.push(formatTag)
  for (const g of genreTags.slice(0, 2)) tags.push(g)
  if (budgetTag) tags.push(budgetTag)

  // Writer-editable freeform tags (lowercase-hyphenated). Kept separately
  // from `tags` so the dashboard can index on the canonical token form
  // without polluting the pretty card chips. (Filter UI is gone in v4 but
  // we keep the data so it's there if/when we re-introduce it.)
  const scriptTags: string[] = Array.isArray(sub.tags)
    ? sub.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : []

  return {
    matchId: row.id,
    submissionId: sub.id,
    status: row.status,
    title: sub.title || 'Untitled',
    score: typeof score === 'number' && !Number.isNaN(score) ? score : null,
    headline,
    tags,
    scriptTags,
    createdAt: row.created_at,
    unmatchedAt: row.unmatched_at,
  }
}

function laneSummary(lane: any): string {
  if (!lane || typeof lane !== 'object') return ''
  const parts: string[] = []
  if (Array.isArray(lane.genres) && lane.genres.length > 0) {
    const genres = lane.genres.slice(0, 2).map((g: string) => titleCase(g))
    parts.push(genres.join(' / '))
  }
  if (typeof lane.format === 'string' && lane.format !== 'both') {
    parts.push(titleCase(lane.format))
  }
  if (typeof lane.budget_tier === 'string' && lane.budget_tier !== 'agnostic') {
    parts.push(titleCase(lane.budget_tier))
  }
  return parts.join(' · ')
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
    .select('full_name, account_type, lane, last_visited_partner_at')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') {
    redirect('/dashboard')
  }
  if (!profile?.lane) {
    redirect('/onboarding/producer')
  }

  const oldLastVisitedAt: string | null =
    profile?.last_visited_partner_at ?? null

  // Stamp this visit so the next load knows when the producer was last
  // here. Fire-and-forget — if the write fails, the dashboard still renders.
  await supabase
    .from('profiles')
    .update({ last_visited_partner_at: new Date().toISOString() })
    .eq('id', user.id)

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'there'

  // Drop unmatched rows entirely. When the writer unmatches (or removes
  // the post), the producer should have NO view of the match anymore —
  // can't see it, can't act on it, can't email. Anuj 2026-04-28: better
  // to disappear the row than park it in Passed where it competes for
  // attention but can't be acted on.
  const { data: rawMatches } = await supabase
    .from('script_matches')
    .select(
      `
      id, status, created_at, unmatched_at,
      script_submissions (
        id, title, declared_format, tags, hidden_at, is_public,
        script_evaluations ( weighted_score, tier, evaluation, edited_fields )
      )
      `
    )
    .eq('producer_id', user.id)
    .is('unmatched_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  const matches = ((rawMatches ?? []) as unknown as RawMatchRow[])
    .map(shapeMatch)
    .filter((m): m is DashboardMatchData => m !== null)
    .sort((a, b) => {
      const ar = STATUS_RANK[a.status] ?? 99
      const br = STATUS_RANK[b.status] ?? 99
      if (ar !== br) return ar - br
      return 0 // created_at order is preserved by the SQL sort
    })

  // Aggregate engagement stats across the whole industry for each script
  // in this producer's feed. Producers don't see per-person breakdowns
  // (that's writer-side only), but they DO see "X views · Y interested ·
  // Z emailed" inline on each card so they can read social signal at a
  // glance. Excludes unmatched rows.
  const submissionIdsInFeed = Array.from(
    new Set(
      matches
        .map((m) => m.submissionId)
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
    )
  )
  const statsBySubmission = new Map<
    string,
    { views: number; interested: number; emailed: number }
  >()
  if (submissionIdsInFeed.length > 0) {
    const { data: aggRows } = await supabase
      .from('script_matches')
      .select('submission_id, status, producer_emailed_at, unmatched_at')
      .in('submission_id', submissionIdsInFeed)
      .in('status', ['opened', 'interested', 'commented', 'passed'])
      .is('unmatched_at', null)
    for (const row of (aggRows ?? []) as Array<{
      submission_id: string
      status: string
      producer_emailed_at: string | null
    }>) {
      const cur = statsBySubmission.get(row.submission_id) ?? {
        views: 0,
        interested: 0,
        emailed: 0,
      }
      cur.views += 1
      if (row.status === 'interested' || row.status === 'commented') {
        cur.interested += 1
      }
      if (row.producer_emailed_at) {
        cur.emailed += 1
      }
      statsBySubmission.set(row.submission_id, cur)
    }
  }
  // Hydrate each match with its aggregate stats so MatchCard can render
  // the stats strip without a second client-side fetch.
  for (const m of matches) {
    if (m.submissionId) {
      m.stats = statsBySubmission.get(m.submissionId) ?? {
        views: 0,
        interested: 0,
        emailed: 0,
      }
    }
  }

  // "New since last visit": active matches created after the OLD timestamp.
  // Only meaningful if the producer has visited before; on the very first
  // visit (oldLastVisitedAt === null) we don't tag anything as new.
  const activeMatches = matches.filter(
    (m) => !m.unmatchedAt && m.status !== 'passed'
  )
  const newMatchIds =
    oldLastVisitedAt != null
      ? activeMatches
          .filter(
            (m) =>
              new Date(m.createdAt).getTime() >
              new Date(oldLastVisitedAt).getTime()
          )
          .map((m) => m.matchId)
      : []

  const laneText = laneSummary(profile.lane)

  return (
    <>
      <Nav />
      <RealtimeRefresh producerId={user.id} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        {/* Slim header: greeting on the left, lane chip on the right.
            One line of supporting text (active count). No badges, no
            verbose "your inbox this week" copy. */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <div
              aria-hidden
              className="w-12 h-0.5 mb-3.5 rounded-sm"
              style={{ background: 'var(--gem-gold)' }}
            />
            <h1 className="text-3xl sm:text-[32px] font-extrabold font-[family-name:var(--font-display)] tracking-tight text-[var(--gem-gray-50)] leading-tight m-0">
              Welcome back, {firstName}.
            </h1>
            {activeMatches.length > 0 && (
              <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mt-2">
                {activeMatches.length} active{' '}
                {activeMatches.length === 1 ? 'match' : 'matches'}
                {newMatchIds.length > 0 && (
                  <>
                    <span className="text-[var(--gem-gray-500)] mx-2">·</span>
                    <span className="font-semibold" style={{ color: 'var(--gem-accent)' }}>
                      {newMatchIds.length} new
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
          {laneText && (
            <Link
              href="/onboarding/producer"
              className="text-[12.5px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-gold)] transition-colors shrink-0"
              title="Edit your lane"
            >
              Lane: <span className="text-[var(--gem-gray-200)]">{laneText}</span>
              <span className="text-[var(--gem-gray-500)] mx-1.5">·</span>
              Edit
            </Link>
          )}
        </div>

        {matches.length === 0 ? (
          <div
            className="text-center rounded-2xl px-6 py-16 bg-white"
            style={{ border: '1px dashed var(--gem-gray-700)' }}
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
          </div>
        ) : (
          <DashboardTabs matches={matches} newMatchIds={newMatchIds} />
        )}
      </div>
    </>
  )
}
