// /scripts — "My Scripts" — full list with sort, bulk hide, three-dot menu.
// Consideration model v1 (2026-05-05).

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { ScriptsList } from '@/components/dashboard/scripts-list'
import { NewReviewButton } from '@/components/dashboard/new-review-button'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ScriptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/scripts')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'active'
  const isTrial = !isPro
  const service = svc()

  // Fetch ALL scripts (including hidden — client toggles visibility)
  type SubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const allScripts = (mySubs as SubRow[] | null) || []
  const submissionIds = allScripts.map(s => s.id)

  // Evaluations
  const evalBySub = new Map<string, { id: string; score: number | null; genre: string | null }>()
  if (submissionIds.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (evs || []) as any[]) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      evalBySub.set(e.submission_id, { id: e.id, score: e.weighted_score, genre })
    }
  }

  // Considerations — use review_stage to distinguish draft / active / complete
  const { data: considerations } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, outcome')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  const allConsiderations = (considerations || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null; outcome: string | null
  }[]

  // Active = submitted and being reviewed (not draft, not complete)
  const activeConsideration = allConsiderations.find(
    c => c.review_stage !== 'draft' && c.review_stage !== 'complete'
  )
  // Completed considerations — ALL of them, not just the latest
  const completedConsiderations = allConsiderations.filter(c => c.review_stage === 'complete')
  const latestReviewed = completedConsiderations[0] || null

  // Scripts in active (submitted) considerations — NOT drafts
  let activeScriptIds = new Set<string>()
  if (activeConsideration) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', activeConsideration.id)
    for (const r of (cs || []) as { script_submission_id: string }[]) {
      activeScriptIds.add(r.script_submission_id)
    }
  }

  // Scripts from ALL completed considerations
  let reviewedScriptIds = new Set<string>()
  const completedIds = completedConsiderations.map(c => c.id)
  if (completedIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .in('consideration_id', completedIds)
    for (const r of (cs || []) as { script_submission_id: string }[]) {
      reviewedScriptIds.add(r.script_submission_id)
    }
  }

  // Paywall: first completed script is free
  const allCompleted = allScripts
    .filter(s => s.status === 'completed' && !s.hidden_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstCompletedId = allCompleted[0]?.id ?? null

  // Gate logic — eligible if no active/draft consideration AND has unreviewed scripts
  const hasNonCompleteConsideration = allConsiderations.some(
    c => c.review_stage !== 'complete'
  )
  const hasUnreviewedScripts = submissionIds.some(
    id => !reviewedScriptIds.has(id) && allScripts.find(s => s.id === id)?.status === 'completed' && !allScripts.find(s => s.id === id)?.hidden_at
  )
  const canRequestConsideration = !hasNonCompleteConsideration && hasUnreviewedScripts

  // Build script rows for client component
  const scriptRows = allScripts.map(s => {
    const ev = evalBySub.get(s.id)
    const stillProcessing = s.status === 'processing' || s.status === 'queued'
    const isFirstCompleted = s.id === firstCompletedId
    const isLocked = isTrial && !stillProcessing && s.status === 'completed' && !isFirstCompleted

    return {
      id: s.id,
      title: s.title,
      format: s.declared_format,
      genre: ev?.genre ?? null,
      score: ev?.score ?? null,
      evalId: ev?.id ?? null,
      createdAt: s.created_at,
      isProcessing: stillProcessing,
      isLocked,
      inConsideration: activeScriptIds.has(s.id),
      wasReviewed: reviewedScriptIds.has(s.id),
      hidden: !!s.hidden_at,
    }
  })

  const visibleCount = scriptRows.filter(s => !s.hidden).length

  return (
    <div className="max-w-2xl mx-auto">
      {isTrial && <UpgradeModalListener />}

      <header className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            My Scripts
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {visibleCount} {visibleCount === 1 ? 'script' : 'scripts'} evaluated
          </p>
        </div>
        <Link
          href="/submit"
          className="text-[12px] font-bold text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          Upload a script
        </Link>
      </header>

      {/* Consideration CTA */}
      {canRequestConsideration && (
        <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3.5 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-purple-900 m-0">Ready for consideration</p>
            <p className="text-[12px] text-purple-600 m-0 mt-0.5">Get feedback on your strengths and next steps.</p>
          </div>
          <NewReviewButton className="shrink-0 text-[12px] font-bold text-white px-3.5 py-1.5 rounded-lg transition-colors">
            Request consideration
          </NewReviewButton>
        </div>
      )}

      {/* Latest feedback summary */}
      {latestReviewed && latestReviewed.feedback && (
        <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">Latest feedback</span>
          </div>
          <p className="text-[12.5px] text-gray-600 m-0 line-clamp-2 leading-[1.5]">
            {latestReviewed.feedback}
          </p>
          <Link href="/feedback" className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 mt-1.5 inline-block">
            View full feedback →
          </Link>
        </div>
      )}

      {/* Script list (client component) */}
      <ScriptsList scripts={scriptRows} isPro={isPro} />

      {/* Pro/Free badge */}
      <div className="flex items-center justify-between mt-3">
        {isPro ? (
          <span className="text-[12px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">Pro</span>
        ) : (
          <span className="text-[12px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">Free</span>
        )}
        {isTrial && (
          <span className="text-[12px] text-gray-400">
            Upgrade for unlimited scripts
          </span>
        )}
      </div>
    </div>
  )
}
