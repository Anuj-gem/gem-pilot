// /review/applications/[id] — Producer reviews a single opportunity application.
// Shows: writer info, script + report link, pitch, tag-based feedback form.

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

export default async function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Admin check — use auth email directly (profiles.email may be null)
  const ADMIN_EMAILS = ['anuj@gem.studio', 'anujkommareddy@gmail.com', 'anuj+producer@gem.studio']
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard')

  const service = svc()

  // Load the application
  const { data: app } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_id, writer_pitch, writer_response, heat_earned')
    .eq('id', id)
    .single()

  if (!app || !app.opportunity_id) notFound()

  // Load opportunity
  const { data: opp } = await service
    .from('opportunities')
    .select('id, title, slug, description')
    .eq('id', app.opportunity_id)
    .single()

  // Load writer
  const { data: writer } = await service
    .from('profiles')
    .select('full_name, email, subscription_status')
    .eq('id', app.writer_id)
    .single()

  // Load scripts with hearted status
  const { data: scriptLinks } = await service
    .from('consideration_scripts')
    .select('script_submission_id, hearted')
    .eq('consideration_id', app.id)

  const scriptIds = (scriptLinks || []).map((l: { script_submission_id: string }) => l.script_submission_id)
  const heartedMap = new Map((scriptLinks || []).map((l: any) => [l.script_submission_id, l.hearted || false]))
  let scripts: { id: string; title: string; score: number | null; evalId: string | null; hearted: boolean }[] = []
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
      hearted: heartedMap.get(s.id) || false,
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
    pending: { label: 'Pending', classes: 'bg-yellow-50 text-yellow-700' },
    in_consideration: { label: 'In consideration', classes: 'bg-purple-50 text-purple-700' },
    shortlisted: { label: 'Shortlisted', classes: 'bg-blue-50 text-blue-700' },
    partner_match: { label: 'Partner match', classes: 'bg-green-50 text-green-700' },
    complete: { label: 'Pass', classes: 'bg-green-50 text-green-700' },
  }
  const currentStage = STAGE_DISPLAY[app.review_stage || 'pending'] || STAGE_DISPLAY.pending

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/review/applications" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
        ← Back to applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            {opp?.title || 'Application'}
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

      {/* Writer's pitch */}
      {app.writer_pitch && (
        <section>
          <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1.5">Writer's pitch</h2>
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
            <p className="text-[13px] text-gray-600 m-0 leading-relaxed italic">"{app.writer_pitch}"</p>
          </div>
        </section>
      )}

      {/* Writer's response to feedback */}
      {app.writer_response && (
        <section>
          <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1.5">Writer's response</h2>
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
          currentHeatEarned={app.heat_earned || 0}
          scripts={scripts.map(s => ({ script_submission_id: s.id, title: s.title || 'Untitled', hearted: s.hearted }))}
        />
      </section>
    </div>
  )
}
