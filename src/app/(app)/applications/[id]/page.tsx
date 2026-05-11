// /applications/[id] — view a single application (consideration with opportunity).
// Redesigned: opportunity context → script → feedback centerpiece → response.

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

  // Load the opportunity (include perspective)
  const { data: opp } = await service
    .from('opportunities')
    .select('id, title, slug, description, subtitle')
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

  const hasFeedbackContent = isReviewed && (
    (app.feedback_tags && app.feedback_tags.length > 0) ||
    (app.next_steps_tags && app.next_steps_tags.length > 0) ||
    app.feedback
  )

  return (
    <div className="max-w-lg mx-auto space-y-8">

      {/* ── BACK LINK ─────────────────────────────────── */}
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to dashboard
      </Link>

      {/* ── HEADER ────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: '#ede9fe', color: '#5b21b6' }}
          >
            {isReviewed ? 'Reviewed' : isPending ? 'Pending' : 'In review'}
          </span>
          <span className="text-[12px] text-gray-400">Applied {fmtDate(app.submitted_at)}</span>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 m-0 leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
          {opp?.title || 'Application'}
        </h1>
      </div>

      {/* ── OPPORTUNITY CONTEXT ───────────────────────── */}
      <section
        className="rounded-xl px-5 py-4"
        style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}
      >
        {opp?.subtitle && (
          <p className="text-[13px] text-gray-500 m-0 mb-2 font-medium leading-snug">
            {opp.subtitle}
          </p>
        )}

        {opp?.description && (
          <p className="text-[13px] text-gray-500 m-0 leading-relaxed line-clamp-3">
            {opp.description}
          </p>
        )}

        <Link
          href={`/opportunities/${opp?.slug ?? opp?.id}`}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-purple-600 hover:text-purple-700 mt-2.5"
        >
          View full opportunity
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
      </section>

      {/* ── SCRIPT SUBMITTED ──────────────────────────── */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 m-0 mb-2">
          Script considered
        </p>
        <div className="space-y-2">
          {scripts.map(s => (
            <Link key={s.id} href={`/report/${s.id}`} className="block group">
              <div
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 hover:border-purple-200 transition-colors"
                style={{ border: '1.5px solid #e5e7eb' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                    {s.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.score != null && (
                    <span
                      className="text-[13px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    >
                      {Math.round(s.score)}
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-300 group-hover:text-purple-400 transition-colors">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PITCH (if submitted) ──────────────────────── */}
      {app.writer_pitch && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 m-0 mb-1.5">Your pitch</p>
          <p className="text-[13px] text-gray-600 m-0 leading-relaxed">{app.writer_pitch}</p>
        </section>
      )}

      {/* ── FEEDBACK — the centerpiece ────────────────── */}
      {hasFeedbackContent && (
        <section
          className="rounded-2xl px-6 py-5 space-y-5"
          style={{
            background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 50%, #ede9fe 100%)',
            border: '1px solid #c4b5fd',
          }}
        >
          {/* Producer note — pull-quote editorial treatment */}
          {app.feedback && (
            <div
              className="pl-4"
              style={{ borderLeft: '3px solid #c4b5fd' }}
            >
              <p
                className="text-[16px] text-gray-800 m-0 leading-relaxed italic"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                &ldquo;{app.feedback}&rdquo;
              </p>
            </div>
          )}

          {/* Next steps */}
          {app.next_steps_tags && app.next_steps_tags.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-400 m-0 mb-1.5">
                Suggested next steps
              </p>
              <div className="flex flex-wrap gap-1.5">
                {app.next_steps_tags.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="text-[12px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Feedback tags */}
          {app.feedback_tags && app.feedback_tags.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 m-0 mb-1.5">
                Feedback
              </p>
              <div className="flex flex-wrap gap-1.5">
                {app.feedback_tags.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="text-[12px] px-2.5 py-1 rounded-full bg-white/70 text-gray-600 font-medium"
                    style={{ border: '1px solid rgba(196, 181, 253, 0.3)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviewed date */}
          {app.reviewed_at && (
            <p className="text-[11px] text-purple-400 m-0 pt-1">
              Reviewed {fmtDate(app.reviewed_at)}
            </p>
          )}
        </section>
      )}

      {/* Reviewed but no feedback content */}
      {isReviewed && !hasFeedbackContent && (
        <section
          className="rounded-2xl px-6 py-5"
          style={{
            background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 50%, #ede9fe 100%)',
            border: '1px solid #c4b5fd',
          }}
        >
          <p className="text-[13px] text-gray-500 m-0">
            Your application has been reviewed. No additional feedback was provided.
          </p>
          {app.reviewed_at && (
            <p className="text-[11px] text-purple-400 m-0 mt-2">
              Reviewed {fmtDate(app.reviewed_at)}
            </p>
          )}
        </section>
      )}

      {/* ── WRITER RESPONSE ───────────────────────────── */}
      {isReviewed && !app.writer_response && (
        <ApplicationReply applicationId={app.id} />
      )}

      {app.writer_response && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 m-0 mb-2">Your response</p>
          <div
            className="rounded-xl bg-white px-4 py-3"
            style={{ border: '1.5px solid #e5e7eb' }}
          >
            <p className="text-[13px] text-gray-700 m-0 leading-relaxed">{app.writer_response}</p>
          </div>
        </section>
      )}

      {/* ── PENDING STATE ─────────────────────────────── */}
      {isPending && (
        <section
          className="rounded-xl px-5 py-4"
          style={{ background: '#ede9fe', border: '1px solid #c4b5fd' }}
        >
          <p className="text-[13px] text-purple-700 m-0 font-medium">
            Your application is being reviewed. You&apos;ll receive feedback soon.
          </p>
        </section>
      )}

    </div>
  )
}
