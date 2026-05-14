// /scripts — "My Scripts" — full list with sort, bulk hide, three-dot menu.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { ScriptsList } from '@/components/dashboard/scripts-list'
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

  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
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
  const evalBySub = new Map<string, { id: string; score: number | null; genres: string[] }>()
  if (submissionIds.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (evs || []) as any[]) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      // Collect ALL genres: primary + secondary + legacy genre_tags
      function normGenre(g: string | null | undefined): string {
        return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
      }
      const genres: string[] = []
      for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
        const n = normGenre(raw)
        if (n && !genres.includes(n)) genres.push(n)
      }
      evalBySub.set(e.submission_id, { id: e.id, score: e.weighted_score, genres })
    }
  }

  // Fetch open opportunities for matching
  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres')
    .eq('status', 'active')
  const opportunities = (openOpps || []) as { id: string; title: string; slug: string; formats: string[] | null; genres: string[] | null }[]

  function normGenreOuter(g: string | null | undefined): string {
    return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  function matchOpportunities(format: string | null, scriptGenres: string[]) {
    if (!format && scriptGenres.length === 0) return []
    return opportunities.filter(opp => {
      const fmtMatch = !opp.formats || opp.formats.length === 0 || (format && opp.formats.includes(format))
      if (!fmtMatch) return false
      if (!opp.genres || opp.genres.length === 0) return true
      if (scriptGenres.length === 0) return false
      const oppNorm = opp.genres.map(normGenreOuter)
      return scriptGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
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

    return {
      id: s.id,
      title: s.title,
      format: s.declared_format,
      genre: ev?.genres[0] ?? null,
      score: ev?.score ?? null,
      evaluationId: ev?.id ?? null,
      createdAt: s.created_at,
      isProcessing: stillProcessing,
      isLocked,
      matchingOpportunities: matchOpportunities(s.declared_format, ev?.genres ?? []),
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

      {/* Script list (client component) */}
      <ScriptsList scripts={scriptRows} isPro={isPro} />
    </div>
  )
}
