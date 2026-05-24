// /partner/applications/[id] — Partner reviews a single application.
// Same UI as admin /review/applications/[id] but gated by opportunity ownership.

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { TagFeedbackForm } from '@/components/review/tag-feedback-form'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function PartnerApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/partner')

  // Verify producer account
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()
  if (profile?.account_type !== 'producer') redirect('/dashboard')

  const service = svc()

  // Load the application
  const { data: app } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_id, writer_pitch, writer_response, sentiment, heat_earned, application_responses, media_urls, reviewer_strengths, reviewer_concerns')
    .eq('id', id)
    .single()

  if (!app || !app.opportunity_id) notFound()

  // Verify this partner owns the opportunity
  const { data: opp } = await service
    .from('opportunities')
    .select('id, title, slug, description, application_questions, owner_id')
    .eq('id', app.opportunity_id)
    .single()

  if (!opp || opp.owner_id !== user.id) {
    redirect('/partner')
  }

  // Load writer
  const { data: writer } = await service
    .from('profiles')
    .select('full_name, email, subscription_status')
    .eq('id', app.writer_id)
    .single()

  // Load scripts
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

  // Query all previously-used tags across all considerations (for autocomplete)
  const { data: allConsiderations } = await service
    .from('considerations')
    .select('feedback_tags, next_steps_tags')
    .not('feedback_tags', 'is', null)

  const usedFeedbackTags = [...new Set(
    (allConsiderations || []).flatMap((c: any) => c.feedback_tags || [])
  )]
  const usedNextStepsTags = [...new Set(
    (allConsiderations || []).flatMap((c: any) => c.next_steps_tags || [])
  )]

  const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const STAGE_DISPLAY: Record<string, { label: string; classes: string }> = {
    draft: { label: 'New', classes: 'bg-yellow-50 text-yellow-700' },
    pending: { label: 'Pending', classes: 'bg-yellow-50 text-yellow-700' },
    in_consideration: { label: 'In consideration', classes: 'bg-purple-50 text-purple-700' },
    shortlisted: { label: 'Shortlisted', classes: 'bg-blue-50 text-blue-700' },
    partner_match: { label: 'Partner match', classes: 'bg-green-50 text-green-700' },
    complete: { label: 'Reviewed', classes: 'bg-gray-100 text-gray-500' },
  }
  const currentStage = STAGE_DISPLAY[app.review_stage || 'pending'] || STAGE_DISPLAY.pending

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/partner" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
          ← Back to dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
              {opp.title}
            </h1>
            <p className="text-[13px] text-gray-400 m-0 mt-1">Applied {fmtDate(app.submitted_at)}</p>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${currentStage.classes}`}>
            {currentStage.label}
          </span>
        </div>

        {/* Writer info */}
        <section className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-1">Writer</p>
          <p className="text-[14px] font-semibold text-gray-900 m-0">{writer?.full_name || 'Unknown'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {writer?.email && <span className="text-[12px] text-gray-500">{writer.email}</span>}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              (writer?.subscription_status === 'active' || writer?.subscription_status === 'trialing') ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {(writer?.subscription_status === 'active' || writer?.subscription_status === 'trialing') ? 'Pro' : 'Free'}
            </span>
          </div>
        </section>

        {/* Script */}
        <section>
          <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-2">Script</h2>
          {scripts.map(s => (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.score && (
                  <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded ${
                    s.score >= 80 ? 'bg-green-50 text-green-700' :
                    s.score >= 70 ? 'bg-blue-50 text-blue-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{Math.round(s.score)}</span>
                )}
                {s.evalId && (
                  <Link href={`/report/${s.evalId}`} className="text-[12px] text-purple-600 hover:text-purple-700 font-semibold">
                    View report →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Application responses */}
        {(() => {
          const responses = (app.application_responses || {}) as Record<string, string>
          const rawMedia = (app.media_urls || []) as Array<string | { type: string; url: string; filename?: string }>
          const mediaItems = rawMedia.map(m => typeof m === 'string' ? JSON.parse(m) : m) as Array<{ type: string; url: string; filename?: string }>

          const writerNote = responses.fit_originality?.trim()
          const hasMedia = mediaItems.length > 0
          const hasPitch = !writerNote && !hasMedia && app.writer_pitch

          if (!writerNote && !hasMedia && !hasPitch) return null

          function getYoutubeEmbedUrl(url: string): string {
            const watchMatch = url.match(/[?&]v=([^&]+)/)
            if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
            const shortMatch = url.match(/youtu\.be\/([^?]+)/)
            if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
            return url
          }

          return (
            <section>
              <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-3">Application</h2>
              <div className="space-y-3">
                {writerNote && (
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-1">Writer&apos;s note</p>
                    <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{writerNote}</p>
                  </div>
                )}

                {hasPitch && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-1">Writer&apos;s note</p>
                    <p className="text-[13px] text-gray-600 m-0 leading-relaxed italic">&ldquo;{app.writer_pitch}&rdquo;</p>
                  </div>
                )}

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
            </section>
          )
        })()}

        {/* Writer's response to feedback */}
        {app.writer_response && (
          <section>
            <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1.5">Writer&apos;s response</h2>
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 px-4 py-3">
              <p className="text-[13px] text-gray-600 m-0 leading-relaxed">{app.writer_response}</p>
            </div>
          </section>
        )}

        {/* Tag feedback form */}
        <section>
          <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-3">
            {isReviewed ? 'Feedback (sent)' : 'Send feedback'}
          </h2>
          <TagFeedbackForm
            considerationId={app.id}
            currentFeedbackTags={app.feedback_tags || []}
            currentNextStepsTags={app.next_steps_tags || []}
            currentFeedback={app.feedback || ''}
            allUsedFeedbackTags={usedFeedbackTags}
            allUsedNextStepsTags={usedNextStepsTags}
            currentReviewStage={app.review_stage || 'pending'}
            currentSentiment={app.sentiment || null}
            currentHeatEarned={app.heat_earned || 0}
          />
        </section>
    </div>
  )
}
