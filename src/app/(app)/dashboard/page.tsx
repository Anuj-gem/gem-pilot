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
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'
import { OpportunityCard, type OpportunityData, type QualifyingScript } from '@/components/opportunities/opportunity-card'
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
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/dashboard')


  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, headline, avatar_url')
    .eq('id', user.id)
    .single()

  // Anuj 2026-04-30 v0.10.11 — REMOVED the forced "must have handle +
  // headline" gate. The new onboarding flow (/onboarding/profile) lets
  // users skip profile setup intentionally; the old gate was bouncing
  // them right back to /profile?onboarding=1, undoing the Skip. Profile
  // setup is now strictly opt-in and lives in the nav avatar dropdown.

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
    allow_reviews: boolean | null
    allow_industry: boolean | null
    script_evaluations:
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }[]
      | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, declared_format, created_at, is_public, hidden_at,
      allow_reviews, allow_industry,
      script_evaluations ( id, weighted_score, evaluation, edited_fields )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
  const submissionIds = visible.map((s) => s.id)

  // ---------- OPPORTUNITIES ----------
  // Fetch active opportunities + build qualification map for user's scripts.
  const { data: oppRows } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  const opportunities = (oppRows || []) as OpportunityData[]

  type FeedEval = { id: string; weighted_score: number | null; logline: string | null; genre: string | null; budget: string | null }

  // ---------- YOUR scripts as poster cards ----------
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
      const packaging = (evJson?.packaging as Record<string, unknown>) || {}
      const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
      const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, logline, genre, budget })
    }
  }

  // ---------- OPPORTUNITY QUALIFICATION ----------
  // For each opportunity, find which of the user's scripts qualify.
  function scriptsQualifyingFor(opp: OpportunityData): QualifyingScript[] {
    const qualifying: QualifyingScript[] = []
    for (const sub of visible) {
      if (sub.status !== 'completed') continue
      const ev = myEvalBySub.get(sub.id)
      if (!ev) continue
      const genreKey = ev.genre?.toLowerCase().replace(/[^a-z-]/g, '') || null
      if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format ?? '')) continue
      if (opp.genres.length > 0 && genreKey && !opp.genres.includes(genreKey)) continue
      if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
      if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue
      qualifying.push({ id: sub.id, title: sub.title, evaluation_id: ev.id })
    }
    return qualifying
  }
  const oppWithQualifications = opportunities.map(opp => ({
    opportunity: opp,
    qualifyingScripts: scriptsQualifyingFor(opp),
  }))
  const myReviewStats = await getScriptStats(submissionIds)

  // ── Free-tier paywall logic ──────────────────────────────
  // Find the user's first completed submission (by created_at ASC).
  // That one gets full access (the "free evaluation"). All subsequent
  // completed scripts are locked behind Pro. Processing scripts always
  // render with a spinner regardless of tier.
  //
  // IMPORTANT: use ALL submissions (including hidden/removed) to find the
  // first completed one. Hiding a script doesn't give you another free
  // eval — mirrors the report page's lockedAfterFreeEval query.
  const allSubs = (mySubs as MySubRow[] | null) || []
  const allCompleted = allSubs
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstCompletedId = allCompleted[0]?.id ?? null
  const isTrial = !isPro

  type MyCard = ScriptCardData & { _isLocked: boolean; _isProcessing: boolean; _isFreePost: boolean }
  const allMyCards: MyCard[] = visible
    .map((s): MyCard | null => {
      const ev = myEvalBySub.get(s.id)
      const stillProcessing = s.status === 'processing' || s.status === 'queued'
      // Processing scripts have no eval — render them anyway
      if (!ev && !stillProcessing) return null
      const st = myReviewStats.get(s.id)
      const isFirstCompleted = s.id === firstCompletedId
      return {
        submission_id: s.id,
        evaluation_id: ev?.id ?? null,
        title: s.title,
        format: s.declared_format,
        genre: ev?.genre ?? null,
        logline: ev?.logline ?? null,
        selznick_score: ev?.weighted_score ?? null,
        is_public: !!s.is_public,
        allow_reviews: s.allow_reviews ?? true,
        allow_industry: s.allow_industry ?? true,
        writer_handle: profile?.handle ?? null,
        writer_name: profile?.full_name ?? null,
        writer_avatar_url: profile?.avatar_url ?? null,
        review_count: st?.reviewCount ?? 0,
        avg_peer_score: st?.avgPeerScore ?? null,
        _isProcessing: stillProcessing,
        _isLocked: isTrial && !stillProcessing && !isFirstCompleted,
        _isFreePost: isTrial && isFirstCompleted,
      }
    })
    .filter((c): c is MyCard => c !== null)
  // Show only the 3 most recent on the dashboard. The rest live behind
  // a "View all" link → public profile page (Anuj 2026-04-30).
  const myCards = allMyCards.slice(0, 3)
  const hasMoreScripts = allMyCards.length > myCards.length

  const isProcessing = visible.some((s) => s.status === 'processing' || s.status === 'queued')
  const totalQualifying = oppWithQualifications.reduce((sum, o) => sum + o.qualifyingScripts.length, 0)

  return (
    <>
      <ProcessingPoller active={isProcessing} />
      {isTrial && <UpgradeModalListener />}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}

      <div className="space-y-6">

        <div>
          <section className="min-w-0 space-y-10">
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
                    <ScriptCard
                      key={c.submission_id}
                      s={c}
                      density="poster"
                      isOwner
                      isLocked={c._isLocked}
                      isProcessing={c._isProcessing}
                      isFreePost={c._isFreePost}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* OPEN OPPORTUNITIES — opportunities-v1 */}
            <div>
              <header className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-emerald-700 mb-1">Opportunities</p>
                  <h2 className="text-[20px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    Open calls
                    {totalQualifying > 0 && (
                      <span className="ml-2 inline-flex items-center text-[13px] font-semibold text-emerald-600" style={{ fontFamily: 'inherit' }}>
                        — {totalQualifying} {totalQualifying === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </h2>
                </div>
                <Link href="/opportunities" prefetch={false} className="shrink-0 text-[12px] text-gray-500 hover:text-gray-900 font-semibold">
                  See all →
                </Link>
              </header>
              {oppWithQualifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
                  <p className="text-[13.5px] text-gray-500">
                    No open opportunities right now. Check back soon.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {oppWithQualifications.map(({ opportunity, qualifyingScripts }) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      qualifyingScripts={qualifyingScripts}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>

            {/* EMPTY-EMPTY fallback */}
            {myCards.length === 0 && opportunities.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center text-sm text-gray-400">
                Nothing here yet. Submit a script to get started.
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
