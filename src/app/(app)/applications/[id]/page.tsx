// /applications/[id] — single application detail.
// One consistent skeleton: back → header → stage tracker → context → producer card → heat → response.

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { ApplicationReply } from '@/components/applications/application-reply'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

const ALL_STAGES = [
  { key: 'in_consideration', label: 'In consideration' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'partner_match', label: 'Partner match' },
]

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const service = svc()
  const { id } = await params

  // Load consideration
  const { data: app } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, writer_response, heat_earned, application_responses, media_urls')
    .eq('id', id)
    .eq('writer_id', user.id)
    .single()

  if (!app || !app.opportunity_id) notFound()

  // Load opportunity
  const { data: opp } = await service
    .from('opportunities')
    .select('id, title, slug, description, subtitle, application_questions')
    .eq('id', app.opportunity_id)
    .single()

  // Load attached scripts
  const { data: scriptLinks } = await service
    .from('consideration_scripts')
    .select('script_submission_id')
    .eq('consideration_id', app.id)

  const scriptIds = (scriptLinks || []).map((l: { script_submission_id: string }) => l.script_submission_id)

  let scripts: { id: string; title: string; score: number | null; evalId: string | null }[] = []
  if (scriptIds.length > 0) {
    const { data: subs } = await service
      .from('script_submissions')
      .select('id, title')
      .in('id', scriptIds)
    const { data: evals } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score')
      .in('submission_id', scriptIds)
    const evalMap = new Map((evals || []).map((e: any) => [e.submission_id, { score: e.weighted_score, evalId: e.id }]))
    scripts = (subs || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      score: evalMap.get(s.id)?.score ?? null,
      evalId: evalMap.get(s.id)?.evalId ?? null,
    }))
  }

  // Load timeline events to determine highest stage reached
  const { data: evts } = await service
    .from('consideration_events')
    .select('new_stage')
    .eq('consideration_id', app.id)
    .eq('event_type', 'status_change')
    .order('created_at', { ascending: true })

  const stageOrder = ['in_consideration', 'shortlisted', 'partner_match']
  const reachedStages = new Set<string>(['in_consideration']) // every application is in consideration
  for (const ev of (evts || []) as { new_stage: string | null }[]) {
    if (ev.new_stage) reachedStages.add(ev.new_stage)
  }
  // Also add the current review_stage
  if (app.review_stage) reachedStages.add(app.review_stage)

  // Load writer's total heat score
  const { data: profile } = await service
    .from('profiles')
    .select('heat_score')
    .eq('id', user.id)
    .single()
  const totalHeat = (profile as any)?.heat_score ?? 0

  const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
  const isUpgraded = app.review_stage === 'shortlisted' || app.review_stage === 'partner_match'
  const currentStage = isUpgraded ? app.review_stage : 'in_consideration'

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Stage tracker: use reachedStages set for accurate display

  return (
    <div className="max-w-lg mx-auto">

      {/* ── BACK LINK ── */}
      <Link
        href="/applications"
        className="inline-flex items-center gap-1 text-[13px] font-semibold mb-5"
        style={{ color: '#7c3aed' }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to applications
      </Link>

      {/* ── HEADER ── */}
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-gray-900 m-0 mb-1 leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
          {opp?.title || 'Application'}
        </h1>
        <p className="text-[12px] text-gray-400 m-0">Applied {fmtDate(app.submitted_at)}</p>
      </div>

      {/* ── STAGE TRACKER ── */}
      <div className="mb-6">
        <div className="flex items-start">
          {ALL_STAGES.map((s, i) => {
            const reached = reachedStages.has(s.key)
            // Skipped = review is done but this stage was never reached
            const isSkipped = isReviewed && !reached
            // Is this the current active stage (for pending states)
            const isCurrent = s.key === currentStage

            // Find if the previous stage was reached (for connector color)
            const prevReached = i > 0 ? reachedStages.has(ALL_STAGES[i - 1].key) : false

            let circle
            if (reached) {
              circle = (
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#7c3aed' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )
            } else if (isSkipped) {
              circle = (
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#f3f4f6', border: '2px solid #d1d5db' }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              )
            } else {
              circle = (
                <div className="w-7 h-7 rounded-full" style={{ background: '#f3f4f6', border: '2px solid #d1d5db' }} />
              )
            }

            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-initial" style={i === ALL_STAGES.length - 1 ? { flex: '0 0 auto' } : undefined}>
                <div className="flex flex-col items-center" style={{ minWidth: 28 }}>
                  {circle}
                  <span
                    className="text-[10px] mt-1.5 text-center whitespace-nowrap"
                    style={{
                      color: reached ? '#7c3aed' : '#9ca3af',
                      fontWeight: isCurrent ? 600 : 500,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < ALL_STAGES.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mx-1"
                    style={{
                      background: reached && reachedStages.has(ALL_STAGES[i + 1]?.key) ? '#7c3aed' : '#e5e7eb',
                      marginTop: -10,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SCRIPT ── */}
      <div className="mb-5">
        <p className="text-[13px] font-bold text-gray-900 m-0 mb-2">Script</p>
        {scripts.map(s => (
          <div key={s.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-gray-900">{s.title}</span>
            <div className="flex items-center gap-3">
              {s.score != null && (
                <span className={`text-[13px] font-bold px-2 py-0.5 rounded ${
                  s.score >= 80 ? 'bg-green-50 text-green-700' :
                  s.score >= 70 ? 'bg-blue-50 text-blue-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>
                  {Math.round(s.score)}
                </span>
              )}
              {s.evalId && (
                <Link href={`/report/${s.evalId}`} className="text-[13px] font-semibold" style={{ color: '#7c3aed' }}>
                  View report →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── APPLICATION RESPONSES ── */}
      {(() => {
        const responses = ((app as any).application_responses || {}) as Record<string, string>
        const mediaItems = ((app as any).media_urls || []) as Array<{ type: string; url: string; filename?: string }>
        const customQuestions = ((opp as any)?.application_questions || []) as Array<{ id: string; prompt: string }>

        const UNIVERSAL_DIMS: Array<{ key: string; label: string }> = [
          { key: 'fit_originality', label: 'Fit & originality' },
          { key: 'market_potential', label: 'Market potential' },
          { key: 'casting', label: 'Casting' },
          { key: 'market_landscape', label: 'Market landscape' },
        ]

        const hasUniversal = UNIVERSAL_DIMS.some(d => responses[d.key]?.trim())
        const hasCustom = customQuestions.some(q => responses[q.id]?.trim())
        const hasMedia = mediaItems.length > 0
        const hasPitch = !hasUniversal && !hasCustom && !hasMedia && app.writer_pitch

        if (!hasUniversal && !hasCustom && !hasMedia && !hasPitch) return null

        function getYoutubeEmbedUrl(url: string): string {
          const watchMatch = url.match(/[?&]v=([^&]+)/)
          if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
          const shortMatch = url.match(/youtu\.be\/([^?]+)/)
          if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
          return url
        }

        return (
          <div className="mb-5">
            <p className="text-[13px] font-bold text-gray-900 m-0 mb-2">Application</p>
            <div className="space-y-2">
              {UNIVERSAL_DIMS.filter(d => responses[d.key]?.trim()).map(d => (
                <div key={d.key} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-1">{d.label}</p>
                  <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{responses[d.key]}</p>
                </div>
              ))}

              {hasPitch && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-1">Pitch</p>
                  <p className="text-[13px] text-gray-600 m-0 leading-relaxed italic">&ldquo;{app.writer_pitch}&rdquo;</p>
                </div>
              )}

              {customQuestions.filter(q => responses[q.id]?.trim()).map(q => (
                <div key={q.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-1">{q.prompt}</p>
                  <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{responses[q.id]}</p>
                </div>
              ))}

              {hasMedia && (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-2">Media & references</p>
                  <div className="space-y-2">
                    {mediaItems.map((item, i) => (
                      <div key={i}>
                        {item.type === 'image' && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt={item.filename || 'Image'} className="rounded-lg border border-gray-200 max-h-60 object-cover" />
                        )}
                        {item.type === 'youtube' && (
                          <iframe
                            src={getYoutubeEmbedUrl(item.url)}
                            className="w-full rounded-lg border border-gray-200"
                            style={{ height: '220px' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )}
                        {item.type === 'file' && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[13px] text-purple-600 hover:text-purple-700 font-semibold"
                          >
                            ↓ {item.filename || 'Download document'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── PRODUCER CARD (content swaps by state) ── */}
      {isReviewed ? (
        <div
          className="rounded-xl px-5 py-5 mb-4"
          style={{ background: 'white', border: '1px solid #e5e7eb' }}
        >
          {/* Feedback */}
          <p className="text-[13px] font-semibold text-gray-900 m-0 mb-2">Feedback</p>
          {app.feedback ? (
            <p className="text-[13px] text-gray-600 m-0 mb-4 leading-relaxed">{app.feedback}</p>
          ) : (
            <p className="text-[13px] text-gray-400 m-0 mb-4">No additional feedback was provided.</p>
          )}

          {/* Next steps tags */}
          {app.next_steps_tags && app.next_steps_tags.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-gray-900 m-0 mb-2">Suggested next steps</p>
              <div className="flex flex-wrap gap-1.5">
                {app.next_steps_tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[12px] font-semibold px-3 py-1 rounded-full"
                    style={{ background: '#d1fae5', color: '#059669' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {app.reviewed_at && (
            <p className="text-[11px] text-gray-300 m-0 mt-4">Reviewed {fmtDate(app.reviewed_at)}</p>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl px-5 py-6 mb-4 text-center"
          style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
        >
          <p className="text-[13px] text-gray-400 m-0 leading-relaxed">
            Your application is under review.<br />
            Feedback will appear here once it&apos;s been reviewed.
          </p>
        </div>
      )}

      {/* ── HEAT SECTION ── */}
      {isReviewed && app.heat_earned > 0 ? (
        <div
          className="rounded-xl px-5 py-4 mb-5"
          style={{ background: '#fff7ed' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[16px]">🔥</span>
            <span className="text-[18px] font-bold" style={{ color: '#ea580c' }}>+{app.heat_earned} heat</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[12px] m-0 leading-relaxed" style={{ color: '#9a3412' }}>
              This application earned {app.heat_earned} heat on your score. Your total: {totalHeat} heat.
            </p>
            <Link href="/dashboard" className="text-[12px] font-semibold shrink-0 ml-3" style={{ color: '#ea580c' }}>
              View dashboard
            </Link>
          </div>
        </div>
      ) : isReviewed ? (
        <div
          className="rounded-xl px-5 py-4 mb-5"
          style={{ background: '#f9fafb' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px]">🔥</span>
              <span className="text-[15px] font-semibold text-gray-400">+0 heat</span>
            </div>
            <Link href="/dashboard" className="text-[12px] font-semibold text-gray-400 hover:text-gray-600">
              View dashboard
            </Link>
          </div>
          <p className="text-[12px] text-gray-400 m-0 mt-1.5 leading-relaxed">
            No heat was earned on this application. Your total heat score: {totalHeat}.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl px-5 py-4 mb-5"
          style={{ background: '#f9fafb' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px]">🔥</span>
              <span className="text-[15px] font-semibold text-gray-400">&mdash; heat</span>
            </div>
            <Link href="/dashboard" className="text-[12px] font-semibold text-gray-400 hover:text-gray-600">
              View dashboard
            </Link>
          </div>
          <p className="text-[12px] text-gray-400 m-0 mt-1.5 leading-relaxed">
            Heat is earned when your application is reviewed. Your total heat score: {totalHeat}.
          </p>
        </div>
      )}

      {/* ── WRITER RESPONSE ── */}
      {isReviewed && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          {app.writer_response ? (
            <div>
              <p className="text-[13px] font-semibold text-gray-900 m-0 mb-2">Your response</p>
              <div
                className="rounded-xl bg-white px-4 py-3"
                style={{ border: '1px solid #e5e7eb' }}
              >
                <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{app.writer_response}</p>
              </div>
            </div>
          ) : (
            <ApplicationReply applicationId={app.id} />
          )}
        </div>
      )}

    </div>
  )
}
