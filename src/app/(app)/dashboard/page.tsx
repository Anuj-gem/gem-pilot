// /dashboard — writer dashboard (v9, two-column dark layout).
//
// Layout (lg+):
//   +----------+-----------------------------------+
//   | PROFILE  |  "What are you working on?"       |
//   | CARD     |  [Upload card — white]            |
//   | (240px)  |  Recent scripts (dark cards)      |
//   |          |  Opportunities (dark cards)        |
//   +----------+-----------------------------------+
//
// Mobile: compact identity strip + single column stacked.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
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
    .select('subscription_status, full_name, handle, avatar_url, heat_score, headline')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const isTrial = !isPro
  const service = svc()

  // ---------- YOUR scripts ----------
  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; is_public: boolean | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at, is_public')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
  const submissionIds = visible.map((s) => s.id)

  // ---------- EVALUATIONS ----------
  function normGenre(g: string | null | undefined): string {
    return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  type FeedEval = { id: string; weighted_score: number | null; genres: string[]; format: string | null; logline: string | null }
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
      const logline = (evJson?.positioning_hook as string) || (cls.logline as string) || null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: Array.from(genreSet), format, logline })
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
        isPublic: s.is_public ?? false,
        logline: ev?.logline ?? null,
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

  const userName = profile?.full_name || 'Writer'
  const userHeadline = (profile as any)?.headline as string | null
  const avatarUrl = profile?.avatar_url as string | null
  const scriptCount = completedScripts.length + processingScripts.length
  const appCount = allApplications.length

  // Score color + background helper
  function scoreBg(s: number): { bg: string; color: string } {
    if (s >= 80) return { bg: '#ecfdf5', color: '#059669' }
    if (s >= 60) return { bg: '#f5f3ff', color: '#7c3aed' }
    if (s >= 40) return { bg: '#fffbeb', color: '#d97706' }
    return { bg: '#f9fafb', color: '#9ca3af' }
  }

  return (
    <>
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />

      <div className="space-y-8">

        {/* ── UPLOAD SECTION ── */}
        <section>
          <h2 className="text-[20px] font-bold text-gray-800 m-0 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            What are you working on?
          </h2>
          <InlineScriptUpload startOpen redirectTo="/dashboard" />
        </section>

        {/* ── RECENT SCRIPTS ── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 m-0">Recent scripts</h2>
            {completedScripts.length > 3 && (
              <Link href="/scripts" className="text-[12px] font-medium text-gray-500 hover:text-gray-900 flex items-center gap-0.5 transition-colors">
                All scripts
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            )}
          </header>

          {completedScripts.length === 0 && processingScripts.length === 0 ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[14px] text-gray-400 m-0">No scripts yet. Upload one above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Processing scripts */}
              {processingScripts.map(script => (
                <div key={script.id} className="rounded-xl bg-white px-5 py-4"
                  style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-[48px] h-[48px] rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#f5f3ff' }}>
                      <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#ede9fe" strokeWidth="2.5" />
                        <path d="M12 2a10 10 0 019.95 9" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-gray-900 truncate">{script.title}</div>
                      <div className="text-[13px] text-gray-400 mt-0.5">
                        Evaluating your script...
                        {script.format && <span className="ml-1.5 text-gray-300">&middot;</span>}
                        {script.format && <span className="ml-1.5">{script.format}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Completed scripts */}
              {completedScripts.slice(0, 3).map(script => {
                const ev = myEvalBySub.get(script.id)
                const score = ev?.weighted_score ?? null
                const roundedScore = score ? Math.round(score) : null
                const colors = roundedScore ? scoreBg(roundedScore) : { bg: '#f9fafb', color: '#d1d5db' }

                return (
                  <div key={script.id} className="rounded-xl bg-white px-5 py-4 group transition-shadow duration-150 hover:shadow-md"
                    style={{
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Score badge — solid colored square */}
                      <div className="w-[48px] h-[48px] rounded-xl flex items-center justify-center shrink-0 text-[18px] font-bold"
                        style={{ background: colors.bg, color: colors.color }}>
                        {roundedScore ?? '—'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold text-gray-900 truncate leading-snug">{script.title}</div>

                        {script.logline && (
                          <p className="text-[13px] leading-relaxed text-gray-500 m-0 mt-1 line-clamp-2">
                            {script.logline}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {script.format && (
                            <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{script.format}</span>
                          )}
                          {script.genres[0] && (
                            <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded capitalize">{script.genres[0]}</span>
                          )}
                          <span className="text-[11px] text-gray-300 ml-1">{fmtDate(script.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                          {script.evaluationId && (
                            <Link href={`/report/${script.evaluationId}`}
                              className="text-[12px] font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-0.5 transition-colors">
                              View report
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </Link>
                          )}

                          {script.qualifyingOpps.length > 0 && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ background: '#ecfdf5', color: '#059669' }}>
                              Qualifies for {script.qualifyingOpps.length} {script.qualifyingOpps.length === 1 ? 'call' : 'calls'}
                            </span>
                          )}

                          {!script.isPublic && (
                            <Link href={script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'}
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors hover:opacity-90"
                              style={{ background: 'rgba(124,58,237,0.06)', color: '#7c3aed' }}>
                              Publish to Discover
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── OPPORTUNITIES ── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 m-0">Opportunities</h2>
            <Link href="/opportunities" className="text-[12px] font-medium text-gray-500 hover:text-gray-900 flex items-center gap-0.5 transition-colors">
              See all
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </header>

          {dashboardOpps.length === 0 ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[14px] text-gray-400 m-0">No opportunities right now. Check back soon.</p>
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
                    <div className="rounded-xl bg-white px-5 py-4 transition-shadow duration-150 hover:shadow-md"
                      style={{
                        border: isMatch ? '1px solid rgba(5,150,105,0.15)' : '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="text-[15px] font-semibold text-gray-900 m-0 leading-snug group-hover:text-purple-700 transition-colors">
                          {opp.title}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {isMatch && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: '#ecfdf5', color: '#059669' }}>
                              Match
                            </span>
                          )}
                          {deadlineDays != null && deadlineDays > 0 && deadlineDays <= 14 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: deadlineDays <= 7 ? '#fef2f2' : '#fffbeb',
                                color: deadlineDays <= 7 ? '#dc2626' : '#d97706',
                              }}>
                              {deadlineDays === 1 ? 'Closes tomorrow' : `${deadlineDays}d left`}
                            </span>
                          )}
                        </div>
                      </div>
                      {opp.subtitle && (
                        <p className="text-[13px] text-gray-500 m-0 mb-2 leading-relaxed">{opp.subtitle}</p>
                      )}
                      {!opp.subtitle && opp.description && (
                        <p className="text-[13px] text-gray-500 m-0 mb-2 line-clamp-2 leading-relaxed">{opp.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold" style={{ color: qCount > 0 ? '#059669' : 'transparent' }}>
                          {qCount > 0 ? `${qCount} ${qCount === 1 ? 'script qualifies' : 'scripts qualify'}` : ''}
                        </span>
                        <span className="text-[12px] font-medium text-gray-400 group-hover:text-gray-700 flex items-center gap-0.5 transition-colors">
                          View details
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
    </>
  )
}
