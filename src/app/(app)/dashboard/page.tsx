// /dashboard — writer dashboard (v8, stat cards + reskinned feedback).
//
// Layout:
//   +----------------------------------------------+
//   |  PROFILE HEADER                              |
//   +----------------------------------------------+
//   |  STAT CARDS (scripts · applications · heat)  |
//   +----------------------------------------------+
//   |  YOUR FEEDBACK (white cards, left border)    |
//   +----------------------------------------------+
//   |  PENDING APPLICATIONS                        |
//   +----------------------------------------------+
//   |  AVAILABLE OPPORTUNITIES (progress bars)     |
//   +----------------------------------------------+
//   |  YOUR RECENT SCRIPTS                         |
//   +----------------------------------------------+

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { DashboardUpgradeBanner } from '@/components/dashboard/dashboard-upgrade-banner'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { DashboardScriptCard } from '@/components/dashboard/dashboard-script-card'
import Link from 'next/link'
import { InlineScriptUpload } from '@/components/inline-script-upload'

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
  const isTrial = !isPro
  const service = svc()

  // ---------- YOUR scripts ----------
  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at')
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

  // Dashboard opportunities: matches first, then non-matches, up to 3
  const nonMatchedOpps = allOpenOpps.filter(o =>
    !availableOpps.some(ao => ao.id === o.id) && !appliedOppIds.has(o.id)
  )
  const dashboardOpps = [...availableOpps, ...nonMatchedOpps].slice(0, 3)
  const matchedOppIds = new Set(availableOpps.map(o => o.id))

  return (
    <>
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />

      <div className="space-y-8">

        {/* ── UPLOAD SECTION — vivid, full width ─────── */}
        <section>
          <h2 className="text-[22px] font-bold text-white m-0 mb-5">What are you working on?</h2>
          <div className="max-w-xl">
            <InlineScriptUpload startOpen redirectTo="/dashboard" />
          </div>
        </section>

        {/* ── TWO-COLUMN: Scripts + Opportunities ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent scripts */}
          <section>
            <header className="flex items-end justify-between gap-3 mb-3">
              <h2 className="text-[13px] font-semibold m-0 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Recent scripts</h2>
              {completedScripts.length > 3 && (
                <Link href="/scripts" className="text-[12px] font-semibold flex items-center gap-0.5 hover:text-purple-400 transition-colors" style={{ color: '#6b7280' }}>
                  All scripts
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              )}
            </header>

            {completedScripts.length === 0 && processingScripts.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-8 text-center" style={{ borderColor: '#374151' }}>
                <div className="flex justify-center mb-3">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold m-0 mb-1" style={{ color: '#e5e7eb' }}>No scripts yet</p>
                <p className="text-[13px] m-0" style={{ color: '#6b7280' }}>Upload your first script above to get started.</p>
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
                {completedScripts.slice(0, 3).map(script => (
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
                  />
                ))}
              </div>
            )}
          </section>

          {/* Opportunities */}
          <section>
            <header className="flex items-end justify-between gap-3 mb-3">
              <h2 className="text-[13px] font-semibold m-0 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Opportunities</h2>
              <Link href="/opportunities" className="text-[12px] font-semibold flex items-center gap-0.5 hover:text-purple-400 transition-colors" style={{ color: '#6b7280' }}>
                See all
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </header>

            {dashboardOpps.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-8 text-center" style={{ borderColor: '#374151' }}>
                <div className="flex justify-center mb-3">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold m-0 mb-1" style={{ color: '#e5e7eb' }}>No opportunities yet</p>
                <p className="text-[13px] m-0" style={{ color: '#6b7280' }}>New opportunities are posted regularly. Check back soon.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboardOpps.map(opp => {
                  const isMatch = matchedOppIds.has(opp.id)
                  const deadlineDays = opp.deadline
                    ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
                    : null
                  const qCount = countQualifyingScripts(opp)

                  return (
                    <Link key={opp.id} href={`/opportunities/${opp.slug}`} className="block group">
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-purple-200 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-[14px] font-bold text-gray-900 m-0 leading-snug group-hover:text-purple-700 transition-colors">
                            {opp.title}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isMatch && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>
                                Match
                              </span>
                            )}
                            {deadlineDays != null && deadlineDays > 0 && deadlineDays <= 14 && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                deadlineDays <= 7
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : 'bg-gray-50 text-gray-400 border border-gray-200'
                              }`}>
                                {deadlineDays === 1 ? 'Closes tomorrow' : `${deadlineDays}d left`}
                              </span>
                            )}
                          </div>
                        </div>
                        {opp.description && (
                          <p className="text-[12px] text-gray-500 m-0 mb-2 line-clamp-2 leading-relaxed">{opp.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400 font-medium">
                            {qCount > 0 ? `${qCount} ${qCount === 1 ? 'script qualifies' : 'scripts qualify'}` : ''}
                          </span>
                          <span className="text-[12px] font-bold flex items-center gap-1 ml-auto" style={{ color: '#7c3aed' }}>
                            View
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
