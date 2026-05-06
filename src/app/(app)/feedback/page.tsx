// /feedback — Full feedback history.

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

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/feedback')

  const service = svc()

  // Get all reviewed considerations (newest first)
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

  // Count scripts per consideration
  const considerationIds = reviewed.map(c => c.id)
  const scriptCountByConsideration = new Map<string, number>()

  if (considerationIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', considerationIds)

    for (const row of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
      scriptCountByConsideration.set(
        row.consideration_id,
        (scriptCountByConsideration.get(row.consideration_id) ?? 0) + 1
      )
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>Feedback</h1>
        <Link href="/dashboard" className="text-[12px] font-semibold text-purple-600 hover:text-purple-800">
          ← Dashboard
        </Link>
      </header>

      {reviewed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <p className="text-[13.5px] text-gray-400 m-0">No feedback yet. Request consideration to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewed.map(c => (
            <FeedbackCycle
              key={c.id}
              submittedAt={c.submitted_at}
              reviewedAt={c.reviewed_at}
              feedback={c.feedback}
              nextSteps={c.next_steps}
              scriptCount={scriptCountByConsideration.get(c.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
