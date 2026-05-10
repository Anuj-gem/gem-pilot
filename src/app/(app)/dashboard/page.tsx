// /dashboard — writer dashboard (v6, opportunity-centric).
//
// Layout:
//   +----------------------------------------------+
//   |  PROFILE HEADER  +  New script button        |
//   +----------------------------------------------+
//   |  APPLICATIONS (the heartbeat)                |
//   |  — or empty-state nudge toward opportunities |
//   +----------------------------------------------+
//   |  YOUR SCRIPTS (compact, no scores)           |
//   +----------------------------------------------+

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
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
    .select('subscription_status, full_name, handle, avatar_url')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active'
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
  type FeedEval = { id: string; weighted_score: number | null; genre: string | null; format: string | null }
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
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      const format = (cls.format as string) || (fmt.format as string) || null
      myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genre, format })
    }
  }

  // ---------- OPEN OPPORTUNITIES ----------
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres, min_score')
    .eq('status', 'active')
  const allOpenOpps = (openOpps || []) as {
    id: string; title: string; slug: string
    formats: string[] | null; genres: string[] | null; min_score: number | null
  }[]

  // ---------- APPLICATIONS (considerations with opportunity_id) ----------
  const { data: applications } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, writer_response')
    .eq('writer_id', user.id)
    .not('opportunity_id', 'is', null)
    .order('submitted_at', { ascending: false })

  const allApplications = (applications || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null; writer_response: string | null
  }[]

  // Map opportunity IDs to info
  const oppMap = new Map(allOpenOpps.map(o => [o.id, o]))

  // ---------- MATCHING LOGIC ----------
  function getQualifyingOpps(format: string | null, genre: string | null, score: number | null) {
    return allOpenOpps.filter(o => {
      if (o.min_score && (!score || score < o.min_score)) return false
      const noFormatFilter = !o.formats || o.formats.length === 0
      const noGenreFilter = !o.genres || o.genres.length === 0
      if (noFormatFilter && noGenreFilter) return true
      const fmtMatch = noFormatFilter || (format && o.formats!.some(f => f.toLowerCase() === format.toLowerCase()))
      const genreMatch = noGenreFilter || (genre && o.genres!.some(g => genre.toLowerCase().includes(g.toLowerCase())))
      return fmtMatch || genreMatch
    })
  }

  // Build script cards with matching opps
  const completedScripts = visible
    .filter(s => s.status === 'completed')
    .map(s => {
      const ev = myEvalBySub.get(s.id)
      const qualifyingOpps = getQualifyingOpps(ev?.format || s.declared_format, ev?.genre || null, ev?.weighted_score || null)
      return {
        id: s.id,
        title: s.title,
        format: ev?.format || s.declared_format,
        genre: ev?.genre || null,
        evaluationId: ev?.id ?? null,
        qualifyingOppCount: qualifyingOpps.length,
      }
    })

  const isProcessing = visible.some((s) => s.status === 'processing' || s.status === 'queued')

  // Total qualifying opps across all scripts (for empty-state nudge)
  const totalQualifying = completedScripts.reduce((sum, s) => sum + s.qualifyingOppCount, 0)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <>
      {isTrial && <UpgradeModalListener />}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}

      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── PROFILE HEADER + NEW SCRIPT ──────────────── */}
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100 shrink-0" />
          ) : (
            <div
              className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', fontSize: 15 }}
            >
              {(profile?.full_name || '·').split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase() ?? '').join('') || '·'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[17px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {profile?.full_name || 'Welcome'}
              </h1>
              {isPro && (
                <span
                  className="inline-flex items-center text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-white px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Pro
                </span>
              )}
            </div>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500 shrink-0"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </Link>
        </div>

        {/* ── APPLICATIONS (the heartbeat) ─────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-2.5">
            <h2 className="text-[15px] font-bold text-gray-900 m-0">Your applications</h2>
            {allApplications.length > 0 && (
              <Link href="/review" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
                View all
              </Link>
            )}
          </header>

          {allApplications.length === 0 ? (
            /* Empty state — nudge toward opportunities */
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-center">
              {totalQualifying > 0 ? (
                <>
                  <p className="text-[14px] font-semibold text-gray-900 m-0 mb-1">
                    You qualify for {allOpenOpps.length} open {allOpenOpps.length === 1 ? 'call' : 'calls'}
                  </p>
                  <p className="text-[13px] text-gray-400 m-0 mb-4">
                    Pick an opportunity and apply with one of your scripts.
                  </p>
                  <Link
                    href="/opportunities"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                  >
                    Browse opportunities
                  </Link>
                </>
              ) : completedScripts.length > 0 ? (
                <>
                  <p className="text-[14px] font-semibold text-gray-900 m-0 mb-1">No applications yet</p>
                  <p className="text-[13px] text-gray-400 m-0 mb-4">
                    Check open calls to see what you qualify for.
                  </p>
                  <Link
                    href="/opportunities"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    View open calls
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-semibold text-gray-900 m-0 mb-1">Get started</p>
                  <p className="text-[13px] text-gray-400 m-0">
                    Upload a script to get your report — then apply to open calls.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {allApplications.map(app => {
                const opp = oppMap.get(app.opportunity_id)
                const isPending = app.status === 'pending'
                const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
                return (
                  <Link key={app.id} href={`/applications/${app.id}`} className="block">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-purple-200 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
                            {opp?.title || 'Opportunity'}
                          </p>
                          <p className="text-[12px] text-gray-400 m-0 mt-0.5">Applied {fmtDate(app.submitted_at)}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isReviewed ? 'bg-green-50 text-green-700' :
                          isPending ? 'bg-yellow-50 text-yellow-700' :
                          'bg-purple-50 text-purple-700'
                        }`}>
                          {isReviewed ? 'Reviewed' : isPending ? 'Pending' : 'In review'}
                        </span>
                      </div>
                      {isReviewed && app.feedback_tags && app.feedback_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-50">
                          {app.feedback_tags.map((tag, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
                          ))}
                        </div>
                      )}
                      {isReviewed && app.feedback && (
                        <p className="text-[12px] text-gray-500 m-0 mt-2 pt-2 border-t border-gray-50 line-clamp-2">{app.feedback}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── YOUR SCRIPTS ───────────────────────────────── */}
        <section>
          <header className="flex items-end justify-between gap-3 mb-2.5">
            <h2 className="text-[15px] font-bold text-gray-900 m-0">Your scripts</h2>
            {completedScripts.length > 0 && (
              <Link href="/scripts" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
                View all
              </Link>
            )}
          </header>

          {completedScripts.length === 0 && !isProcessing ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-[13px] text-gray-500 m-0">Upload a script to get your free report.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {isProcessing && (
                <div className="rounded-xl border border-purple-100 bg-purple-50/50 px-4 py-3 flex items-center gap-2.5">
                  <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-[13px] text-purple-700">Your script is being evaluated...</span>
                </div>
              )}
              {completedScripts.slice(0, 5).map(script => (
                <div key={script.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/report/${script.evaluationId}`} className="text-[14px] font-semibold text-gray-900 truncate hover:text-purple-700 block">
                        {script.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {script.format && <span className="text-[12px] text-gray-400">{script.format}</span>}
                        {script.genre && <span className="text-[12px] text-gray-400">· {script.genre}</span>}
                      </div>
                    </div>
                    {script.qualifyingOppCount > 0 && (
                      <Link
                        href="/opportunities"
                        className="text-[12px] text-purple-600 font-semibold whitespace-nowrap shrink-0 hover:text-purple-700"
                      >
                        {script.qualifyingOppCount} open {script.qualifyingOppCount === 1 ? 'call' : 'calls'}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {completedScripts.length > 5 && (
                <Link href="/scripts" className="block text-center text-[12px] text-gray-400 hover:text-purple-600 font-semibold py-2">
                  View all {completedScripts.length} scripts →
                </Link>
              )}
            </div>
          )}
        </section>

      </div>
    </>
  )
}
