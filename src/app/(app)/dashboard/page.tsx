// /dashboard — unified dashboard for writers and producers.
//
// Layout: top row (profile + CTA) → stat cards → tabbed content.
// Writers get Scripts + Applications tabs.
// Producers get a third "Manage" tab showing applications to their opportunities.

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { AnonSignupPrompt } from '@/components/dashboard/anon-signup-prompt'
import { FormatSelectorHero } from '@/components/dashboard/format-selector-hero'
import { OpportunityCard, type OppStatus } from '@/components/opportunities/opportunity-card'
import { DeleteScriptButton } from '@/components/dashboard/delete-script-button'
import { PendingActionsDropdown } from '@/components/dashboard/pending-actions-dropdown'
import { DashboardTabs, type TabDef } from '@/components/dashboard/dashboard-tabs'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = svc()

  // ── DATA QUERIES ──

  type ProfileRow = { subscription_status: string | null; full_name: string | null; handle: string | null; avatar_url: string | null; heat_score: number | null; headline: string | null; account_type: string | null }
  let profile: ProfileRow | null = null
  let isPro = false
  let accountType = 'writer'

  type MySubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; is_public: boolean | null
    heat_score: number | null
  }
  let visible: MySubRow[] = []
  let submissionIds: string[] = []

  function normGenre(g: string | null | undefined): string {
    return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  type FeedEval = { id: string; weighted_score: number | null; genres: string[]; format: string | null; logline: string | null }
  const myEvalBySub = new Map<string, FeedEval>()

  type OppRow = {
    id: string; title: string; slug: string
    formats: string[] | null; genres: string[] | null; min_score: number | null
    subtitle: string | null; description: string | null
    deadline: string | null; budget_tiers: string[] | null
    created_at: string
  }
  let allOpenOpps: OppRow[] = []

  type AppRow = {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null; writer_response: string | null
    heat_earned: number
  }
  let allApplications: AppRow[] = []

  const { data: openOpps } = await service
    .from('opportunities')
    .select('id, title, slug, formats, genres, min_score, subtitle, description, deadline, budget_tiers, created_at')
    .eq('status', 'active')
  allOpenOpps = (openOpps || []) as OppRow[]

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('subscription_status, full_name, handle, avatar_url, heat_score, headline, account_type')
      .eq('id', user.id)
      .single()
    profile = p as ProfileRow | null
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
    accountType = profile?.account_type ?? 'writer'

    const { data: mySubs } = await supabase
      .from('script_submissions')
      .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    visible = ((mySubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
    submissionIds = visible.map((s) => s.id)

    if (submissionIds.length > 0) {
      const { data: myEvs } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score, evaluation')
        .in('submission_id', submissionIds)
      for (const e of (myEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
        const evJson = e.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
        const genreSet = new Set<string>()
        for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
          const n = normGenre(raw)
          if (n) genreSet.add(n)
        }
        const format = (cls.format as string) || (fmt.format as string) || null
        const logline = (evJson?.positioning_hook as string) || (cls.logline as string) || null
        myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: Array.from(genreSet), format, logline })
      }
    }

    const { data: applications } = await service
      .from('considerations')
      .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, writer_response, heat_earned')
      .eq('writer_id', user.id)
      .not('opportunity_id', 'is', null)
      .order('submitted_at', { ascending: false })
    allApplications = (applications || []) as AppRow[]
  }

  // ── ANONYMOUS USER: read script IDs from cookie ──
  if (!user) {
    const cookieStore = await cookies()
    const anonCookie = cookieStore.get('gem_anon_scripts')?.value
    if (anonCookie) {
      const anonIds = anonCookie.split(',').filter(Boolean)
      if (anonIds.length > 0) {
        const { data: anonSubs } = await service
          .from('script_submissions')
          .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score')
          .in('id', anonIds)
          .order('created_at', { ascending: false })
        visible = ((anonSubs as MySubRow[] | null) || []).filter((s) => !s.hidden_at)
        submissionIds = visible.map((s) => s.id)

        if (submissionIds.length > 0) {
          const { data: anonEvs } = await service
            .from('script_evaluations')
            .select('id, submission_id, weighted_score, evaluation')
            .in('submission_id', submissionIds)
          for (const e of (anonEvs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
            const evJson = e.evaluation as Record<string, unknown> | null
            const cls = (evJson?.classification as Record<string, unknown>) || {}
            const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
            const genreSet = new Set<string>()
            for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
              const n = normGenre(raw)
              if (n) genreSet.add(n)
            }
            const format = (cls.format as string) || (fmt.format as string) || null
            const logline = (evJson?.positioning_hook as string) || (cls.logline as string) || null
            myEvalBySub.set(e.submission_id, { id: e.id, weighted_score: e.weighted_score, genres: Array.from(genreSet), format, logline })
          }
        }
      }
    }
  }

  // Per-opp applied script tracking
  const appliedScriptsByOpp = new Map<string, Set<string>>()
  const pendingOppIds = new Set<string>()

  if (user && allApplications.length > 0) {
    const considerationIds = allApplications.map(a => a.id)
    const { data: csRows } = await service
      .from('consideration_scripts')
      .select('script_id, consideration_id')
      .in('consideration_id', considerationIds)

    const considerationToOpp = new Map(allApplications.map(a => [a.id, a.opportunity_id]))
    for (const row of (csRows || []) as { script_id: string; consideration_id: string }[]) {
      const oppId = considerationToOpp.get(row.consideration_id)
      if (!oppId) continue
      if (!appliedScriptsByOpp.has(oppId)) appliedScriptsByOpp.set(oppId, new Set())
      appliedScriptsByOpp.get(oppId)!.add(row.script_id)
    }

    for (const app of allApplications) {
      if (app.status !== 'reviewed' && app.review_stage !== 'complete') {
        pendingOppIds.add(app.opportunity_id)
      }
    }
  }

  // Usage gate
  const FREE_EVAL_LIMIT = 2
  const FREE_APP_LIMIT = 2
  let totalSubmissions = 0
  let totalApps = 0
  if (user && !isPro) {
    const { count: subCount } = await service
      .from('script_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    totalSubmissions = subCount ?? 0
    totalApps = allApplications.length
  } else if (!user) {
    totalSubmissions = visible.length
  }
  const evalsRemaining = Math.max(0, FREE_EVAL_LIMIT - totalSubmissions)
  const appsRemaining = Math.max(0, FREE_APP_LIMIT - totalApps)

  // ── DERIVED DATA ──

  const appliedOppIds = new Set(allApplications.map(a => a.opportunity_id))
  const oppAppCount = new Map<string, number>()
  for (const a of allApplications) {
    oppAppCount.set(a.opportunity_id, (oppAppCount.get(a.opportunity_id) || 0) + 1)
  }
  const oppMap = new Map(allOpenOpps.map(o => [o.id, o]))

  function getQualifyingOpps(format: string | null, scriptGenres: string[], score: number | null) {
    return allOpenOpps.filter(o => {
      if (o.min_score && (!score || score < o.min_score)) return false
      const noFormatFilter = !o.formats || o.formats.length === 0
      const noGenreFilter = !o.genres || o.genres.length === 0
      if (noFormatFilter && noGenreFilter) return true
      const fmtMatch = noFormatFilter || (format && o.formats!.some(f => f.toLowerCase() === format.toLowerCase()))
      if (!fmtMatch) return false
      if (noGenreFilter) return true
      if (scriptGenres.length === 0) return false
      const oppNorm = o.genres!.map(normGenre)
      return scriptGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
    })
  }

  const completedScripts = visible
    .filter(s => s.status === 'completed')
    .map(s => {
      const ev = myEvalBySub.get(s.id)
      const qualifyingOpps = getQualifyingOpps(ev?.format || s.declared_format, ev?.genres || [], ev?.weighted_score || null)
        .filter(o => !appliedOppIds.has(o.id))
      return {
        id: s.id,
        title: s.title,
        format: ev?.format || s.declared_format,
        genres: ev?.genres || [],
        score: ev?.weighted_score ?? null,
        evaluationId: ev?.id ?? null,
        createdAt: s.created_at,
        heat: s.heat_score ?? 0,
        qualifyingOpps: qualifyingOpps.map(o => ({ id: o.id, title: o.title, slug: o.slug, subtitle: o.subtitle })),
        isPublic: s.is_public ?? false,
        logline: ev?.logline ?? null,
      }
    })

  const processingScripts = visible
    .filter(s => s.status === 'processing' || s.status === 'queued')
    .map(s => ({ id: s.id, title: s.title, format: s.declared_format, createdAt: s.created_at }))

  const isProcessing = processingScripts.length > 0

  const reviewedApps = allApplications.filter(a => a.status === 'reviewed' || a.review_stage === 'complete')
  const pendingApps = allApplications.filter(a => a.status !== 'reviewed' && a.review_stage !== 'complete')

  const totalHeat = (profile as any)?.heat_score ?? 0
  const scriptCount = completedScripts.length + processingScripts.length
  const pendingCount = pendingApps.length

  function scoreBadge(s: number): { bg: string } {
    if (s >= 80) return { bg: '#059669' }
    if (s >= 60) return { bg: '#7c3aed' }
    if (s >= 40) return { bg: '#d97706' }
    return { bg: '#9ca3af' }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Opportunity qualification helpers
  function anyScriptQualifies(opp: OppRow) {
    return completedScripts.some(s => {
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score ?? null
      if (opp.min_score && (!score || score < opp.min_score)) return false
      const noFmt = !opp.formats || opp.formats.length === 0
      const noGenre = !opp.genres || opp.genres.length === 0
      if (noFmt && noGenre) return true
      const fmtMatch = noFmt || (s.format && opp.formats!.some(f => f.toLowerCase() === s.format!.toLowerCase()))
      if (!fmtMatch) return false
      if (noGenre) return true
      const sGenres = ev?.genres || []
      if (sGenres.length === 0) return false
      const oppNorm = opp.genres!.map(normGenre)
      return sGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
    })
  }

  const unappliedOpps = allOpenOpps.filter(o => !pendingOppIds.has(o.id))
  const qualifiedOpps = unappliedOpps.filter(o => anyScriptQualifies(o))
  const unqualifiedOpps = unappliedOpps.filter(o => !anyScriptQualifies(o))

  const sortByDeadline = (a: OppRow, b: OppRow) => {
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  }
  qualifiedOpps.sort(sortByDeadline)
  unqualifiedOpps.sort(sortByDeadline)

  const combinedOpps = [...qualifiedOpps, ...unqualifiedOpps]
  if (combinedOpps.length < 3) {
    const shown = new Set(combinedOpps.map(o => o.id))
    const filler = unappliedOpps
      .filter(o => !shown.has(o.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    for (const o of filler) {
      if (combinedOpps.length >= 3) break
      combinedOpps.push(o)
    }
  }
  const dashboardOpps = combinedOpps.slice(0, 3)
  const qualifiedOppIds = new Set(qualifiedOpps.map(o => o.id))

  function getMatchingScriptsForOpp(opp: OppRow) {
    const alreadyAppliedScripts = appliedScriptsByOpp.get(opp.id) || new Set<string>()
    return completedScripts.filter(s => {
      if (alreadyAppliedScripts.has(s.id)) return false
      const ev = myEvalBySub.get(s.id)
      const score = ev?.weighted_score ?? null
      if (opp.min_score && (!score || score < opp.min_score)) return false
      const noFmt = !opp.formats || opp.formats.length === 0
      const noGenre = !opp.genres || opp.genres.length === 0
      if (noFmt && noGenre) return true
      const fmtMatch = noFmt || (s.format && opp.formats!.some(f => f.toLowerCase() === s.format!.toLowerCase()))
      if (!fmtMatch) return false
      if (noGenre) return true
      const sGenres = ev?.genres || []
      if (sGenres.length === 0) return false
      const oppNorm = opp.genres!.map(normGenre)
      return sGenres.some(sg => oppNorm.some(og => sg.includes(og) || og.includes(sg)))
    }).map(s => ({ id: s.id, title: s.title, score: s.score ? Math.round(s.score) : null }))
  }

  // ── PRODUCER DATA (for Manage tab) ──

  type PartnerApp = {
    id: string; status: string; review_stage: string; submitted_at: string
    opportunity_id: string; writer_id: string; writer_pitch: string | null; heat_earned: number
  }
  let partnerOpps: { id: string; title: string; slug: string | null; status: string }[] = []
  let partnerApps: PartnerApp[] = []
  const partnerWriterMap = new Map<string, { full_name: string | null; email: string | null }>()
  const partnerScriptsByApp = new Map<string, { title: string; score: number | null }[]>()

  if (user && accountType === 'producer') {
    const { data: opps } = await service
      .from('opportunities')
      .select('id, title, slug, status')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    partnerOpps = (opps || []) as typeof partnerOpps
    const oppIds = partnerOpps.map(o => o.id)

    if (oppIds.length > 0) {
      const { data: rawApps } = await service
        .from('considerations')
        .select('id, status, review_stage, submitted_at, opportunity_id, writer_id, writer_pitch, heat_earned')
        .in('opportunity_id', oppIds)
        .order('submitted_at', { ascending: false })
        .limit(10)
      partnerApps = (rawApps || []) as PartnerApp[]

      // Load writer profiles
      const writerIds = [...new Set(partnerApps.map(a => a.writer_id))]
      if (writerIds.length > 0) {
        const { data: writers } = await service
          .from('profiles')
          .select('id, full_name, email')
          .in('id', writerIds)
        for (const w of (writers || []) as { id: string; full_name: string | null; email: string | null }[]) {
          partnerWriterMap.set(w.id, { full_name: w.full_name, email: w.email })
        }
      }

      // Load scripts
      const pAppIds = partnerApps.map(a => a.id)
      if (pAppIds.length > 0) {
        const { data: cs } = await service
          .from('consideration_scripts')
          .select('consideration_id, script_submission_id')
          .in('consideration_id', pAppIds)
        const scriptIds = (cs || []).map((c: any) => c.script_submission_id)
        const evalMap = new Map<string, number | null>()
        const titleMap = new Map<string, string>()
        if (scriptIds.length > 0) {
          const { data: subs } = await service.from('script_submissions').select('id, title').in('id', scriptIds)
          for (const s of (subs || []) as { id: string; title: string }[]) titleMap.set(s.id, s.title)
          const { data: evals } = await service.from('script_evaluations').select('submission_id, weighted_score').in('submission_id', scriptIds)
          for (const e of (evals || []) as { submission_id: string; weighted_score: number | null }[]) evalMap.set(e.submission_id, e.weighted_score)
        }
        for (const c of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
          const existing = partnerScriptsByApp.get(c.consideration_id) || []
          existing.push({ title: titleMap.get(c.script_submission_id) || 'Untitled', score: evalMap.get(c.script_submission_id) ?? null })
          partnerScriptsByApp.set(c.consideration_id, existing)
        }
      }
    }
  }

  const partnerPendingTotal = partnerApps.filter(a => a.review_stage !== 'complete').length
  const partnerOppMap = new Map(partnerOpps.map(o => [o.id, o]))

  // ── RENDER ──

  const cardShadow = '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)'

  // Build tabs
  const tabs: TabDef[] = [
    { id: 'scripts', label: 'Scripts', count: scriptCount },
    { id: 'applications', label: 'Applications', count: pendingCount },
  ]
  if (accountType === 'producer') {
    tabs.push({ id: 'manage', label: 'Manage', count: partnerPendingTotal })
  }

  // ── TAB PANELS ──

  // Scripts panel
  const scriptsPanel = (
    <div className="space-y-3">
      {completedScripts.length === 0 && processingScripts.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ boxShadow: cardShadow }}>
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No scripts yet</p>
          <p className="text-[13px] text-gray-600 m-0">Upload a screenplay to get started.</p>
        </div>
      ) : (
        <>
          {/* Processing */}
          {processingScripts.slice(0, 5).map(script => (
            <div key={script.id} className="rounded-xl bg-white p-4 flex items-center justify-between" style={{ boxShadow: cardShadow }}>
              <div>
                <span className="text-[14px] font-semibold text-gray-900">{script.title}</span>
                <p className="text-[12px] text-gray-600 m-0 mt-0.5">Evaluating your script...</p>
              </div>
              <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#e9d5ff" strokeWidth="2.5" />
                <path d="M12 2a10 10 0 019.95 9" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          ))}

          {/* Completed scripts */}
          {completedScripts.slice(0, 5 - processingScripts.length).map(script => {
            const rounded = script.score ? Math.round(script.score) : null
            const reportHref = script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'

            return (
              <div key={script.id} className="rounded-xl bg-white group hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
                <div className="p-4 flex items-center gap-4">
                  {/* Left: title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-gray-900 m-0 truncate group-hover:text-purple-700 transition-colors">
                        {script.title}
                      </h3>
                      <DeleteScriptButton scriptId={script.id} title={script.title} />
                    </div>
                    <p className="text-[12px] text-gray-600 m-0 mt-0.5">
                      {[script.format, script.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase())].filter(Boolean).join(' / ')}
                    </p>
                  </div>

                  {/* Center: pills */}
                  <div className="flex items-center gap-2 shrink-0">
                    {rounded && (
                      <span className="text-[12px] font-bold text-white px-2 py-0.5 rounded" style={{ background: scoreBadge(rounded).bg }}>
                        {rounded}
                      </span>
                    )}
                    {script.heat > 0 && (
                      <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: '#FFF3E0', color: '#E65100' }}>
                        🔥 {script.heat}
                      </span>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <PendingActionsDropdown
                      scriptId={script.id}
                      isPublic={script.isPublic}
                      isPro={isPro}
                      isAnon={!user}
                      qualifyingOppsCount={script.qualifyingOpps.length}
                    />
                    <Link
                      href={reportHref}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white no-underline transition-all hover:opacity-90"
                      style={{ background: '#534AB7' }}
                    >
                      View report →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}

          {/* View all */}
          {(completedScripts.length + processingScripts.length) > 5 && (
            <div className="text-center pt-1">
              <Link href="/scripts" className="text-[13px] font-medium text-purple-600 hover:text-purple-800 transition-colors">
                View all scripts →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )

  // Applications panel
  const applicationsPanel = (
    <div className="space-y-5">
      {/* Opportunities for you */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[14px] font-semibold text-gray-900 m-0">Opportunities for you</h3>
          {user && !isPro && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: appsRemaining > 0 ? '#f3f4f6' : '#fef2f2', color: appsRemaining > 0 ? '#6b7280' : '#dc2626' }}>
              {appsRemaining > 0 ? `${appsRemaining} remaining` : 'Limit reached'}
            </span>
          )}
          <Link href="/opportunities" className="text-[12px] font-medium text-purple-600 hover:text-purple-800 transition-colors ml-auto">
            View all →
          </Link>
        </div>

        {dashboardOpps.length === 0 ? (
          <div className="rounded-xl bg-white px-6 py-6 text-center" style={{ boxShadow: cardShadow }}>
            <p className="text-[13px] text-gray-600 m-0">
              {pendingOppIds.size > 0 ? "You've applied to all open opportunities. We'll notify you when new ones open." : 'No opportunities right now. Check back soon.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dashboardOpps.map(opp => {
              const status: OppStatus = pendingOppIds.has(opp.id) ? 'pending' : appliedOppIds.has(opp.id) ? 'previously_applied' : 'available'
              const matchCount = getMatchingScriptsForOpp(opp).length
              return (
                <OpportunityCard
                  key={opp.id}
                  id={opp.id}
                  slug={opp.slug}
                  title={opp.title}
                  subtitle={opp.subtitle}
                  description={opp.description}
                  genres={opp.genres || []}
                  formats={opp.formats || []}
                  createdAt={opp.created_at}
                  deadline={opp.deadline}
                  status={status}
                  matchingScriptCount={matchCount}
                  isAnon={!user}
                  applicationCount={oppAppCount.get(opp.id) ?? 0}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Pending applications */}
      {pendingApps.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900 m-0 mb-2">Pending</h3>
          <div className="space-y-2">
            {pendingApps.slice(0, 5).map(app => {
              const opp = oppMap.get(app.opportunity_id)
              return (
                <Link key={app.id} href={`/review/applications/${app.id}`} className="block">
                  <div className="rounded-xl bg-white px-4 py-3 flex items-center justify-between hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
                    <div>
                      <p className="text-[14px] font-semibold text-gray-900 m-0">{opp?.title || 'Opportunity'}</p>
                      <p className="text-[12px] text-gray-600 m-0 mt-0.5">Applied {fmtDate(app.submitted_at)}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 shrink-0">Pending</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Reviewed applications */}
      {reviewedApps.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900 m-0 mb-2">Recent reviews</h3>
          <div className="space-y-2">
            {reviewedApps.slice(0, 3).map(app => {
              const opp = oppMap.get(app.opportunity_id)
              return (
                <Link key={app.id} href={`/review/applications/${app.id}`} className="block">
                  <div className="rounded-xl bg-white px-4 py-3 flex items-center justify-between hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
                    <div>
                      <p className="text-[14px] font-semibold text-gray-900 m-0">{opp?.title || 'Opportunity'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-gray-600">{fmtDate(app.reviewed_at || app.submitted_at)}</span>
                        {app.heat_earned > 0 && (
                          <span className="text-[11px] font-bold" style={{ color: '#ea580c' }}>+{app.heat_earned} 🔥</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 shrink-0">Reviewed</span>
                  </div>
                </Link>
              )
            })}
          </div>
          {reviewedApps.length > 3 && (
            <div className="text-center pt-2">
              <Link href="/review" className="text-[12px] font-medium text-purple-600 hover:text-purple-800">
                View all reviews →
              </Link>
            </div>
          )}
        </div>
      )}

      {allApplications.length === 0 && dashboardOpps.length === 0 && (
        <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ boxShadow: cardShadow }}>
          <p className="text-[13px] text-gray-600 m-0">No applications yet. Browse opportunities above to get started.</p>
        </div>
      )}
    </div>
  )

  // Manage panel (producers)
  const managePanel = accountType === 'producer' ? (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] text-gray-600 m-0">
          {partnerPendingTotal > 0 ? `${partnerPendingTotal} pending review` : 'All caught up'}
          {' · '}{partnerApps.length} total
        </p>
        <Link href="/partner/opportunities/create" className="text-[12px] font-semibold text-purple-600 hover:text-purple-800">
          + Create opportunity
        </Link>
      </div>

      {partnerApps.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ boxShadow: cardShadow }}>
          <p className="text-[13px] text-gray-600 m-0">No applications yet. Create an opportunity to start receiving applications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {partnerApps.slice(0, 5).map(app => {
            const writer = partnerWriterMap.get(app.writer_id)
            const opp = partnerOppMap.get(app.opportunity_id)
            const scripts = partnerScriptsByApp.get(app.id) || []
            const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
            const stageMap: Record<string, { label: string; classes: string }> = {
              pending: { label: 'New', classes: 'bg-yellow-50 text-yellow-700' },
              in_consideration: { label: 'In consideration', classes: 'bg-purple-50 text-purple-700' },
              shortlisted: { label: 'Shortlisted', classes: 'bg-blue-50 text-blue-700' },
              partner_match: { label: 'Partner match', classes: 'bg-green-50 text-green-700' },
              complete: { label: 'Reviewed', classes: 'bg-gray-100 text-gray-600' },
            }
            const stage = isReviewed ? 'complete' : (app.review_stage || 'pending')
            const s = stageMap[stage] || stageMap.pending

            return (
              <Link key={app.id} href={`/partner/applications/${app.id}`} className="block">
                <div className="rounded-xl bg-white px-4 py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
                          {writer?.full_name || writer?.email || 'Unknown writer'}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${s.classes}`}>
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-gray-600">{opp?.title || ''}</span>
                        {scripts.length > 0 && (
                          <>
                            <span className="text-[11px] text-gray-300">·</span>
                            <span className="text-[12px] text-gray-600">{scripts[0].title}</span>
                            {scripts[0].score && <span className="text-[11px] font-semibold text-gray-600">({Math.round(scripts[0].score)})</span>}
                          </>
                        )}
                        <span className="text-[11px] text-gray-300">·</span>
                        <span className="text-[11px] text-gray-600">{fmtDate(app.submitted_at)}</span>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 shrink-0">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {partnerApps.length > 5 && (
        <div className="text-center pt-1">
          <Link href="/partner" className="text-[13px] font-medium text-purple-600 hover:text-purple-800">
            View all applications →
          </Link>
        </div>
      )}
    </div>
  ) : null

  const panels: Record<string, React.ReactNode> = {
    scripts: scriptsPanel,
    applications: applicationsPanel,
  }
  if (managePanel) panels.manage = managePanel

  return (
    <>
      {user && submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />
      {!user && isProcessing && <AnonSignupPrompt />}

      <div className="space-y-5">

        {/* ── TOP ROW: profile + create script ── */}
        <div className="flex items-center gap-4">
          {/* Profile card */}
          {user && profile ? (
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[14px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  {(profile.full_name || 'W').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-gray-900 m-0">{profile.full_name || 'Writer'}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: isPro ? '#f5f3ff' : '#f9fafb', color: isPro ? '#7c3aed' : '#9ca3af' }}>
                    {isPro ? 'Member' : 'Guest'}
                  </span>
                </div>
                {profile.headline && (
                  <p className="text-[12px] text-gray-600 m-0">{profile.headline}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[15px] font-semibold text-gray-900 m-0">Dashboard</p>
          )}

          <div className="flex-1" />

          {/* Create script CTA — opens the upload modal */}
          <FormatSelectorHero evalsRemaining={isPro ? 99 : evalsRemaining} />
        </div>

        {/* ── STAT CARDS ── */}
        <section className="grid grid-cols-3 gap-3">
          <Link href="/scripts" className="block rounded-xl bg-white px-4 py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px]">📄</span>
              <span className="text-[12px] font-semibold text-gray-600">Scripts</span>
            </div>
            <div className="text-[26px] font-bold text-gray-900 leading-none">{scriptCount}</div>
          </Link>

          <Link href="/review" className="block rounded-xl bg-white px-4 py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px]">💰</span>
              <span className="text-[12px] font-semibold text-gray-600">Applications</span>
            </div>
            <div className="text-[26px] font-bold text-gray-900 leading-none">
              {user ? pendingCount : 0}
              <span className="text-[12px] font-medium text-gray-600 ml-1">pending</span>
            </div>
          </Link>

          <Link href="/review" className="block rounded-xl bg-white px-4 py-3.5 hover:shadow-md transition-shadow" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px]">🔥</span>
              <span className="text-[12px] font-semibold text-gray-600">Heat</span>
            </div>
            <div className="text-[26px] font-bold text-gray-900 leading-none">{user ? totalHeat : 0}</div>
          </Link>
        </section>

        {/* ── TABBED CONTENT ── */}
        <DashboardTabs tabs={tabs} panels={panels} />

      </div>
    </>
  )
}
