// /feedback — Feedback history showing all past review cycles.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { FeedbackCycle } from '@/components/consideration/feedback-cycle'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function FeedbackHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/feedback')

  const service = svc()

  // Get all reviewed considerations
  const { data: considerations } = await service
    .from('considerations')
    .select('id, status, submitted_at, reviewed_at, feedback, outcome, next_steps')
    .eq('writer_id', user.id)
    .eq('status', 'reviewed')
    .order('reviewed_at', { ascending: false })

  const reviewed = (considerations || []) as {
    id: string; status: string; submitted_at: string; reviewed_at: string | null
    feedback: string | null; outcome: string | null; next_steps: string | null
  }[]

  // Get scripts for each consideration
  const considerationIds = reviewed.map(c => c.id)
  const scriptsByConsideration = new Map<string, { title: string; score: number | null }[]>()

  if (considerationIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', considerationIds)

    const scriptIds = [...new Set((cs || []).map((r: { script_submission_id: string }) => r.script_submission_id))]

    // Get script details
    const scriptMap = new Map<string, { title: string; score: number | null }>()
    if (scriptIds.length > 0) {
      const { data: subs } = await service
        .from('script_submissions')
        .select('id, title')
        .in('id', scriptIds)
      for (const s of (subs || []) as { id: string; title: string }[]) {
        scriptMap.set(s.id, { title: s.title, score: null })
      }
      const { data: evals } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score')
        .in('submission_id', scriptIds)
      for (const e of (evals || []) as { submission_id: string; weighted_score: number | null }[]) {
        const existing = scriptMap.get(e.submission_id)
        if (existing) existing.score = e.weighted_score
      }
    }

    // Group by consideration
    for (const row of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
      if (!scriptsByConsideration.has(row.consideration_id)) {
        scriptsByConsideration.set(row.consideration_id, [])
      }
      const script = scriptMap.get(row.script_submission_id)
      if (script) {
        scriptsByConsideration.get(row.consideration_id)!.push(script)
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-[18px] font-bold text-gray-900 m-0">Feedback history</h1>
        <Link href="/dashboard" className="text-[12px] font-semibold text-purple-600 hover:text-purple-800">
          ← Dashboard
        </Link>
      </header>

      {reviewed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <p className="text-[13.5px] text-gray-400 m-0">No feedback yet. Submit for consideration to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {reviewed.map(c => (
            <FeedbackCycle
              key={c.id}
              reviewedAt={c.reviewed_at}
              feedback={c.feedback}
              outcome={c.outcome}
              nextSteps={c.next_steps}
              scripts={scriptsByConsideration.get(c.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
