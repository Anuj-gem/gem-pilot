// /producer/opportunities — producer review dashboard.
// Shows all opportunities owned by the logged-in producer, with
// submission queues and inline review controls.
// opportunities-v1 (2026-05-02).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ProducerReviewCard } from '@/components/producer/review-card'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ProducerOpportunitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/producer/opportunities')

  const service = svc()

  // Fetch opportunities owned by this user
  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, slug, status, deadline')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (!opps || opps.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center">
        <p className="text-gray-500 text-[14px]">You don't own any opportunities.</p>
      </div>
    )
  }

  const oppIds = opps.map(o => o.id)

  // Fetch all submissions for these opportunities (exclude withdrawn)
  const { data: allSubs } = await service
    .from('opportunity_submissions')
    .select('id, opportunity_id, submission_id, writer_id, status, feedback, next_steps, outcome, submitted_at, reviewed_at')
    .in('opportunity_id', oppIds)
    .neq('status', 'withdrawn')
    .order('submitted_at', { ascending: false })

  type SubRow = {
    id: string; opportunity_id: string; submission_id: string;
    writer_id: string; status: string; feedback: string | null;
    next_steps: string | null; outcome: string | null; submitted_at: string; reviewed_at: string | null
  }
  const submissions = (allSubs || []) as SubRow[]

  // Fetch script + eval data for each submission
  const scriptIds = [...new Set(submissions.map(s => s.submission_id))]
  const writerIds = [...new Set(submissions.map(s => s.writer_id))]

  let scriptMap = new Map<string, { title: string; format: string | null }>()
  let evalMap = new Map<string, { id: string; weighted_score: number | null; logline: string | null; genre: string | null }>()
  let writerMap = new Map<string, { full_name: string | null; handle: string | null }>()

  if (scriptIds.length > 0) {
    const [{ data: scripts }, { data: evals }] = await Promise.all([
      service.from('script_submissions').select('id, title, declared_format').in('id', scriptIds),
      service.from('script_evaluations').select('id, submission_id, weighted_score, evaluation, edited_fields').in('submission_id', scriptIds),
    ])
    for (const s of (scripts || []) as { id: string; title: string; declared_format: string | null }[]) {
      scriptMap.set(s.id, { title: s.title, format: s.declared_format })
    }
    for (const e of (evals || []) as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown; edited_fields: Record<string, unknown> | null }[]) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const ef = e.edited_fields as Record<string, unknown> | null
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const logline = (ef?.logline as string) || (fmt.logline_one_line as string) || (evJson?.positioning_hook as string) || null
      const genre = (ef?.genre_primary as string) || (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      evalMap.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, logline, genre })
    }
  }

  if (writerIds.length > 0) {
    const { data: writers } = await service
      .from('profiles')
      .select('id, full_name, handle')
      .in('id', writerIds)
    for (const w of (writers || []) as { id: string; full_name: string | null; handle: string | null }[]) {
      writerMap.set(w.id, { full_name: w.full_name, handle: w.handle })
    }
  }

  // Build per-opportunity data
  type ReviewItem = {
    submissionRowId: string
    scriptId: string
    evaluationId: string | null
    title: string
    format: string | null
    genre: string | null
    logline: string | null
    score: number | null
    writerName: string | null
    writerHandle: string | null
    status: string
    feedback: string | null
    nextSteps: string | null
    outcome: string | null
    submittedAt: string
    reviewedAt: string | null
  }

  const oppData = opps.map(opp => {
    const items: ReviewItem[] = submissions
      .filter(s => s.opportunity_id === opp.id)
      .map(s => {
        const script = scriptMap.get(s.submission_id)
        const ev = evalMap.get(s.submission_id)
        const writer = writerMap.get(s.writer_id)
        return {
          submissionRowId: s.id,
          scriptId: s.submission_id,
          evaluationId: ev?.id ?? null,
          title: script?.title ?? 'Unknown',
          format: script?.format ?? null,
          genre: ev?.genre ?? null,
          logline: ev?.logline ?? null,
          score: ev?.weighted_score ?? null,
          writerName: writer?.full_name ?? null,
          writerHandle: writer?.handle ?? null,
          status: s.status,
          feedback: s.feedback,
          nextSteps: s.next_steps,
          outcome: s.outcome,
          submittedAt: s.submitted_at,
          reviewedAt: s.reviewed_at,
        }
      })
    const pendingCount = items.filter(i => i.status === 'pending').length
    return { ...opp, items, pendingCount }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1">Producer</p>
        <h1 className="text-[22px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
          Your opportunities
        </h1>
      </div>

      {oppData.map(opp => (
        <section key={opp.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-gray-900 m-0">{opp.title}</h2>
              <span className="text-[12px] text-gray-400">
                {opp.items.length} submission{opp.items.length !== 1 ? 's' : ''}
                {opp.pendingCount > 0 && (
                  <span className="ml-2 text-amber-600 font-semibold">{opp.pendingCount} pending</span>
                )}
              </span>
            </div>
          </div>

          {opp.items.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-[13.5px] text-gray-400 m-0">No submissions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {opp.items.map(item => (
                <ProducerReviewCard key={item.submissionRowId} item={item} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
