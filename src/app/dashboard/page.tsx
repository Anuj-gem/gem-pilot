// /dashboard — community-first writer home (v0.7).
// Anuj 2026-04-30.
//
// Replaces the old SaaS-shaped scripts table with a feed-first layout:
//
//   ┌─────────────── max-w-6xl ────────────────────────────┐
//   │  Activity strip                                       │
//   │  ┌────────────────────────┬─────────────────────────┐ │
//   │  │  COMMUNITY FEED        │  YOUR PANEL (sidebar)   │ │
//   │  │  poster grid 2/3 cols  │  profile + latest +     │ │
//   │  │                        │  others + submit btn    │ │
//   │  └────────────────────────┴─────────────────────────┘ │
//   └───────────────────────────────────────────────────────┘
//
// Mobile collapses to single column with YourPanel above the feed (so a
// writer who just submitted sees their script processing right at the
// top while they scroll the feed).
//
// The detail-management surfaces (per-script privacy, drafts, producer
// activity, paywalls, every Upgrade CTA on the page) all moved to the
// public profile (/w/[handle]) and the report page. The dashboard is
// no longer a CRM.

import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { YourPanel } from '@/components/dashboard/your-panel'
import { ActivityStrip, type ActivityEvent } from '@/components/discover/activity-strip'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

interface PageProps {
  searchParams: Promise<{ welcome_back?: string; draft_saved?: string; just_signed_up?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/dashboard')

  const sp = await searchParams
  const justSignedUp = sp.just_signed_up === '1'

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, headline, avatar_url')
    .eq('id', user.id)
    .single()

  // Forced profile onboarding — every user must have a handle + headline.
  if (!profile?.handle || !profile?.headline) {
    redirect('/profile?onboarding=1')
  }

  const isPro = profile?.subscription_status === 'active'
  const service = svc()

  // ---------- YOUR scripts ----------
  type MySubRow = {
    id: string
    title: string
    status: string
    declared_format: string | null
    created_at: string
    is_public: boolean
    hidden_at: string | null
    script_evaluations:
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }[]
      | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, declared_format, created_at, is_public, hidden_at,
      script_evaluations ( id, weighted_score, evaluation, edited_fields )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
  const submissionIds = visible.map((s) => s.id)
  const myScriptCount = visible.length

  // ---------- YOUR stats (followers / following / reviews given) ----------
  const [{ count: followers }, { count: following }, { count: reviewsGiven }] = await Promise.all([
    service.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', user.id),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    service.from('peer_reviews').select('id', { count: 'exact', head: true }).eq('reviewer_id', user.id).is('deleted_at', null),
  ])

  // ---------- COMMUNITY FEED (Discover-style poster grid, 24 cards) ----------
  const { data: pubRows } = await service
    .from('script_submissions')
    .select('id, title, declared_format, created_at, user_id')
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(80)
  type FeedSub = { id: string; title: string; declared_format: string | null; created_at: string; user_id: string | null }
  const feedScripts = (pubRows as FeedSub[] | null) || []
  const feedSubIds = feedScripts.map((s) => s.id)
  const feedWriterIds = Array.from(new Set(feedScripts.map((s) => s.user_id).filter(Boolean) as string[]))

  const [{ data: feedEvs }, { data: feedWriters }, feedStats] = await Promise.all([
    service.from('script_evaluations').select('id, submission_id, weighted_score, evaluation').in('submission_id', feedSubIds),
    service.from('profiles').select('id, handle, full_name, avatar_url').in('id', feedWriterIds),
    getScriptStats(feedSubIds),
  ])

  type FeedEval = { id: string; weighted_score: number | null; logline: string | null; genre: string | null }
  const feedEvalBySub = new Map<string, FeedEval>()
  for (const e of (feedEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
    const evJson = e.evaluation as Record<string, unknown> | null
    const fmt = (evJson?.format_detection as Record<string, unknown> | undefined) || {}
    const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
    const logline = (fmt.logline_one_line as string | undefined) || (evJson?.positioning_hook as string | undefined) || null
    const genre = (cls.genre_primary as string | undefined) || (fmt.genre_primary as string | undefined) || null
    feedEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, logline, genre })
  }
  type FeedWriter = { handle: string | null; full_name: string | null; avatar_url: string | null }
  const feedWriterById = new Map<string, FeedWriter>()
  for (const w of (feedWriters as Array<FeedWriter & { id: string }> | null) || []) {
    feedWriterById.set(w.id, { handle: w.handle, full_name: w.full_name, avatar_url: w.avatar_url })
  }

  const feedCards: ScriptCardData[] = feedScripts
    .map((s): ScriptCardData | null => {
      const ev = feedEvalBySub.get(s.id)
      if (!ev) return null
      const wp = s.user_id ? feedWriterById.get(s.user_id) : null
      const st = feedStats.get(s.id)
      return {
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
    })
    .filter((c): c is ScriptCardData => c !== null)
    .slice(0, 6)

  // ---------- YOUR scripts as poster cards ----------
  // Render the user's own published-or-completed scripts as poster cards
  // in the main column. Owner-only Industry stats button surfaces here.
  // Pull eval rows for our own scripts the same way we did for the feed.
  const myEvalBySub = new Map<string, FeedEval>()
  if (submissionIds.length > 0) {
    const { data: myEvs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (myEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const fmt = (evJson?.format_detection as Record<string, unknown> | undefined) || {}
      const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
      const logline = (fmt.logline_one_line as string | undefined) || (evJson?.positioning_hook as string | undefined) || null
      const genre = (cls.genre_primary as string | undefined) || (fmt.genre_primary as string | undefined) || null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, logline, genre })
    }
  }
  const myReviewStats = await getScriptStats(submissionIds)
  const allMyCards: ScriptCardData[] = visible
    .map((s): ScriptCardData | null => {
      const ev = myEvalBySub.get(s.id)
      if (!ev) return null
      const st = myReviewStats.get(s.id)
      return {
        submission_id: s.id,
        evaluation_id: ev.id,
        title: s.title,
        format: s.declared_format,
        genre: ev.genre,
        logline: ev.logline,
        selznick_score: ev.weighted_score,
        is_public: !!s.is_public,
        writer_handle: profile?.handle ?? null,
        writer_name: profile?.full_name ?? null,
        writer_avatar_url: profile?.avatar_url ?? null,
        review_count: st?.reviewCount ?? 0,
        avg_peer_score: st?.avgPeerScore ?? null,
      }
    })
    .filter((c): c is ScriptCardData => c !== null)
  // Show only the 3 most recent on the dashboard. The rest live behind
  // a "View all" link → public profile page (Anuj 2026-04-30).
  const myCards: ScriptCardData[] = allMyCards.slice(0, 3)
  const hasMoreScripts = allMyCards.length > myCards.length

  // ---------- POSTS YOU'VE REVIEWED ----------
  // Last 3 peer reviews the user has given. The submission for each
  // review may not be public, but since the reviewer can see what they
  // reviewed (and the submission owner explicitly let them in), the
  // service client is fine here.
  const { data: myReviewRows } = await service
    .from('peer_reviews')
    .select('id, submission_id, score, body, created_at')
    .eq('reviewer_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(3)
  type MyReviewRow = { id: string; submission_id: string; score: number | null; body: string | null; created_at: string }
  const myReviews = (myReviewRows as MyReviewRow[] | null) || []
  const reviewedSubIds = myReviews.map((r) => r.submission_id)

  type ReviewedCard = ScriptCardData & { reviewedAt: string; myScore: number | null }
  const reviewedCards: ReviewedCard[] = []
  if (reviewedSubIds.length > 0) {
    const [{ data: revSubs }, { data: revEvs }] = await Promise.all([
      service.from('script_submissions').select('id, title, declared_format, user_id').in('id', reviewedSubIds),
      service.from('script_evaluations').select('id, submission_id, weighted_score, evaluation').in('submission_id', reviewedSubIds),
    ])
    const subById = new Map((revSubs as { id: string; title: string; declared_format: string | null; user_id: string }[] | null)?.map((s) => [s.id, s]) || [])
    const writerIds = Array.from(new Set((revSubs as { user_id: string }[] | null)?.map((s) => s.user_id) || []))
    const { data: writerRows } = await service.from('profiles').select('id, handle, full_name, avatar_url').in('id', writerIds)
    const writerById = new Map((writerRows as { id: string; handle: string | null; full_name: string | null; avatar_url: string | null }[] | null)?.map((w) => [w.id, w]) || [])

    type EvRow = { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }
    const evBySub = new Map<string, EvRow>()
    for (const e of ((revEvs as EvRow[] | null) || [])) evBySub.set(e.submission_id, e)

    for (const r of myReviews) {
      const sub = subById.get(r.submission_id)
      const ev = evBySub.get(r.submission_id)
      if (!sub || !ev) continue
      const evJson = (ev.evaluation as Record<string, unknown> | null) || null
      const fmt = (evJson?.format_detection as Record<string, unknown> | undefined) || {}
      const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
      const logline = (fmt.logline_one_line as string | undefined) || (evJson?.positioning_hook as string | undefined) || null
      const genre = (cls.genre_primary as string | undefined) || (fmt.genre_primary as string | undefined) || null
      const wp = writerById.get(sub.user_id)
      reviewedCards.push({
        submission_id: sub.id,
        evaluation_id: ev.id,
        title: sub.title,
        format: sub.declared_format,
        genre,
        logline,
        selznick_score: ev.weighted_score,
        writer_handle: wp?.handle ?? null,
        writer_name: wp?.full_name ?? null,
        writer_avatar_url: wp?.avatar_url ?? null,
        review_count: 0,
        avg_peer_score: null,
        reviewedAt: r.created_at,
        myScore: r.score,
      })
    }
  }

  // ---------- ACTIVITY STRIP (publishes + reviews) ----------
  const feedScriptById = new Map(feedScripts.map((s) => [s.id, s]))
  const events: ActivityEvent[] = []
  for (const c of feedCards.slice(0, 8)) {
    const sub = feedScriptById.get(c.submission_id)
    if (!sub) continue
    events.push({
      kind: 'publish',
      ts: new Date(sub.created_at).getTime(),
      title: c.title,
      evaluation_id: c.evaluation_id,
      writerHandle: c.writer_handle,
      writerName: c.writer_name,
      writerAvatar: c.writer_avatar_url ?? null,
    })
  }
  const { data: revRows } = await service
    .from('peer_reviews')
    .select('id, submission_id, created_at, reviewer:profiles!peer_reviews_reviewer_id_fkey(handle, full_name, avatar_url)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)
  type ReviewRow = {
    id: string; submission_id: string; created_at: string
    reviewer: { handle: string | null; full_name: string | null; avatar_url: string | null } | null
  }
  for (const r of (revRows as unknown as ReviewRow[] | null) || []) {
    const sub = feedScripts.find((s) => s.id === r.submission_id)
    const ev = sub ? feedEvalBySub.get(sub.id) : null
    events.push({
      kind: 'review',
      ts: new Date(r.created_at).getTime(),
      title: sub?.title || 'a script',
      evaluation_id: ev?.id ?? null,
      reviewerHandle: r.reviewer?.handle ?? null,
      reviewerName: r.reviewer?.full_name ?? null,
      writerAvatar: r.reviewer?.avatar_url ?? null,
    })
  }
  events.sort((a, b) => b.ts - a.ts)
  const topEvents = events.slice(0, 8)

  const isProcessing = visible.some((s) => s.status === 'processing')

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <Nav />
      <ProcessingPoller active={isProcessing} />
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}

      <main className="max-w-6xl mx-auto px-5 py-8">
        {justSignedUp && (
          <div className="mb-5 rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-[13px] text-purple-800">
            Welcome to GEM. Your evaluation is queued — you can scroll the community while you wait.
          </div>
        )}

        <ActivityStrip events={topEvents} />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          {/* MAIN COL.
              Mobile: order-2 so YourPanel is on top. */}
          <section className="md:order-1 order-2 min-w-0 space-y-10">
            {/* YOUR LATEST SCRIPTS — capped at 3, "View all" links to profile */}
            {myCards.length > 0 && (
              <div>
                <header className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1">Your work</p>
                    <h2 className="text-[20px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                      Your latest scripts
                    </h2>
                  </div>
                  <Link href="/scripts" prefetch={false} className="shrink-0 text-[12px] text-gray-500 hover:text-gray-900 font-semibold">
                    {hasMoreScripts ? `View all (${allMyCards.length}) →` : 'My scripts →'}
                  </Link>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCards.map((c) => (
                    <ScriptCard key={c.submission_id} s={c} density="poster" isOwner />
                  ))}
                </div>
              </div>
            )}

            {/* POSTS YOU'VE REVIEWED — last 3 + view-all link, with empty state */}
            <div>
              <header className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-1">Reviews</p>
                  <h2 className="text-[20px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    Posts you&apos;ve reviewed
                  </h2>
                </div>
                {reviewedCards.length > 0 && profile?.handle && (
                  <Link href={`/w/${profile.handle}`} prefetch={false} className="shrink-0 text-[12px] text-gray-500 hover:text-gray-900 font-semibold">
                    View all →
                  </Link>
                )}
              </header>
              {reviewedCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
                  <p className="text-[13.5px] text-gray-600 mb-3">
                    You haven&apos;t reviewed any posts yet.
                  </p>
                  <Link
                    href="/discover"
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2"
                  >
                    Browse community →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviewedCards.map((c) => (
                    <ScriptCard key={c.submission_id} s={c} density="poster" />
                  ))}
                </div>
              )}
            </div>

            {/* LATEST COMMUNITY — slim sliver, not a wall */}
            {feedCards.length > 0 && (
              <div>
                <header className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-1">Community</p>
                    <h2 className="text-[20px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                      Latest community
                    </h2>
                  </div>
                  <Link href="/discover" prefetch={false} className="shrink-0 text-[12px] text-gray-500 hover:text-gray-900 font-semibold">
                    See all →
                  </Link>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {feedCards.map((c) => (
                    <ScriptCard key={c.submission_id} s={c} density="poster" />
                  ))}
                </div>
              </div>
            )}

            {/* EMPTY-EMPTY fallback — neither owns nor finds anything */}
            {myCards.length === 0 && feedCards.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center text-sm text-gray-400">
                Nothing here yet. Submit a script to get started.
              </div>
            )}
          </section>

          {/* SIDEBAR — Your Panel.
              Mobile: order-1 so it shows on top. Desktop: sticky right rail. */}
          <div className="md:order-2 order-1 md:sticky md:top-4 self-start">
            <YourPanel
              profile={{
                full_name: profile?.full_name ?? null,
                handle: profile?.handle ?? null,
                headline: profile?.headline ?? null,
                avatar_url: profile?.avatar_url ?? null,
                isPro,
              }}
              stats={{
                scripts: myScriptCount,
                followers: followers ?? 0,
                following: following ?? 0,
                reviewsGiven: reviewsGiven ?? 0,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
