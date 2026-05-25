// /partner — producer triage page.
// Full-width dark layout: opportunity dropdown, script-focused list, detail panel with Pass/Meet.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { PartnerTriageClient } from '@/components/partner/partner-triage-client'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export type PartnerScript = {
  submission_id: string
  eval_id: string | null
  title: string
  score: number | null
  heat_score: number | null
  logline: string | null
  poster_url: string | null
  format: string | null
  genre: string | null
  budget_tier: string | null
}

export type PartnerApp = {
  id: string
  status: string
  review_stage: string
  submitted_at: string
  writer_id: string
  writer_pitch: string | null
  application_responses: Record<string, string> | null
  opportunity_id: string
  triage_status: string | null
  triage_feedback_tags: string[] | null
  writer_name: string | null
  writer_email: string | null
  writer_headline: string | null
  writer_avatar_url: string | null
  writer_app_count: number
  writer_script_count: number
  writer_top_score: number | null
  writer_total_heat: number
  scripts: PartnerScript[]
}

export type PartnerOpp = {
  id: string
  title: string
  subtitle: string | null
  description: string
  status: string
  formats: string[]
  genres: string[]
  budget_tiers: string[]
  tags: string[]
  min_score: number | null
  deadline: string | null
  created_at: string
}

// Aggregate triage sentiment for a script across ALL considerations/opportunities
export type ScriptSentiment = {
  total_heat: number
  liked_tags: Record<string, number>   // tag → count
  pass_tags: Record<string, number>    // tag → count
  review_count: number                 // how many reviews contributed
}

export default async function PartnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/partner')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, account_type')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') redirect('/dashboard')

  const service = svc()

  // Fetch ALL opportunities owned by this partner (active + closed)
  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, subtitle, description, status, formats, genres, budget_tiers, tags, min_score, deadline, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const oppList = (opps || []) as PartnerOpp[]
  const oppIds = oppList.map(o => o.id)

  if (oppIds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0a1a' }}>
        <div className="text-center">
          <p className="text-white/50 text-[14px]">You don&apos;t have any opportunities yet.</p>
          <a href="/partner/opportunities/create" className="inline-block mt-4 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-colors no-underline" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            Create your first opportunity
          </a>
        </div>
      </div>
    )
  }

  // Fetch ALL considerations for those opportunities (not just latest)
  const { data: rawApps } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, writer_id, writer_pitch, application_responses, opportunity_id, triage_status, triage_feedback_tags')
    .in('opportunity_id', oppIds)
    .order('submitted_at', { ascending: false })

  const apps = (rawApps || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    writer_id: string; writer_pitch: string | null; application_responses: Record<string, string> | null; opportunity_id: string
    triage_status: string | null; triage_feedback_tags: string[] | null
  }[]

  // Compute per-writer application count scoped to each opportunity
  // Key: `${writer_id}:${opportunity_id}` → count
  const writerOppCount = new Map<string, number>()
  for (const a of apps) {
    const key = `${a.writer_id}:${a.opportunity_id}`
    writerOppCount.set(key, (writerOppCount.get(key) || 0) + 1)
  }

  // Load writer profiles
  const writerIds = [...new Set(apps.map(a => a.writer_id))]
  const writerMap = new Map<string, { full_name: string | null; email: string | null; headline: string | null; avatar_url: string | null }>()
  if (writerIds.length > 0) {
    const { data: writers } = await service
      .from('profiles')
      .select('id, full_name, email, headline, avatar_url')
      .in('id', writerIds)
    for (const w of (writers || []) as { id: string; full_name: string | null; email: string | null; headline: string | null; avatar_url: string | null }[]) {
      writerMap.set(w.id, { full_name: w.full_name, email: w.email, headline: w.headline, avatar_url: w.avatar_url })
    }
  }

  // Load writer stats (script count, top score, total heat) per writer
  const writerStats = new Map<string, { script_count: number; top_score: number | null; total_heat: number }>()
  if (writerIds.length > 0) {
    const { data: writerSubs } = await service
      .from('script_submissions')
      .select('id, user_id, heat_score')
      .in('user_id', writerIds)
      .eq('status', 'completed')
      .is('hidden_at', null)
    const { data: writerEvals } = await service
      .from('script_evaluations')
      .select('submission_id, weighted_score')
      .in('submission_id', (writerSubs || []).map((s: any) => s.id))
    // Build eval score map
    const evalScoreMap = new Map<string, number>()
    for (const e of (writerEvals || []) as { submission_id: string; weighted_score: number | null }[]) {
      if (e.weighted_score != null) evalScoreMap.set(e.submission_id, e.weighted_score)
    }
    // Aggregate per writer
    for (const s of (writerSubs || []) as { id: string; user_id: string; heat_score: number | null }[]) {
      const existing = writerStats.get(s.user_id) || { script_count: 0, top_score: null, total_heat: 0 }
      existing.script_count++
      existing.total_heat += s.heat_score ?? 0
      const score = evalScoreMap.get(s.id)
      if (score != null && (existing.top_score == null || score > existing.top_score)) {
        existing.top_score = Math.round(score)
      }
      writerStats.set(s.user_id, existing)
    }
  }

  // Load scripts + evaluations for each application
  const appIds = apps.map(a => a.id)
  const scriptsByApp = new Map<string, PartnerScript[]>()

  if (appIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', appIds)

    const scriptIds = (cs || []).map((c: any) => c.script_submission_id)

    if (scriptIds.length > 0) {
      const { data: subs } = await service
        .from('script_submissions')
        .select('id, title, heat_score, poster_url, declared_format')
        .in('id', scriptIds)

      const subMap = new Map<string, { title: string; heat_score: number | null; poster_url: string | null; declared_format: string | null }>()
      for (const s of (subs || []) as { id: string; title: string; heat_score: number | null; poster_url: string | null; declared_format: string | null }[]) {
        subMap.set(s.id, { title: s.title, heat_score: s.heat_score, poster_url: s.poster_url, declared_format: s.declared_format })
      }

      const { data: evals } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score, evaluation')
        .in('submission_id', scriptIds)

      const evalMap = new Map<string, { eval_id: string; score: number | null; logline: string | null; format: string | null; genre: string | null; budget_tier: string | null }>()
      for (const e of (evals || []) as { id: string; submission_id: string; weighted_score: number | null; evaluation: any }[]) {
        const ev = e.evaluation || {}
        const cls = ev.classification || {}
        const fmt = ev.format_detection || {}
        const pkg = ev.packaging || {}
        const logline = ev.positioning_hook || ev.whats_special?.headline || null
        const format = cls.format || fmt.format || null
        const genre = cls.genre_primary || null
        const bt = pkg.budget_tier
        const budget_tier = bt ? (bt.label || bt.tier || null) : null
        evalMap.set(e.submission_id, { eval_id: e.id, score: e.weighted_score, logline, format, genre, budget_tier })
      }

      for (const c of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
        const existing = scriptsByApp.get(c.consideration_id) || []
        const sub = subMap.get(c.script_submission_id)
        const ev = evalMap.get(c.script_submission_id)
        existing.push({
          submission_id: c.script_submission_id,
          eval_id: ev?.eval_id ?? null,
          title: sub?.title || 'Untitled',
          score: ev?.score ?? null,
          heat_score: sub?.heat_score ?? null,
          logline: ev?.logline ?? null,
          poster_url: sub?.poster_url ?? null,
          format: ev?.format || sub?.declared_format || null,
          genre: ev?.genre ?? null,
          budget_tier: ev?.budget_tier ?? null,
        })
        scriptsByApp.set(c.consideration_id, existing)
      }
    }
  }

  // Build enriched app list
  const enrichedApps: PartnerApp[] = apps.map(app => ({
    ...app,
    writer_name: writerMap.get(app.writer_id)?.full_name || writerMap.get(app.writer_id)?.email || null,
    writer_email: writerMap.get(app.writer_id)?.email || null,
    writer_headline: writerMap.get(app.writer_id)?.headline || null,
    writer_avatar_url: writerMap.get(app.writer_id)?.avatar_url || null,
    writer_app_count: writerOppCount.get(`${app.writer_id}:${app.opportunity_id}`) || 1,
    writer_script_count: writerStats.get(app.writer_id)?.script_count ?? 0,
    writer_top_score: writerStats.get(app.writer_id)?.top_score ?? null,
    writer_total_heat: writerStats.get(app.writer_id)?.total_heat ?? 0,
    scripts: scriptsByApp.get(app.id) || [],
  }))

  // Build per-script sentiment aggregation across ALL considerations
  // Key: script_submission_id → aggregated tags + heat
  const scriptSentiment: Record<string, ScriptSentiment> = {}

  // Get all script_submission_ids we know about
  const allScriptIds = new Set<string>()
  for (const app of enrichedApps) {
    for (const s of app.scripts) {
      allScriptIds.add(s.submission_id)
    }
  }

  if (allScriptIds.size > 0) {
    // Find ALL considerations that reference these scripts (across all opps, all partners)
    const { data: allCs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('script_submission_id', [...allScriptIds])

    if (allCs && allCs.length > 0) {
      const allConsIds = [...new Set(allCs.map((c: any) => c.consideration_id))]
      // Fetch review data for COMPLETED considerations only (all opportunities)
      const { data: allReviewData } = await service
        .from('considerations')
        .select('id, feedback_tags, next_steps_tags, heat_earned')
        .in('id', allConsIds)
        .eq('review_stage', 'complete')

      // Map consideration_id → review data
      const reviewMap = new Map<string, { feedback_tags: string[] | null; next_steps_tags: string[] | null; heat_earned: number }>()
      for (const t of (allReviewData || []) as { id: string; feedback_tags: string[] | null; next_steps_tags: string[] | null; heat_earned: number | null }[]) {
        const hasTags = (t.feedback_tags && t.feedback_tags.length > 0) || (t.next_steps_tags && t.next_steps_tags.length > 0)
        if (hasTags) {
          reviewMap.set(t.id, { feedback_tags: t.feedback_tags, next_steps_tags: t.next_steps_tags, heat_earned: t.heat_earned || 0 })
        }
      }

      // Aggregate by script_submission_id
      for (const cs of allCs as { consideration_id: string; script_submission_id: string }[]) {
        const review = reviewMap.get(cs.consideration_id)
        if (!review) continue

        if (!scriptSentiment[cs.script_submission_id]) {
          scriptSentiment[cs.script_submission_id] = { total_heat: 0, liked_tags: {}, pass_tags: {}, review_count: 0 }
        }
        const sent = scriptSentiment[cs.script_submission_id]
        sent.review_count++
        sent.total_heat += review.heat_earned
        for (const tag of (review.feedback_tags || [])) {
          sent.liked_tags[tag] = (sent.liked_tags[tag] || 0) + 1
        }
        for (const tag of (review.next_steps_tags || [])) {
          sent.pass_tags[tag] = (sent.pass_tags[tag] || 0) + 1
        }
      }
    }
  }

  return <PartnerTriageClient opportunities={oppList} applications={enrichedApps} scriptSentiment={scriptSentiment} />
}
