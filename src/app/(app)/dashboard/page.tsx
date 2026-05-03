// /dashboard — writer status center (v0.14 opportunities-v1).
// Anuj 2026-05-02.
//
// Council-recommended layout (mobile-first):
//
//   ┌──────────────────────────────────────┐
//   │  STATUS STRIP                         │
//   │  script count · pending subs · opps   │
//   ├──────────────────────────────────────┤
//   │  OPPORTUNITIES                        │
//   │  vertical list rows + action chips    │
//   ├──────────────────────────────────────┤
//   │  YOUR SCRIPTS                         │
//   │  compact vertical stack               │
//   └──────────────────────────────────────┘

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { type OpportunityData, type QualifyingScript } from '@/components/opportunities/opportunity-card'
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

  const isPro = profile?.subscription_status === 'active'
  const isTrial = !isPro
  const service = svc()

  // ---------- YOUR scripts ----------
  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; is_public: boolean; hidden_at: string | null
    allow_reviews: boolean | null; allow_industry: boolean | null
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
  const { data: oppRows } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  const opportunities = (oppRows || []) as OpportunityData[]

  type FeedEval = { id: string; weighted_score: number | null; logline: string | null; genre: string | null; budget: string | null }
  const myEvalBySub = new Map<string, FeedEval>()
  if (submissionIds.length > 0) {
    const { data: myEvs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (myEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const logline = (fmt.logline_one_line as string) || (evJson?.positioning_hook as string) || null
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      const packaging = (evJson?.packaging as Record<string, unknown>) || {}
      const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
      const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, logline, genre, budget })
    }
  }

  // ---------- QUALIFICATION ----------
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

  // ---------- SUBMISSION COUNTS ----------
  const { count: pendingSubCount } = await service
    .from('opportunity_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('writer_id', user.id)
    .eq('status', 'pending')

  // ---------- PAYWALL LOGIC ----------
  const allSubs = (mySubs as MySubRow[] | null) || []
  const allCompleted = allSubs
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstCompletedId = allCompleted[0]?.id ?? null

  // Build script data
  type ScriptRow = {
    submissionId: string; evaluationId: string | null; title: string
    format: string | null; genre: string | null; score: number | null
    isProcessing: boolean; isLocked: boolean
  }
  const scriptRows: ScriptRow[] = visible
    .map((s): ScriptRow | null => {
      const ev = myEvalBySub.get(s.id)
      const stillProcessing = s.status === 'processing' || s.status === 'queued'
      if (!ev && !stillProcessing) return null
      const isFirstCompleted = s.id === firstCompletedId
      return {
        submissionId: s.id,
        evaluationId: ev?.id ?? null,
        title: s.title,
        format: s.declared_format,
        genre: ev?.genre ?? null,
        score: ev?.weighted_score ?? null,
        isProcessing: stillProcessing,
        isLocked: isTrial && !stillProcessing && !isFirstCompleted,
      }
    })
    .filter((r): r is ScriptRow => r !== null)

  const isProcessing = visible.some((s) => s.status === 'processing' || s.status === 'queued')
  const totalQualifying = oppWithQualifications.reduce((sum, o) => sum + o.qualifyingScripts.length, 0)
  const completedCount = allCompleted.length
  const pendingSubs = pendingSubCount ?? 0

  // ---------- GENRE/BUDGET labels ----------
  const GENRE_LABELS: Record<string, string> = {
    thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
    comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
    action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
  }

  return (
    <>
      <ProcessingPoller active={isProcessing} />
      {isTrial && <UpgradeModalListener />}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}

      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── STATUS STRIP ─────────────────────────────────────── */}
        <div
          className="rounded-xl px-4 py-4 sm:px-5"
          style={{ background: '#fff', border: '1px solid #e5e7eb' }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Script count */}
            <div className="flex items-center gap-1.5">
              <span className="text-[22px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                {completedCount}
              </span>
              <span className="text-[12.5px] text-gray-400 font-medium">
                {completedCount === 1 ? 'script' : 'scripts'}
              </span>
            </div>

            <span className="text-gray-200">·</span>

            {/* Pending submissions */}
            <div className="flex items-center gap-1.5">
              <span className="text-[22px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                {pendingSubs}
              </span>
              <span className="text-[12.5px] text-gray-400 font-medium">
                in consideration
              </span>
            </div>

            {totalQualifying > 0 && (
              <>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[22px] font-bold text-emerald-600" style={{ fontFamily: 'Georgia, serif' }}>
                    {totalQualifying}
                  </span>
                  <span className="text-[12.5px] text-emerald-600 font-medium">
                    {totalQualifying === 1 ? 'match' : 'matches'}
                  </span>
                </div>
              </>
            )}

            {/* Pro/Free badge */}
            <span className="ml-auto">
              {isPro ? (
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Pro</span>
              ) : (
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Free</span>
              )}
            </span>
          </div>

          {/* Submit CTA — always visible */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12.5px] text-gray-400">
              {completedCount === 0
                ? 'Submit your first script to get started'
                : isTrial
                  ? 'Upgrade to evaluate more scripts'
                  : 'Submit another script'}
            </span>
            <Link
              href="/submit"
              className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md transition-colors"
            >
              Submit script
            </Link>
          </div>
        </div>

        {/* ── OPPORTUNITIES ──────────────────────────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-3">
            <h2 className="text-[17px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
              Open calls
            </h2>
            <Link href="/opportunities" prefetch={false} className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
              See all →
            </Link>
          </header>

          {oppWithQualifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center">
              <p className="text-[13px] text-gray-400 m-0">No open calls right now. Check back soon.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {oppWithQualifications.map(({ opportunity: opp, qualifyingScripts: qs }) => {
                const deadline = opp.deadline ? new Date(opp.deadline) : null
                const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                const hasMatch = qs.length > 0
                const slug = opp.slug ?? opp.id

                return (
                  <Link
                    key={opp.id}
                    href={`/opportunities/${slug}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    {/* Genre/format pill */}
                    <div className="flex flex-col gap-1 shrink-0" style={{ minWidth: 56 }}>
                      {opp.genres.slice(0, 1).map(g => (
                        <span key={g} className="text-[10.5px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-center">
                          {GENRE_LABELS[g] ?? g}
                        </span>
                      ))}
                      {opp.genres.length === 0 && opp.formats.slice(0, 1).map(f => (
                        <span key={f} className="text-[10.5px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full text-center">
                          {f}
                        </span>
                      ))}
                    </div>

                    {/* Title + deadline */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{opp.title}</p>
                      {daysLeft != null && daysLeft > 0 && (
                        <p className={`text-[11.5px] m-0 mt-0.5 font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-gray-300'}`}>
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                        </p>
                      )}
                    </div>

                    {/* Status chip */}
                    <div className="shrink-0">
                      {hasMatch ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="currentColor" opacity="0.2"/><path d="M3 5.2L4.3 6.5L7 3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {qs.length} {qs.length === 1 ? 'match' : 'matches'}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-300">
                          No match
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── YOUR SCRIPTS ───────────────────────────────────── */}
        {scriptRows.length > 0 && (
          <section>
            <header className="flex items-end justify-between gap-3 mb-3">
              <h2 className="text-[17px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
                Your scripts
              </h2>
              <Link href="/scripts" prefetch={false} className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
                {scriptRows.length > 3 ? `All (${scriptRows.length}) →` : 'View all →'}
              </Link>
            </header>

            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {scriptRows.slice(0, 5).map((s) => {
                const href = s.isLocked
                  ? '#'
                  : s.evaluationId
                    ? `/report/${s.evaluationId}`
                    : '#'

                return (
                  <div key={s.submissionId} className="relative">
                    {s.isLocked && (
                      <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5V4a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Upgrade to view
                        </span>
                      </div>
                    )}
                    <Link
                      href={href}
                      className={`flex items-center gap-3 px-4 py-3 ${s.isLocked ? 'pointer-events-none' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      {/* Score */}
                      <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{
                        background: s.isProcessing ? '#f3f4f6' : s.score != null && s.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                      }}>
                        {s.isProcessing ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                        ) : s.score != null ? (
                          <span className="text-[15px] font-bold" style={{ color: s.score >= 75 ? '#7c3aed' : '#6b7280' }}>
                            {Math.round(s.score)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </div>

                      {/* Title + meta */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {s.format && (
                            <span className="text-[10.5px] font-medium text-gray-400">{s.format}</span>
                          )}
                          {s.genre && (
                            <>
                              {s.format && <span className="text-gray-200">·</span>}
                              <span className="text-[10.5px] font-medium text-gray-400">{s.genre}</span>
                            </>
                          )}
                          {s.isProcessing && (
                            <span className="text-[10.5px] font-medium text-purple-500">Processing…</span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      {!s.isLocked && !s.isProcessing && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-gray-200">
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty state — no scripts AND no opportunities */}
        {scriptRows.length === 0 && opportunities.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center">
            <p className="text-[14px] text-gray-400 m-0">Submit a script to get started.</p>
          </div>
        )}
      </div>
    </>
  )
}
