// /applications/[id] — single application detail.
// Two-column layout: left = submission content, right = review status + feedback.

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

function getYoutubeEmbedUrl(url: string): string {
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  return url
}

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
    .select('id, title, slug, description, subtitle, application_questions, genres, formats')
    .eq('id', app.opportunity_id)
    .single()

  // Load attached scripts
  const { data: scriptLinks } = await service
    .from('consideration_scripts')
    .select('script_submission_id')
    .eq('consideration_id', app.id)

  const scriptIds = (scriptLinks || []).map((l: { script_submission_id: string }) => l.script_submission_id)

  let scripts: { id: string; title: string; score: number | null; evalId: string | null; format: string | null; createdAt: string }[] = []
  if (scriptIds.length > 0) {
    const { data: subs } = await service
      .from('script_submissions')
      .select('id, title, declared_format, created_at')
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
      format: s.declared_format,
      createdAt: s.created_at,
    }))
  }

  // Load timeline events to determine highest stage reached
  const { data: evts } = await service
    .from('consideration_events')
    .select('new_stage')
    .eq('consideration_id', app.id)
    .eq('event_type', 'status_change')
    .order('created_at', { ascending: true })

  const reachedStages = new Set<string>(['in_consideration'])
  for (const ev of (evts || []) as { new_stage: string | null }[]) {
    if (ev.new_stage) reachedStages.add(ev.new_stage)
  }
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

  // Parsed response data
  const responses = ((app as any).application_responses || {}) as Record<string, string>
  const rawMedia = ((app as any).media_urls || []) as Array<string | { type: string; url: string; filename?: string }>
  const mediaItems = rawMedia.map(m => typeof m === 'string' ? JSON.parse(m) : m) as Array<{ type: string; url: string; filename?: string }>
  const customQuestions = ((opp as any)?.application_questions || []) as Array<{ id: string; prompt: string }>

  const UNIVERSAL_DIMS: Array<{ key: string; label: string }> = [
    { key: 'fit_originality', label: 'Fit & originality' },
    { key: 'market_potential', label: 'Market potential' },
    { key: 'casting', label: 'Casting' },
    { key: 'market_landscape', label: 'Market landscape' },
  ]

  const hasMedia = mediaItems.length > 0

  // Status badge
  const STAGE_DISPLAY: Record<string, { label: string; bg: string; color: string }> = {
    in_consideration: { label: 'In consideration', bg: '#ede9fe', color: '#5b21b6' },
    shortlisted: { label: 'Shortlisted', bg: '#dbeafe', color: '#1e40af' },
    partner_match: { label: 'Partner match', bg: '#d1fae5', color: '#065f46' },
    complete: { label: 'Pass', bg: '#fef3c7', color: '#92400e' },
  }
  const displayStage = isReviewed && !isUpgraded ? 'complete' : (app.review_stage || 'in_consideration')
  const badge = STAGE_DISPLAY[displayStage] || STAGE_DISPLAY.in_consideration

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── BACK LINK ── */}
      <Link
        href="/applications"
        className="inline-flex items-center gap-1 text-[13px] font-semibold mb-5"
        style={{ color: '#7c3aed' }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to applications
      </Link>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ════ LEFT COLUMN: Submission content ════ */}
        <div className="flex-1 min-w-0">

          {/* Opportunity preview card */}
          <div className="rounded-2xl bg-white overflow-hidden mb-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Paid</span>
                    <span className="text-[12px] text-gray-400">Applied {fmtDate(app.submitted_at)}</span>
                  </div>
                  <h1 className="text-[18px] font-bold text-gray-900 m-0 leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
                    {opp?.title || 'Application'}
                  </h1>
                  {opp?.subtitle && (
                    <p className="text-[13px] text-gray-600 m-0 mt-1 leading-snug">{opp.subtitle}</p>
                  )}
                </div>
                <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full shrink-0" style={{ background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
              {/* Format + genre */}
              <div className="flex items-center gap-3 mt-2">
                {(opp as any)?.formats?.length > 0 && (
                  <span className="text-[12px] text-gray-500">
                    <span className="text-gray-400">Format:</span> {(opp as any).formats.join(', ')}
                  </span>
                )}
                {(opp as any)?.genres?.length > 0 && (
                  <span className="text-[12px] text-gray-500">
                    <span className="text-gray-400">Genre:</span> {(opp as any).genres.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Media at top — most visual element first */}
          {hasMedia && (
            <div className="mb-5">
              <div className="space-y-3">
                {mediaItems.map((item, i) => (
                  <div key={i}>
                    {item.type === 'image' && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.filename || 'Image'} className="rounded-xl border border-gray-200 w-full max-h-80 object-cover" />
                    )}
                    {item.type === 'youtube' && (
                      <iframe
                        src={getYoutubeEmbedUrl(item.url)}
                        className="w-full rounded-xl border border-gray-200"
                        style={{ height: '280px' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                    {item.type === 'file' && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13px] text-purple-600 hover:text-purple-700 font-semibold rounded-lg border border-gray-200 bg-white px-4 py-2.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {item.filename || 'Download document'}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Script card — richer with format + date */}
          <div className="mb-5">
            <p className="text-[13px] font-semibold text-gray-600 m-0 mb-2">Script submitted</p>
            {scripts.map(s => (
              <div key={s.id} className="rounded-xl bg-white px-4 py-3.5 mb-2" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.format && <span className="text-[12px] text-gray-400">{s.format === 'tv' ? 'TV Series' : 'Film'}</span>}
                      <span className="text-[12px] text-gray-300">&middot;</span>
                      <span className="text-[12px] text-gray-400">Uploaded {fmtDate(s.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
              </div>
            ))}
          </div>

          {/* Application responses */}
          {UNIVERSAL_DIMS.some(d => responses[d.key]?.trim()) && (
            <div className="mb-5">
              <p className="text-[13px] font-semibold text-gray-600 m-0 mb-2">Your application</p>
              <div className="rounded-xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
                {UNIVERSAL_DIMS.filter(d => responses[d.key]?.trim()).map((d, i, arr) => (
                  <div key={d.key} className="px-5 py-3.5" style={i < arr.length - 1 ? { borderBottom: '1px solid #f3f4f6' } : undefined}>
                    <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide m-0 mb-1">{d.label}</p>
                    <p className="text-[14px] text-gray-700 m-0 leading-relaxed">{responses[d.key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy pitch fallback */}
          {!UNIVERSAL_DIMS.some(d => responses[d.key]?.trim()) && !customQuestions.some(q => responses[q.id]?.trim()) && !hasMedia && app.writer_pitch && (
            <div className="mb-5">
              <p className="text-[13px] font-semibold text-gray-600 m-0 mb-2">Your pitch</p>
              <div className="rounded-xl bg-white px-5 py-4" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
                <p className="text-[14px] text-gray-700 m-0 leading-relaxed italic">&ldquo;{app.writer_pitch}&rdquo;</p>
              </div>
            </div>
          )}

          {/* Custom questions */}
          {customQuestions.some(q => responses[q.id]?.trim()) && (
            <div className="mb-5">
              <div className="rounded-xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
                {customQuestions.filter(q => responses[q.id]?.trim()).map((q, i, arr) => (
                  <div key={q.id} className="px-5 py-3.5" style={i < arr.length - 1 ? { borderBottom: '1px solid #f3f4f6' } : undefined}>
                    <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide m-0 mb-1">{q.prompt}</p>
                    <p className="text-[14px] text-gray-700 m-0 leading-relaxed">{responses[q.id]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN: Review status + feedback ════ */}
        <div className="lg:w-[320px] shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* Stage tracker */}
            <div className="rounded-xl bg-white px-5 py-4" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
              <p className="text-[12px] font-semibold text-gray-600 m-0 mb-3">Review progress</p>
              <div className="flex items-start">
                {ALL_STAGES.map((s, i) => {
                  const reached = reachedStages.has(s.key)
                  const isSkipped = isReviewed && !reached

                  let circle
                  if (reached) {
                    circle = (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#7c3aed' }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                          <path d="M4 8l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )
                  } else if (isSkipped) {
                    circle = (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#f3f4f6', border: '2px solid #d1d5db' }}>
                        <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )
                  } else {
                    circle = (
                      <div className="w-6 h-6 rounded-full" style={{ background: '#f3f4f6', border: '2px solid #d1d5db' }} />
                    )
                  }

                  return (
                    <div key={s.key} className="flex items-center flex-1 last:flex-initial" style={i === ALL_STAGES.length - 1 ? { flex: '0 0 auto' } : undefined}>
                      <div className="flex flex-col items-center" style={{ minWidth: 24 }}>
                        {circle}
                        <span className="text-[9px] mt-1 text-center whitespace-nowrap" style={{ color: reached ? '#7c3aed' : '#9ca3af', fontWeight: reached ? 600 : 500 }}>
                          {s.label}
                        </span>
                      </div>
                      {i < ALL_STAGES.length - 1 && (
                        <div className="h-0.5 flex-1 mx-0.5" style={{ background: reached && reachedStages.has(ALL_STAGES[i + 1]?.key) ? '#7c3aed' : '#e5e7eb', marginTop: -10 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Feedback card */}
            {isReviewed ? (
              <div className="rounded-xl bg-white px-5 py-4" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
                <p className="text-[12px] font-semibold text-gray-600 m-0 mb-3">Feedback</p>

                {app.feedback_tags && app.feedback_tags.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-gray-400 m-0 mb-1.5">What stood out</p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.feedback_tags.map((tag: string) => (
                        <span key={tag} className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {app.next_steps_tags && app.next_steps_tags.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-gray-400 m-0 mb-1.5">Why passing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.next_steps_tags.map((tag: string) => (
                        <span key={tag} className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {app.feedback && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-gray-400 m-0 mb-1">Note</p>
                    <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{app.feedback}</p>
                  </div>
                )}

                {app.reviewed_at && (
                  <p className="text-[11px] text-gray-300 m-0">Reviewed {fmtDate(app.reviewed_at)}</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-white px-5 py-5 text-center" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
                <p className="text-[13px] text-gray-400 m-0 leading-relaxed">
                  Your application is under review. Feedback will appear here once reviewed.
                </p>
              </div>
            )}

            {/* Heat */}
            {isReviewed && app.heat_earned > 0 ? (
              <div className="rounded-xl px-5 py-3.5" style={{ background: '#fff7ed', boxShadow: '0 0 0 1px rgba(234,88,12,0.1)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px]">🔥</span>
                    <span className="text-[16px] font-bold" style={{ color: '#ea580c' }}>+{app.heat_earned} heat</span>
                  </div>
                  <Link href="/dashboard" className="text-[12px] font-semibold shrink-0" style={{ color: '#ea580c' }}>
                    Dashboard →
                  </Link>
                </div>
                <p className="text-[12px] m-0 mt-1" style={{ color: '#9a3412' }}>
                  Total: {totalHeat} heat
                </p>
              </div>
            ) : isReviewed ? (
              <div className="rounded-xl px-5 py-3" style={{ background: '#f9fafb' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-400">🔥 +0 heat</span>
                  <Link href="/dashboard" className="text-[12px] font-semibold text-gray-400 hover:text-gray-600">Dashboard →</Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl px-5 py-3" style={{ background: '#f9fafb' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-400">🔥 — heat</span>
                  <Link href="/dashboard" className="text-[12px] font-semibold text-gray-400 hover:text-gray-600">Dashboard →</Link>
                </div>
              </div>
            )}

            {/* Writer response */}
            {isReviewed && (
              <div>
                {app.writer_response ? (
                  <div className="rounded-xl bg-white px-5 py-4" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
                    <p className="text-[12px] font-semibold text-gray-600 m-0 mb-2">Your response</p>
                    <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{app.writer_response}</p>
                  </div>
                ) : (
                  <ApplicationReply applicationId={app.id} />
                )}
              </div>
            )}

            {/* Reapply CTA */}
            {isReviewed && opp?.slug && (
              <Link
                href={`/opportunities/${opp.slug}/apply`}
                className="block text-center text-[13px] font-semibold text-purple-600 hover:text-purple-800 py-2 transition-colors"
              >
                Reapply to this opportunity →
              </Link>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
