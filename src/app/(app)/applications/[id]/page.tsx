// /applications/[id] — view a single application (consideration with opportunity).
// Shows: status, scripts submitted, pitch, feedback (tags + note), reply field.

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

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const service = svc()
  const { id } = await params

  // Load the consideration
  const { data: app } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, writer_response')
    .eq('id', id)
    .eq('writer_id', user.id)
    .single()

  if (!app || !app.opportunity_id) notFound()

  // Load the opportunity
  const { data: opp } = await service
    .from('opportunities')
    .select('id, title, slug, description, deal_type')
    .eq('id', app.opportunity_id)
    .single()

  // Load attached scripts
  const { data: scriptLinks } = await service
    .from('consideration_scripts')
    .select('script_submission_id')
    .eq('consideration_id', app.id)

  const scriptIds = (scriptLinks || []).map((l: { script_submission_id: string }) => l.script_submission_id)

  let scripts: { id: string; title: string; score: number | null }[] = []
  if (scriptIds.length > 0) {
    const { data: subs } = await service
      .from('script_submissions')
      .select('id, title')
      .in('id', scriptIds)
    const { data: evals } = await service
      .from('script_evaluations')
      .select('submission_id, weighted_score')
      .in('submission_id', scriptIds)
    const evalMap = new Map((evals || []).map((e: any) => [e.submission_id, e.weighted_score]))
    scripts = (subs || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      score: evalMap.get(s.id) ?? null,
    }))
  }

  const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
  const isPending = app.status === 'pending'

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Back */}
      <Link href="/dashboard" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
        ← Back to dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
          {opp?.title || 'Application'}
        </h1>
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            isReviewed ? 'bg-green-50 text-green-700' :
            isPending ? 'bg-yellow-50 text-yellow-700' :
            'bg-purple-50 text-purple-700'
          }`}>
            {isReviewed ? 'Reviewed' : isPending ? 'Pending' : 'In review'}
          </span>
          <span className="text-[12px] text-gray-400">Applied {fmtDate(app.submitted_at)}</span>
          {opp?.deal_type && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium capitalize">
              {opp.deal_type.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Scripts submitted */}
      <section>
        <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-2">Scripts submitted</h2>
        <div className="space-y-1.5">
          {scripts.map(s => (
            <Link key={s.id} href={`/report/${s.id}`} className="block">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 hover:border-purple-200 transition-colors">
                <span className="text-[13px] font-medium text-gray-900 truncate">{s.title}</span>
                {s.score && (
                  <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded ${
                    s.score >= 80 ? 'bg-green-50 text-green-700' :
                    s.score >= 70 ? 'bg-blue-50 text-blue-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{Math.round(s.score)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pitch */}
      {app.writer_pitch && (
        <section>
          <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1.5">Your pitch</h2>
          <p className="text-[13px] text-gray-600 m-0 leading-relaxed">{app.writer_pitch}</p>
        </section>
      )}

      {/* Feedback — only if reviewed */}
      {isReviewed && (
        <section className="rounded-xl border border-green-100 bg-green-50/30 p-4 space-y-3">
          <h2 className="text-[14px] font-bold text-gray-900 m-0">Feedback</h2>

          {/* Feedback tags */}
          {app.feedback_tags && app.feedback_tags.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide m-0 mb-1">Reason</p>
              <div className="flex flex-wrap gap-1.5">
                {app.feedback_tags.map((tag: string, i: number) => (
                  <span key={i} className="text-[12px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Next steps tags */}
          {app.next_steps_tags && app.next_steps_tags.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide m-0 mb-1">Next steps</p>
              <div className="flex flex-wrap gap-1.5">
                {app.next_steps_tags.map((tag: string, i: number) => (
                  <span key={i} className="text-[12px] px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Optional human note */}
          {app.feedback && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide m-0 mb-1">Note</p>
              <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{app.feedback}</p>
            </div>
          )}
        </section>
      )}

      {/* Writer reply — only if reviewed and hasn't replied yet */}
      {isReviewed && !app.writer_response && (
        <ApplicationReply applicationId={app.id} />
      )}

      {/* Show existing reply */}
      {app.writer_response && (
        <section>
          <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1.5">Your response</h2>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-[13px] text-gray-600 m-0 leading-relaxed">{app.writer_response}</p>
          </div>
        </section>
      )}

      {/* Pending state */}
      {isPending && (
        <div className="rounded-xl border border-yellow-100 bg-yellow-50/30 px-4 py-3.5">
          <p className="text-[13px] text-gray-600 m-0">Your application is being reviewed. You'll receive feedback within a few days.</p>
        </div>
      )}
    </div>
  )
}
