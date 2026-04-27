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
// commented → opened → pending, then created_at DESC. Cap at 100.
//
// Visit tracking: read the OLD `profiles.last_visited_partner_at` BEFORE
// updating it so we can compute "new since last visit". Then write
// now() back so the next page load knows when this visit happened.
//
// Layout mirrors `Selznick_3/gem-app/../GEM/partner_dashboard_mockup_v2.html`:
//   - Optional "N new since [date]" strip (only if last_visited is non-null
//     and there are matches newer than it)
//   - Header: "Welcome back, X" + Industry partner badge
//   - Greeting strip: gold rule + "Your inbox this week — N new since you
//     last visited · M total active" (or "M active matches in your lane"
//     if no new ones)
//   - Lane chip + edit-lane link
//   - Filter row (static for v1)
//   - <DashboardTabs> client component: 3 tabs (Inbox / Slate / Passed)
//     with per-tab sort + per-tab empty states. Server fetches every
//     status (LIMIT 100); client splits into the buckets and renders a
//     hero + list for Inbox, plain list for Slate, compact list for
//     Passed (which also includes unmatched rows).
//   - Empty state when no rows

import { redirect } from 'next/navigation'
import { Inbox, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { LaneChip } from '@/components/partner/lane-chip'
import { DashboardTabs, type DashboardMatchData } from '@/components/partner/dashboard-tabs'

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
  unmatched_at: string | null
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

function shapeMatch(row: RawMatchRow): DashboardMatchData | null {
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
    createdAt: row.created_at,
    unmatchedAt: row.unmatched_at,
  }
}

function formatShortDate(iso: string): string {
  // "Apr 23" — short month + day, no year, in the server's locale.
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function PartnerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/partner')
  }

  // Read the profile, including the OLD last_visited_partner_at value
  // BEFORE we update it. We'll compare match.created_at against this
  // timestamp to compute the "new since last visit" set.
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
  // here. Fire-and-forget — if the write fails (e.g. transient RLS
  // hiccup), the dashboard should still render.
  await supabase
    .from('profiles')
    .update({ last_visited_partner_at: new Date().toISOString() })
    .eq('id', user.id)

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'there'

  // Fetch matches. RLS already filters by producer_id. Pull joined
  // submission + most-recent evaluation for the card render. LIMIT 100
  // so producers see effectively all of their lane. We pull every status
  // including 'passed' and rows with unmatched_at so the Passed tab can
  // surface them; the client-side tabs do the bucket split.
  const { data: rawMatches } = await supabase
    .from('script_matches')
    .select(
      `
      id, status, created_at, unmatched_at,
      script_submissions (
        id, title, declared_format,
        script_evaluations ( weighted_score, tier, evaluation, edited_fields )
      )
      `
    )
    .eq('producer_id', user.id)
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

  // "Active" = anything not unmatched and not passed. Drives the greeting
  // strip + new-since-visit copy; we keep the broader `matches` list around
  // so the Passed tab still has rows to show.
  const activeMatches = matches.filter(
    (m) => !m.unmatchedAt && m.status !== 'passed'
  )

  // "New since last visit": any active match created after the OLD timestamp.
  // Only meaningful if the producer has visited before; on the very
  // first visit (oldLastVisitedAt === null) we don't show the strip or
  // pills — everything is technically "new" and the noise isn't useful.
  const newSinceMatches =
    oldLastVisitedAt != null
      ? activeMatches.filter(
          (m) => new Date(m.createdAt).getTime() > new Date(oldLastVisitedAt).getTime()
        )
      : []
  const newMatchIds = newSinceMatches.map((m) => m.matchId)
  const newSinceCount = newSinceMatches.length

  const totalActiveCount = activeMatches.length

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16">
        {/* "New since last visit" strip — only renders when the producer
            has been here before AND there are matches newer than that
            visit. Click anchor scrolls down to the inbox section. */}
        {newSinceCount > 0 && oldLastVisitedAt && (
          <a
            href="#inbox"
            className="flex items-center gap-2 mb-4 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors"
            style={{
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.20)',
              color: 'var(--gem-accent)',
            }}
          >
            <Zap size={13} strokeWidth={2.5} />
            <span>
              <strong className="font-bold">{newSinceCount} new</strong>{' '}
              {newSinceCount === 1 ? 'match' : 'matches'} since{' '}
              {formatShortDate(oldLastVisitedAt)} · click to scroll to inbox
            </span>
          </a>
        )}

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

        {/* Greeting strip — gold rule + "Your inbox this week".
            Copy adapts based on whether there are new-since-visit matches. */}
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
            {newSinceCount > 0 ? (
              <>
                <span style={{ color: 'var(--gem-accent)' }}>
                  {newSinceCount} new
                </span>{' '}
                since you last visited · {totalActiveCount} total active
              </>
            ) : (
              <>
                <span style={{ color: 'var(--gem-accent)' }}>
                  {totalActiveCount}{' '}
                  {totalActiveCount === 1 ? 'active match' : 'active matches'}
                </span>{' '}
                in your lane
              </>
            )}
          </h2>
          <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0 mb-4">
            Curated against the lane you set up. Newest at the top.
          </p>
          <LaneChip lane={profile.lane} />
        </div>

        {/* Filter row — static label for v1, no filter switching yet. */}
        <div
          id="inbox"
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
        </div>

        {/* Tabs (Inbox / Slate / Passed) — or empty state when there are
            literally zero matches at all. The DashboardTabs component
            handles its own per-tab empty states once at least one row
            exists. */}
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
          </div>
        ) : (
          <DashboardTabs matches={matches} newMatchIds={newMatchIds} />
        )}
      </div>
    </>
  )
}
