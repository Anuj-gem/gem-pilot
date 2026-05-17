// /review/applications — Producer view of opportunity applications.
// Separate from the existing portfolio review flow.
// Shows all considerations that have an opportunity_id, grouped by opportunity.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

const ADMIN_EMAILS = [
  'anuj@gem.studio',
  'anujkommareddy@gmail.com',
  'anuj+producer@gem.studio',
]

export default async function ApplicationsReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard')

  const service = svc()

  // Load all opportunity applications (considerations with opportunity_id)
  const { data: rawApps } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_id, writer_pitch, writer_response')
    .not('opportunity_id', 'is', null)
    .order('submitted_at', { ascending: false })

  const apps = (rawApps || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_id: string
    writer_pitch: string | null; writer_response: string | null
  }[]

  // Load opportunities for titles
  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, slug')
  const oppMap = new Map((opps || []).map((o: any) => [o.id, o]))

  // Load writer profiles
  const writerIds = [...new Set(apps.map(a => a.writer_id))]
  let writerMap = new Map<string, { full_name: string | null; email: string | null }>()
  if (writerIds.length > 0) {
    const { data: writers } = await service
      .from('profiles')
      .select('id, full_name, email')
      .in('id', writerIds)
    for (const w of (writers || []) as { id: string; full_name: string | null; email: string | null }[]) {
      writerMap.set(w.id, { full_name: w.full_name, email: w.email })
    }
  }

  // Load scripts for each application
  const appIds = apps.map(a => a.id)
  let scriptsByApp = new Map<string, { title: string; score: number | null; submission_id: string }[]>()
  if (appIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', appIds)

    const scriptIds = (cs || []).map((c: any) => c.script_submission_id)
    let evalMap = new Map<string, number | null>()
    let titleMap = new Map<string, string>()

    if (scriptIds.length > 0) {
      const { data: subs } = await service
        .from('script_submissions')
        .select('id, title')
        .in('id', scriptIds)
      for (const s of (subs || []) as { id: string; title: string }[]) {
        titleMap.set(s.id, s.title)
      }
      const { data: evals } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score')
        .in('submission_id', scriptIds)
      for (const e of (evals || []) as { submission_id: string; weighted_score: number | null }[]) {
        evalMap.set(e.submission_id, e.weighted_score)
      }
    }

    for (const c of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
      const existing = scriptsByApp.get(c.consideration_id) || []
      existing.push({
        submission_id: c.script_submission_id,
        title: titleMap.get(c.script_submission_id) || 'Untitled',
        score: evalMap.get(c.script_submission_id) ?? null,
      })
      scriptsByApp.set(c.consideration_id, existing)
    }
  }

  // Group by opportunity
  const byOpp = new Map<string, typeof apps>()
  for (const app of apps) {
    const existing = byOpp.get(app.opportunity_id) || []
    existing.push(app)
    byOpp.set(app.opportunity_id, existing)
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
          Opportunity applications
        </h1>
        <p className="text-[13px] text-gray-400 mt-1 m-0">{apps.filter(a => a.review_stage !== 'complete').length} pending · {apps.length} total</p>
      </header>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[14px] text-gray-500 m-0">No applications yet.</p>
        </div>
      ) : (
        Array.from(byOpp.entries()).map(([oppId, oppApps]) => {
          const opp = oppMap.get(oppId)
          const pendingCount = oppApps.filter(a => a.status === 'pending').length
          return (
            <section key={oppId}>
              <header className="flex items-center justify-between gap-3 mb-2.5">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900 m-0">{opp?.title || 'Unknown opportunity'}</h2>
                  <p className="text-[12px] text-gray-400 m-0 mt-0.5">
                    {oppApps.length} {oppApps.length === 1 ? 'application' : 'applications'}
                    {pendingCount > 0 && ` · ${pendingCount} pending`}
                  </p>
                </div>
              </header>

              <div className="space-y-2">
                {oppApps.map(app => {
                  const writer = writerMap.get(app.writer_id)
                  const scripts = scriptsByApp.get(app.id) || []
                  const isPending = app.status === 'pending'
                  const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'

                  return (
                    <Link key={app.id} href={`/review/applications/${app.id}`} className="block">
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-purple-200 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
                                {writer?.full_name || writer?.email || 'Unknown writer'}
                              </p>
                              {(() => {
                                const stageMap: Record<string, { label: string; classes: string }> = {
                                  pending: { label: 'Pending', classes: 'bg-yellow-50 text-yellow-700' },
                                  in_consideration: { label: 'In consideration', classes: 'bg-purple-50 text-purple-700' },
                                  shortlisted: { label: 'Shortlisted', classes: 'bg-blue-50 text-blue-700' },
                                  partner_match: { label: 'Partner match', classes: 'bg-green-50 text-green-700' },
                                  complete: { label: 'Pass', classes: 'bg-green-50 text-green-700' },
                                }
                                const stage = isReviewed ? 'complete' : (app.review_stage || 'pending')
                                const s = stageMap[stage] || stageMap.pending
                                return (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${s.classes}`}>
                                    {s.label}
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {scripts.map(s => (
                                <span key={s.submission_id} className="text-[12px] text-gray-500">
                                  {s.title}
                                  {s.score && <span className="text-[11px] font-semibold text-gray-400 ml-1">({Math.round(s.score)})</span>}
                                </span>
                              ))}
                              <span className="text-[11px] text-gray-300">·</span>
                              <span className="text-[11px] text-gray-400">{fmtDate(app.submitted_at)}</span>
                            </div>
                            {app.writer_pitch && (
                              <p className="text-[12px] text-gray-400 m-0 mt-1 line-clamp-1 italic">"{app.writer_pitch}"</p>
                            )}
                          </div>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 shrink-0">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
