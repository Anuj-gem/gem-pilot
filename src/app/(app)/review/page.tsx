// /review — Writer's opportunity applications listing.
// Shows all applications (considerations with opportunity_id),
// with status, feedback tags, and links to detail.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { UploadCTAButton } from '@/components/upload-cta-button'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="mb-5">
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Applications
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">Your opportunity applications will appear here.</p>
        </header>
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No applications yet</p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">Upload a script, get your report, then apply to open opportunities.</p>
          <UploadCTAButton
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors cursor-pointer border-0"
            style={{ background: 'var(--gem-accent)' }}
          >
            Upload a script
          </UploadCTAButton>
        </div>
      </div>
    )
  }

  const service = svc()

  // Load all opportunity applications (considerations with opportunity_id)
  const { data: rawApps } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, heat_earned')
    .eq('writer_id', user.id)
    .not('opportunity_id', 'is', null)
    .order('submitted_at', { ascending: false })

  const apps = (rawApps || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null
    heat_earned: number
  }[]

  // Load opportunity titles
  const oppIds = [...new Set(apps.map(a => a.opportunity_id))]
  let oppMap = new Map<string, { title: string; slug: string }>()
  if (oppIds.length > 0) {
    const { data: opps } = await service
      .from('opportunities')
      .select('id, title, slug')
      .in('id', oppIds)
    for (const o of (opps || []) as { id: string; title: string; slug: string }[]) {
      oppMap.set(o.id, { title: o.title, slug: o.slug })
    }
  }

  // Load scripts per application
  const appIds = apps.map(a => a.id)
  let scriptsByApp = new Map<string, { title: string; score: number | null }[]>()
  if (appIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', appIds)

    const scriptIds = (cs || []).map((c: any) => c.script_submission_id)
    let titleMap = new Map<string, string>()
    let evalMap = new Map<string, number | null>()

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
        title: titleMap.get(c.script_submission_id) || 'Untitled',
        score: evalMap.get(c.script_submission_id) ?? null,
      })
      scriptsByApp.set(c.consideration_id, existing)
    }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Applications
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">{apps.length} {apps.length === 1 ? 'application' : 'applications'}</p>
        </div>
        <Link
          href="/opportunities"
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          Browse opportunities
        </Link>
      </header>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No applications yet</p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">Upload a script, get your report, then apply to open opportunities.</p>
          <Link
            href="/opportunities"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ background: 'var(--gem-accent)' }}
          >
            View opportunities
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map(app => {
            const opp = oppMap.get(app.opportunity_id)
            const scripts = scriptsByApp.get(app.id) || []
            const isPending = app.status === 'pending'
            const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'

            return (
              <Link key={app.id} href={`/applications/${app.id}`} className="block">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
                          {opp?.title || 'Opportunity'}
                        </p>
                        {(() => {
                          const stageMap: Record<string, { label: string; bg: string; color: string }> = {
                            pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
                            in_consideration: { label: 'In consideration', bg: '#ede9fe', color: '#5b21b6' },
                            shortlisted: { label: 'Shortlisted', bg: '#dbeafe', color: '#1e40af' },
                            partner_match: { label: 'Partner match', bg: '#d1fae5', color: '#065f46' },
                            complete: { label: 'Pass', bg: '#d1fae5', color: '#065f46' },
                          }
                          const stage = isReviewed ? 'complete' : (app.review_stage || 'pending')
                          const s = stageMap[stage] || stageMap.pending
                          return (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: s.bg, color: s.color }}
                            >
                              {s.label}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {scripts.map((s, i) => (
                          <span key={i} className="text-[12px] text-gray-500">
                            {s.title}
                            {s.score && <span className="text-[11px] font-semibold text-gray-400 ml-1">({Math.round(s.score)})</span>}
                          </span>
                        ))}
                        <span className="text-[11px] text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{fmtDate(app.submitted_at)}</span>
                      </div>
                      {app.writer_pitch && (
                        <p className="text-[12px] text-gray-400 m-0 mt-1 line-clamp-1 italic">&ldquo;{app.writer_pitch}&rdquo;</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isReviewed && app.heat_earned > 0 && (
                        <span className="text-[11px] font-bold" style={{ color: '#f97316' }}>🔥 +{app.heat_earned}</span>
                      )}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Feedback tags if reviewed */}
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
    </div>
  )
}
