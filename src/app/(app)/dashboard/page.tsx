// /dashboard — writer dashboard (v9, sidebar layout + 4 stat cards).
// Matches prototype Screen 5: welcome heading, 4 stats, scripts, pending apps.
// Sidebar is rendered by (app)/layout.tsx via DashboardSidebar.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
// UpgradeModalListener is now in (app)/layout.tsx
// DashboardUpgradeBanner removed — upgrade card is in sidebar
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { DashboardScriptCard } from '@/components/dashboard/dashboard-script-card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, avatar_url, heat_score')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const service = svc()

  // ---------- YOUR scripts ----------
  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; heat_score: number | null; is_public: boolean | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at, heat_score, is_public')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
  const submissionIds = visible.map((s) => s.id)

  // ---------- EVALUATIONS ----------
  function normGenre(g: string | null | undefined): string {
    return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  type FeedEval = { id: string; weighted_score: number | null; genres: string[]; format: string | null }
  const myEvalBySub = new Map<string, FeedEval>()
  if (submissionIds.length > 0) {
    const { data: myEvs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (myEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const genreSet = new Set<string>()
      for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
        const n = normGenre(raw)
        if (n) genreSet.add(n)
      }
      const format = (cls.format as string) || (fmt.format as string) || null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: Array.from(genreSet), format })
    }
  }

  // ---------- OPEN OPPORTUNITIES ----------
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres, min_score, subtitle, description, deadline, budget_tiers')
    .eq('status', 'active')
  const allOpenOpps = (openOpps || []) as {
    id: string; title: string; slug: string
    formats: string[] | null; genres: string[] | null; min_score: number | null
    subtitle: string | null; description: string | null
    deadline: string | null; budget_tiers: string[] | null
  }[]

  // ---------- APPLICATIONS (considerations with opportunity_id) ----------
  const { data: applications } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, writer_response, heat_earned')
    .eq('writer_id', user.id)
    .not('opportunity_id', 'is', null)
    .order('submitted_at', { ascending: false })

  const allApplications = (applications || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null; writer_response: string | null
    heat_earned: number
  }[]

  // Map opportunity IDs to info
  const oppMap = new Map(allOpenOpps.map(o => [o.id, o]))

  // ---------- MATCHING LOGIC ----------
  function getQualifyingOpps(format: string | null, scriptGenres: string[], score: number | null) {
    return allOpenOpps.filter(o => {
      if (o.min_score && (!score || score < o.min_score)) return false
      const noFormatFilter = !o.formats || o.formats.length === 0
      const noGenreFilter = !o.genres || o.genres.length === 0
      if (noFormatFilter && noGenreFilter) return true
      const fmtMatch = noFormatFilter || (format && o.formats!.some(f => f.toLowerCase() === format.toLowerCase()))
      if (!fmtMatch) return false
      if (noGenreFilter) return true
      if (scriptGenres.length === 0) return false
      const oppNorm = o.genres!.map(normGenre)
      return scriptGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
    })
  }

  // IDs of opportunities the user has already applied to
  const appliedOppIds = new Set(allApplications.map(a => a.opportunity_id))

  // Build script cards with matching opps (full objects for dropdown)
  const completedScripts = visible
    .filter(s => s.status === 'completed')
    .map(s => {
      const ev = myEvalBySub.get(s.id)
      const qualifyingOpps = getQualifyingOpps(ev?.format || s.declared_format, ev?.genres || [], ev?.weighted_score || null)
        .filter(o => !appliedOppIds.has(o.id))  // exclude already-applied
      return {
        id: s.id,
        title: s.title,
        format: ev?.format || s.declared_format,
        genres: ev?.genres || [],
        evaluationId: ev?.id ?? null,
        createdAt: s.created_at,
        qualifyingOpps: qualifyingOpps.map(o => ({ id: o.id, title: o.title, slug: o.slug })),
      }
    })

  // Scripts still being evaluated — show as individual processing cards
  const processingScripts = visible
    .filter(s => s.status === 'processing' || s.status === 'queued')
    .map(s => ({
      id: s.id,
      title: s.title,
      format: s.declared_format,
      createdAt: s.created_at,
    }))

  const isProcessing = processingScripts.length > 0

  // Total qualifying opps across all scripts (for empty-state nudge)
  const totalQualifying = completedScripts.reduce((sum, s) => sum + s.qualifyingOpps.length, 0)

  // Available opportunities: opps the user qualifies for but hasn't applied to yet
  // Sorted by deadline urgency (soonest first, then no-deadline last)
  const availableOpps = allOpenOpps
    .filter(o => {
      if (appliedOppIds.has(o.id)) return false
      return completedScripts.some(s => {
        const ev = myEvalBySub.get(s.id)
        const score = ev?.weighted_score || null
        if (o.min_score && (!score || score < o.min_score)) return false
        const noFmt = !o.formats || o.formats.length === 0
        const noGenre = !o.genres || o.genres.length === 0
        if (noFmt && noGenre) return true
        const fmtMatch = noFmt || (s.format && o.formats!.some(f => f.toLowerCase() === s.format!.toLowerCase()))
        if (!fmtMatch) return false
        if (noGenre) return true
        const sGenres = myEvalBySub.get(s.id)?.genres || []
        if (sGenres.length === 0) return false
        const oppNorm = o.genres!.map(normGenre)
        return sGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
      })
    })
    .sort((a, b) => {
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (a.deadline) return -1
      if (b.deadline) return 1
      return 0
    })

  // Count qualifying scripts per opportunity (for "N scripts qualify" label)
  function countQualifyingScripts(opp: typeof allOpenOpps[0]) {
    return completedScripts.filter(s => {
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score || null
      if (opp.min_score && (!score || score < opp.min_score)) return false
      const noFmt = !opp.formats || opp.formats.length === 0
      const noGenre = !opp.genres || opp.genres.length === 0
      if (noFmt && noGenre) return true
      const fmtMatch = noFmt || (s.format && opp.formats!.some(f => f.toLowerCase() === s.format!.toLowerCase()))
      if (!fmtMatch) return false
      if (noGenre) return true
      const sGenres = ev?.genres || []
      if (sGenres.length === 0) return false
      const oppNorm = opp.genres!.map(normGenre)
      return sGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
    }).length
  }

  // Split applications into reviewed (with feedback) and pending
  const reviewedApps = allApplications.filter(a => a.status === 'reviewed' || a.review_stage === 'complete')
  const pendingApps = allApplications.filter(a => a.status !== 'reviewed' && a.review_stage !== 'complete')

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Best score per opportunity (for progress bars)
  function bestScoreForOpp(opp: typeof allOpenOpps[0]) {
    let best = 0
    for (const s of completedScripts) {
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score ?? 0
      if (score > best) best = score
    }
    return best
  }

  const totalHeat = (profile as any)?.heat_score ?? 0

  // Count scripts on Discover
  const onDiscoverCount = visible.filter(s => s.is_public).length

  return (
    <>
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />

      <div className="space-y-7">

        {/* ── WELCOME HEADING ────────────────────────── */}
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 m-0 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Welcome, {(profile?.full_name || 'Writer').split(' ')[0]}.
          </h1>
          <p className="text-[14px] text-gray-500 m-0">
            Everything you set up is here. Explore Discover and Opportunities from the top nav.
          </p>
        </div>

        {/* ── 4 STAT CARDS ───────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-[28px] font-semibold text-gray-900 m-0 leading-none">{completedScripts.length + processingScripts.length}</p>
            <p className="text-[13px] text-gray-400 m-0 mt-1">Scripts</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-[28px] font-semibold text-gray-900 m-0 leading-none">{onDiscoverCount}</p>
            <p className="text-[13px] text-gray-400 m-0 mt-1">On Discover</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-[28px] font-semibold text-gray-900 m-0 leading-none">{allApplications.length}</p>
            <p className="text-[13px] text-gray-400 m-0 mt-1">Applied</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-[28px] font-semibold m-0 leading-none" style={{ color: totalHeat > 0 ? '#ea580c' : '#111827' }}>{totalHeat}</p>
            <p className="text-[13px] text-gray-400 m-0 mt-1">Heat</p>
          </div>
        </div>

        {/* ── YOUR SCRIPTS ───────────────────────────── */}
        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 m-0 mb-3">Your scripts</h2>

          {completedScripts.length === 0 && processingScripts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-[13px] text-gray-500 m-0">Upload a script to get your free report.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {processingScripts.map(script => (
                <DashboardScriptCard
                  key={script.id}
                  scriptId={script.id}
                  title={script.title}
                  format={script.format}
                  genre={null}
                  evaluationId={null}
                  createdAt={script.createdAt}
                  score={null}
                  qualifyingOpps={[]}
                  isProcessing={true}
                />
              ))}
              {completedScripts.map(script => {
                const sub = visible.find(v => v.id === script.id)
                return (
                  <DashboardScriptCard
                    key={script.id}
                    scriptId={script.id}
                    title={script.title}
                    format={script.format}
                    genre={script.genres[0] || null}
                    evaluationId={script.evaluationId}
                    createdAt={script.createdAt}
                    score={myEvalBySub.get(script.id)?.weighted_score ?? null}
                    qualifyingOpps={script.qualifyingOpps}
                    heatScore={sub?.heat_score || 0}
                    isPublic={!!sub?.is_public}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* ── PENDING APPLICATIONS ────────────────────── */}
        {pendingApps.length > 0 && (
          <section>
            <h2 className="text-[15px] font-semibold text-gray-900 m-0 mb-3">Pending applications</h2>
            <div className="space-y-2">
              {pendingApps.map(app => {
                const opp = oppMap.get(app.opportunity_id)
                return (
                  <Link key={app.id} href={`/applications/${app.id}`} className="block">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-purple-200 transition-colors flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{opp?.title || 'Opportunity'}</p>
                        <p className="text-[12px] text-gray-400 m-0 mt-0.5">Applied {fmtDate(app.submitted_at)}</p>
                      </div>
                      <span className="text-[12px] font-semibold shrink-0" style={{ color: '#f59e0b' }}>
                        Pending
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── REVIEWED FEEDBACK ───────────────────────── */}
        {reviewedApps.length > 0 && (
          <section>
            <header className="flex items-end justify-between gap-3 mb-3">
              <h2 className="text-[15px] font-semibold text-gray-900 m-0">Your feedback</h2>
              {allApplications.length > 2 && (
                <Link href="/review" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-0.5">
                  View all
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              )}
            </header>
            <div className="space-y-2.5">
              {reviewedApps.slice(0, 2).map(app => {
                const opp = oppMap.get(app.opportunity_id)
                const heatEarned = (app as any).heat_earned ?? 0
                return (
                  <Link key={app.id} href={`/applications/${app.id}`} className="block">
                    <div
                      className="bg-white px-5 py-4 hover:shadow-sm transition-all"
                      style={{
                        border: '1px solid #e5e7eb',
                        borderLeft: '3px solid #7c3aed',
                        borderRadius: '0 12px 12px 0',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[15px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
                          {opp?.title || 'Opportunity'}
                        </p>
                        {heatEarned > 0 && (
                          <span className="text-[12px] font-bold shrink-0" style={{ color: '#ea580c' }}>
                            +{heatEarned} heat
                          </span>
                        )}
                      </div>
                      {app.feedback && (
                        <p className="text-[13px] text-gray-500 m-0 leading-relaxed line-clamp-2 italic">
                          &ldquo;{app.feedback}&rdquo;
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </>
  )
}
