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
import { NewScriptButton } from '@/components/dashboard/new-script-button'
import { ScriptCardActions } from '@/components/dashboard/script-card-actions'
// StickyNewScript removed — collided with Intercom
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
    heat_score: number | null; poster_url: string | null
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
      .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score, poster_url')
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
          .select('id, title, status, declared_format, created_at, hidden_at, is_public, heat_score, poster_url')
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
        posterUrl: s.poster_url ?? null,
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

  // Find the top-scoring script for linking
  const topScoringScript = completedScripts.reduce<{ score: number; evaluationId: string | null } | null>((best, s) => {
    const score = s.score ?? 0
    if (!best || score > best.score) return { score, evaluationId: s.evaluationId }
    return best
  }, null)

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

  const cardShadow = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'

  // Uniform placeholder gradient for scripts without posters
  const placeholderGradient = 'linear-gradient(135deg, #7c3aed, #6d28d9)'

  // Build tabs — 2 tabs for writers, 3 for producers
  const tabs: TabDef[] = [
    { id: 'scripts', label: 'Scripts', count: scriptCount },
    { id: 'applications', label: 'Applications', count: pendingCount },
  ]
  if (accountType === 'producer') {
    tabs.push({ id: 'manage', label: 'Manage', count: partnerPendingTotal })
  }

  // ── TAB PANELS ──

  // Compute stats for the prominent stats section
  const avgScore = completedScripts.length > 0
    ? Math.round(completedScripts.reduce((sum, s) => sum + (s.score ?? 0), 0) / completedScripts.filter(s => s.score).length) || 0
    : 0
  const topScore = completedScripts.length > 0
    ? Math.round(Math.max(...completedScripts.map(s => s.score ?? 0)))
    : 0
  const totalOpps = completedScripts.reduce((sum, s) => sum + s.qualifyingOpps.length, 0)

  // Scripts panel — poster-first visual cards with light card backgrounds
  const scriptsPanel = (
    <div>
      {completedScripts.length === 0 && processingScripts.length === 0 ? (
        <div className="rounded-2xl px-8 py-16 text-center" style={{ background: '#ffffff', boxShadow: cardShadow }}>
          <div className="w-16 h-20 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: '#f3f0ff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2v6h6M12 18v-6M9 15h6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-gray-900 m-0 mb-1">No scripts yet</p>
          <p className="text-[13px] text-gray-500 m-0 mb-4">Upload your first screenplay to get a full evaluation.</p>
          <NewScriptButton />
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Processing scripts */}
          {processingScripts.map(script => (
            <div key={script.id} className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', boxShadow: cardShadow }}>
              <div className="aspect-[3/4] w-full flex items-center justify-center" style={{ background: placeholderGradient }}>
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[12px] font-medium text-white/70 m-0">Evaluating...</p>
                </div>
              </div>
              <div className="px-4 py-3">
                <h3 className="text-[14px] font-semibold text-gray-900 m-0 truncate">{script.title}</h3>
                <p className="text-[12px] text-gray-400 m-0 mt-0.5">{script.format || 'Script'}</p>
              </div>
            </div>
          ))}

          {/* Completed scripts — poster-first cards (limited to 6) */}
          {completedScripts.slice(0, 6).map(script => {
            const rounded = script.score ? Math.round(script.score) : null
            const reportHref = script.evaluationId ? `/report/${script.evaluationId}` : '/scripts'

            return (
              <div key={script.id} className="rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-200" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                {/* Poster image area — no score overlay */}
                <Link href={reportHref} className="block no-underline">
                  <div className="aspect-[3/4] w-full relative overflow-hidden">
                    {script.posterUrl ? (
                      <img
                        src={script.posterUrl}
                        alt={script.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: placeholderGradient }}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                          <path d="M6 3h12l4 7-10 12L2 10l4-7z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinejoin="round"/>
                        </svg>
                        <p className="text-[11px] text-white/50 m-0 mt-2">Add a poster</p>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Card info — light background */}
                <div className="px-4 py-3">
                  <Link href={reportHref} className="block no-underline">
                    <h3 className="text-[14px] font-semibold text-gray-900 m-0 line-clamp-2 group-hover:text-purple-700 transition-colors">
                      {script.title}
                    </h3>
                    <p className="text-[12px] text-gray-400 m-0 mt-0.5">
                      {[script.format, script.genres[0]?.replace(/^\w/, (c: string) => c.toUpperCase()), fmtDate(script.createdAt)].filter(Boolean).join(' · ')}
                    </p>
                  </Link>

                  {/* Score + Heat — prominent */}
                  <div className="flex items-center gap-4 mt-2.5">
                    <span className="text-[18px] font-bold" style={{ color: '#7c3aed' }}>
                      💎 {rounded || '—'}
                    </span>
                    <span className="text-[14px] font-semibold" style={{ color: script.heat > 0 ? '#ea580c' : '#9ca3af' }}>
                      🔥 {script.heat}
                    </span>
                  </div>

                  {/* Bottom row: actions + view report */}
                  <div className="flex items-center justify-between mt-2.5 pt-2.5" style={{ borderTop: '1px solid #f0f0f0' }}>
                    <ScriptCardActions>
                      <PendingActionsDropdown
                        scriptId={script.id}
                        isPublic={script.isPublic}
                        isPro={isPro}
                        isAnon={!user}
                        qualifyingOppsCount={script.qualifyingOpps.length}
                      />
                      <DeleteScriptButton scriptId={script.id} title={script.title} />
                    </ScriptCardActions>
                    <Link href={reportHref} className="text-[12px] font-semibold text-purple-600 hover:text-purple-700 transition-colors no-underline">
                      View report →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {completedScripts.length > 6 && (
          <div className="mt-6 text-center">
            <Link
              href="/scripts"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white no-underline transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              View all {completedScripts.length} scripts →
            </Link>
          </div>
        )}
        </>
      )}
    </div>
  )

  // Applications panel — pending + reviewed, with opportunity browse link
  const applicationsPanel = (
    <div className="space-y-5">
      {/* Pending applications */}
      {pendingApps.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-white/60 m-0 mb-2 uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>Pending</h3>
          <div className="space-y-2">
            {pendingApps.map(app => {
              const opp = oppMap.get(app.opportunity_id)
              return (
                <Link key={app.id} href={`/review/applications/${app.id}`} className="block no-underline">
                  <div className="rounded-xl px-4 py-3.5 flex items-center justify-between hover:shadow-md transition-all" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{opp?.title || 'Opportunity'}</p>
                      <p className="text-[12px] text-gray-400 m-0 mt-0.5">Applied {fmtDate(app.submitted_at)}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#f3f0ff', color: '#7c3aed' }}>Pending</span>
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
          <h3 className="text-[13px] font-semibold text-white/60 m-0 mb-2 uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>Reviewed</h3>
          <div className="space-y-2">
            {reviewedApps.map(app => {
              const opp = oppMap.get(app.opportunity_id)
              return (
                <Link key={app.id} href={`/review/applications/${app.id}`} className="block no-underline">
                  <div className="rounded-xl px-4 py-3.5 flex items-center justify-between hover:shadow-md transition-all" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{opp?.title || 'Opportunity'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-gray-400">{fmtDate(app.reviewed_at || app.submitted_at)}</span>
                        {app.heat_earned > 0 && (
                          <span className="text-[11px] font-bold" style={{ color: '#ea580c' }}>+{app.heat_earned} 🔥</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#ecfdf5', color: '#059669' }}>Reviewed</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allApplications.length === 0 && (
        <div className="rounded-xl px-6 py-10 text-center" style={{ background: '#ffffff', boxShadow: cardShadow }}>
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No applications yet</p>
          <p className="text-[13px] text-gray-500 m-0 mb-3">Browse open opportunities and apply with your scripts.</p>
          <Link href="/opportunities" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[13px] font-semibold text-white no-underline" style={{ background: '#7c3aed' }}>
            Browse opportunities →
          </Link>
        </div>
      )}

      {/* Browse link when there are apps */}
      {allApplications.length > 0 && (
        <div className="pt-1">
          <Link href="/opportunities" className="text-[13px] font-medium text-purple-300 hover:text-purple-200 transition-colors">
            Browse open opportunities →
          </Link>
        </div>
      )}
    </div>
  )

  // Manage panel (producers only)
  const managePanel = accountType === 'producer' ? (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] text-white/50 m-0">
          {partnerPendingTotal > 0 ? `${partnerPendingTotal} pending review` : 'All caught up'}
          {' · '}{partnerApps.length} total
        </p>
        <Link href="/partner/opportunities/create" className="text-[12px] font-semibold text-purple-300 hover:text-purple-200">
          + Create opportunity
        </Link>
      </div>

      {partnerApps.length === 0 ? (
        <div className="rounded-xl px-6 py-8 text-center" style={{ background: '#ffffff', boxShadow: cardShadow }}>
          <p className="text-[13px] text-gray-500 m-0">No applications yet. Create an opportunity to start receiving applications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {partnerApps.map(app => {
            const writer = partnerWriterMap.get(app.writer_id)
            const opp = partnerOppMap.get(app.opportunity_id)
            const scripts = partnerScriptsByApp.get(app.id) || []
            const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
            const stageMap: Record<string, { label: string; style: { background: string; color: string } }> = {
              pending: { label: 'New', style: { background: '#fef9c3', color: '#a16207' } },
              in_consideration: { label: 'In consideration', style: { background: '#f3f0ff', color: '#7c3aed' } },
              shortlisted: { label: 'Shortlisted', style: { background: '#dbeafe', color: '#2563eb' } },
              partner_match: { label: 'Partner match', style: { background: '#ecfdf5', color: '#059669' } },
              complete: { label: 'Reviewed', style: { background: '#f3f4f6', color: '#6b7280' } },
            }
            const stage = isReviewed ? 'complete' : (app.review_stage || 'pending')
            const s = stageMap[stage] || stageMap.pending

            return (
              <Link key={app.id} href={`/partner/applications/${app.id}`} className="block no-underline">
                <div className="rounded-xl px-4 py-3.5 hover:shadow-md transition-all" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
                          {writer?.full_name || writer?.email || 'Unknown writer'}
                        </p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={s.style}>
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-gray-400">{opp?.title || ''}</span>
                        {scripts.length > 0 && (
                          <>
                            <span className="text-[11px] text-gray-300">·</span>
                            <span className="text-[12px] text-gray-400">{scripts[0].title}</span>
                            {scripts[0].score && <span className="text-[11px] font-semibold text-gray-400">({Math.round(scripts[0].score)})</span>}
                          </>
                        )}
                        <span className="text-[11px] text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{fmtDate(app.submitted_at)}</span>
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
    </div>
  ) : null

  const panels: Record<string, React.ReactNode> = {
    scripts: scriptsPanel,
    applications: applicationsPanel,
  }
  if (managePanel) panels.manage = managePanel

  return (
    <div style={{ position: 'relative' }}>
      {/* Full-bleed dark background — absolutely positioned to paint over layout gray */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-6rem',
          bottom: '-6rem',
          left: '50%',
          width: '100vw',
          transform: 'translateX(-50%)',
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #110f1d 0%, #171428 60%, #1d1932 100%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {user && submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      <ProcessingPoller active={isProcessing} />
      {!user && isProcessing && <AnonSignupPrompt />}

      <div className="space-y-8">

        {/* ── STATS CARDS ── */}
        {(scriptCount > 0 || (user && totalHeat > 0)) && (
          <div className="grid grid-cols-3 gap-4">
            <Link href="/scripts" className="no-underline block">
              <div className="rounded-xl px-5 py-5 text-center hover:shadow-md transition-all" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                <p className="text-[11px] font-semibold text-gray-400 m-0 uppercase tracking-wider">📄 Scripts</p>
                <p className="text-[36px] font-bold text-gray-900 m-0 mt-2 leading-none">{scriptCount}</p>
              </div>
            </Link>
            <Link href={topScoringScript?.evaluationId ? `/report/${topScoringScript.evaluationId}` : '/scripts'} className="no-underline block">
              <div className="rounded-xl px-5 py-5 text-center hover:shadow-md transition-all" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                <p className="text-[11px] font-semibold text-gray-400 m-0 uppercase tracking-wider">💎 Top Score</p>
                <p className="text-[36px] font-bold m-0 mt-2 leading-none" style={{ color: topScore >= 80 ? '#059669' : topScore >= 70 ? '#7c3aed' : topScore >= 60 ? '#d97706' : '#d1d5db' }}>
                  {topScore > 0 ? topScore : '—'}
                </p>
              </div>
            </Link>
            <Link href="/applications" className="no-underline block">
              <div className="rounded-xl px-5 py-5 text-center hover:shadow-md transition-all" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                <p className="text-[11px] font-semibold text-gray-400 m-0 uppercase tracking-wider">🔥 Industry Heat</p>
                <p className="text-[36px] font-bold m-0 mt-2 leading-none" style={{ color: totalHeat > 0 ? '#ea580c' : '#d1d5db' }}>
                  {totalHeat > 0 ? totalHeat : '—'}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Zero-state stats */}
        {scriptCount === 0 && !(user && totalHeat > 0) && (
          <div className="grid grid-cols-3 gap-4">
            {[{ label: '📄 Scripts' }, { label: '💎 Top Score' }, { label: '🔥 Industry Heat' }].map(({ label }) => (
              <div key={label} className="rounded-xl px-5 py-5 text-center" style={{ background: '#ffffff', boxShadow: cardShadow }}>
                <p className="text-[11px] font-semibold text-gray-400 m-0 uppercase tracking-wider">{label}</p>
                <p className="text-[36px] font-bold text-gray-200 m-0 mt-2 leading-none">—</p>
              </div>
            ))}
          </div>
        )}

        {/* ── TABBED CONTENT ── */}
        <DashboardTabs tabs={tabs} panels={panels} />

      </div>
    </div>
    </div>
  )
}
