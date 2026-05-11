// /scripts — "My Scripts" — full list with sort, bulk hide, three-dot menu.
// Consideration model v1 (2026-05-05).

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { ScriptsList } from '@/components/dashboard/scripts-list'
import { NewReviewButton } from '@/components/dashboard/new-review-button'
import { UploadCTAButton } from '@/components/upload-cta-button'

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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
              Scripts
            </h1>
            <p className="text-[13px] text-gray-400 mt-1 m-0">0 scripts evaluated</p>
          </div>
        </header>
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No scripts yet</p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">Upload a screenplay to get your first evaluation.</p>
          <UploadCTAButton
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors cursor-pointer border-0"
            style={{ background: 'var(--gem-accent)' }}
          >
            Upload a script
          </UploadCTAButton>
        </div>
      </div>
    )
  }

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

  // Scripts from ALL completed considerations — build a map of scriptId → consideration
  let reviewedScriptIds = new Set<string>()
  const reviewedScriptConsideration = new Map<string, { id: string; index: number }>()
  const completedIds = completedConsiderations.map(c => c.id)
  if (completedIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id, consideration_id')
      .in('consideration_id', completedIds)
    for (const r of (cs || []) as { script_submission_id: string; consideration_id: string }[]) {
      reviewedScriptIds.add(r.script_submission_id)
      // Find the index (chronological) of this consideration
      const idx = allConsiderations.findIndex(c => c.id === r.consideration_id)
      reviewedScriptConsideration.set(r.script_submission_id, { id: r.consideration_id, index: idx + 1 })
    }
  }

  // Fetch open opportunities for matching
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres')
    .eq('status', 'active')
  const opportunities = (openOpps || []) as { id: string; title: string; slug: string; formats: string[] | null; genres: string[] | null }[]

  function matchOpportunities(format: string | null, genre: string | null) {
    if (!format && !genre) return []
    return opportunities.filter(opp => {
      const fmtMatch = !opp.formats || opp.formats.length === 0 || (format && opp.formats.includes(format))
      const genreMatch = !opp.genres || opp.genres.length === 0 || (genre && opp.genres.includes(genre))
      return fmtMatch && genreMatch
    }).map(opp => ({ title: opp.title, slug: opp.slug }))
  }

  // Paywall: first completed script is free
  const allCompleted = allScripts
    .filter(s => s.status === 'completed' && !s.hidden_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstCompletedId = allCompleted[0]?.id ?? null

  // Build script rows for client component (ScriptRowData-compatible)
  const scriptRows = allScripts.map(s => {
    const ev = evalBySub.get(s.id)
    const stillProcessing = s.status === 'processing' || s.status === 'queued'
    const isFirstCompleted = s.id === firstCompletedId
    const isLocked = isTrial && !stillProcessing && s.status === 'completed' && !isFirstCompleted

    // Determine review status
    let status: 'ready' | 'in-review' | 'reviewed' | undefined = undefined
    let reviewId: string | null = null
    let reviewLabel: string | null = null
    if (activeScriptIds.has(s.id)) {
      status = 'in-review'
      reviewId = activeConsideration?.id ?? null
      reviewLabel = 'In review'
    } else if (reviewedScriptIds.has(s.id)) {
      status = 'reviewed'
      const rc = reviewedScriptConsideration.get(s.id)
      reviewId = rc?.id ?? null
      reviewLabel = rc ? `Portfolio review #${rc.index}` : 'Reviewed'
    } else if (s.status === 'completed' && !s.hidden_at) {
      status = 'ready'
    }

    return {
      id: s.id,
      title: s.title,
      format: s.declared_format,
      genre: ev?.genre ?? null,
      score: ev?.score ?? null,
      evaluationId: ev?.id ?? null,
      createdAt: s.created_at,
      isProcessing: stillProcessing,
      isLocked,
      status,
      reviewId,
      reviewLabel,
      matchingOpportunities: matchOpportunities(s.declared_format, ev?.genre ?? null),
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
            Scripts
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
      <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3.5 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold text-purple-900 m-0">Ready for consideration</p>
          <p className="text-[12px] text-purple-600 m-0 mt-0.5">Get feedback on your strengths and next steps.</p>
        </div>
        <NewReviewButton className="shrink-0 text-[12px] font-bold text-white px-3.5 py-1.5 rounded-lg transition-colors">
          Request consideration
        </NewReviewButton>
      </div>

      {/* Script list (client component) */}
      <ScriptsList scripts={scriptRows} isPro={isPro} />
    </div>
  )
}
