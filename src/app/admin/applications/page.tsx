// /admin/applications — single review queue for ALL partner applications.
// Admin-only (anuj@gem.studio / anujkommareddy@gmail.com). Each application is a
// writer + their scripts; each script gets per-script Pass + reasoning.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ScriptReviewBlock } from '@/components/producer/script-review-block'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['anuj@gem.studio', 'anujkommareddy@gmail.com']

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

type ScriptRow = {
  scriptId: string
  title: string
  score: number | null
  evalId: string | null
  outcome: string | null
  feedback: string | null
  tags: string[]
}

export default async function AdminApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) redirect('/')

  const service = svc()

  const { data: cons } = await service
    .from('considerations')
    .select('id, writer_id, status, submitted_at, opportunity_id')
    .not('opportunity_id', 'is', null)
    .order('submitted_at', { ascending: false })

  const conList = (cons || []) as { id: string; writer_id: string; status: string; submitted_at: string }[]
  const conIds = conList.map((c) => c.id)
  const writerIds = [...new Set(conList.map((c) => c.writer_id))]

  const { data: csRows } = conIds.length
    ? await service
        .from('consideration_scripts')
        .select('consideration_id, script_submission_id, outcome, feedback, feedback_tags')
        .in('consideration_id', conIds)
    : { data: [] as any[] }

  const scriptIds = [...new Set(((csRows || []) as any[]).map((r) => r.script_submission_id))]

  const { data: subs } = scriptIds.length
    ? await service.from('script_submissions').select('id, title').in('id', scriptIds)
    : { data: [] as any[] }
  const { data: evals } = scriptIds.length
    ? await service.from('script_evaluations').select('id, submission_id, weighted_score').in('submission_id', scriptIds)
    : { data: [] as any[] }
  const { data: profs } = writerIds.length
    ? await service.from('profiles').select('id, full_name, email').in('id', writerIds)
    : { data: [] as any[] }

  const subMap = new Map(((subs || []) as any[]).map((s) => [s.id, s.title]))
  const evalMap = new Map(((evals || []) as any[]).map((e) => [e.submission_id, { evalId: e.id, score: e.weighted_score }]))
  const profMap = new Map(((profs || []) as any[]).map((p) => [p.id, p]))

  const scriptsByCon = new Map<string, ScriptRow[]>()
  for (const r of (csRows || []) as any[]) {
    const arr = scriptsByCon.get(r.consideration_id) || []
    arr.push({
      scriptId: r.script_submission_id,
      title: subMap.get(r.script_submission_id) || 'Untitled',
      score: evalMap.get(r.script_submission_id)?.score ?? null,
      evalId: evalMap.get(r.script_submission_id)?.evalId ?? null,
      outcome: r.outcome ?? null,
      feedback: r.feedback ?? null,
      tags: r.feedback_tags ?? [],
    })
    scriptsByCon.set(r.consideration_id, arr)
  }

  const hasUnreviewed = (id: string) => (scriptsByCon.get(id) || []).some((s) => !s.outcome)
  const needsReview = conList.filter((c) => hasUnreviewed(c.id))
  const done = conList.filter((c) => !hasUnreviewed(c.id))

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const Application = ({ c }: { c: { id: string; writer_id: string; submitted_at: string } }) => {
    const writer = profMap.get(c.writer_id)
    const scripts = scriptsByCon.get(c.id) || []
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-gray-900 m-0 truncate">{writer?.full_name || 'Unknown writer'}</p>
            {writer?.email && <p className="text-[12px] text-gray-400 m-0">{writer.email}</p>}
          </div>
          <span className="text-[12px] text-gray-400 shrink-0">{fmtDate(c.submitted_at)} · {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'}</span>
        </div>
        {scripts.map((s) => (
          <ScriptReviewBlock
            key={s.scriptId}
            considerationId={c.id}
            scriptId={s.scriptId}
            title={s.title}
            score={s.score}
            evalId={s.evalId}
            initialOutcome={s.outcome}
            initialFeedback={s.feedback}
            initialTags={s.tags}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-[24px] font-bold text-gray-900 m-0 mb-1">Applications</h1>
      <p className="text-[13px] text-gray-500 m-0 mb-6">
        {needsReview.length} to review · {done.length} reviewed
      </p>

      {needsReview.length === 0 && done.length === 0 && (
        <p className="text-[14px] text-gray-400">No applications yet.</p>
      )}

      {needsReview.length > 0 && (
        <section className="mb-8">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-3">Needs review</p>
          {needsReview.map((c) => <Application key={c.id} c={c} />)}
        </section>
      )}

      {done.length > 0 && (
        <section>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-3">Reviewed</p>
          {done.map((c) => <Application key={c.id} c={c} />)}
        </section>
      )}
    </div>
  )
}
