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
  opportunity_id: string
  triage_status: string | null
  triage_feedback_tags: string[] | null
  writer_name: string | null
  writer_email: string | null
  writer_headline: string | null
  writer_avatar_url: string | null
  writer_app_count: number
  scripts: PartnerScript[]
}

export type PartnerOpp = {
  id: string
  title: string
  status: string
  created_at: string
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

  // Fetch only OPEN opportunities owned by this partner
  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, status, created_at')
    .eq('owner_id', user.id)
    .eq('status', 'open')
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
    .select('id, status, review_stage, submitted_at, writer_id, writer_pitch, opportunity_id, triage_status, triage_feedback_tags')
    .in('opportunity_id', oppIds)
    .order('submitted_at', { ascending: false })

  const apps = (rawApps || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    writer_id: string; writer_pitch: string | null; opportunity_id: string
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
        .select('submission_id, weighted_score, evaluation')
        .in('submission_id', scriptIds)

      const evalMap = new Map<string, { score: number | null; logline: string | null; format: string | null; genre: string | null; budget_tier: string | null }>()
      for (const e of (evals || []) as { submission_id: string; weighted_score: number | null; evaluation: any }[]) {
        const ev = e.evaluation || {}
        const cls = ev.classification || {}
        const fmt = ev.format_detection || {}
        const pkg = ev.packaging || {}
        const logline = ev.positioning_hook || ev.whats_special?.headline || null
        const format = cls.format || fmt.format || null
        const genre = cls.genre_primary || null
        const bt = pkg.budget_tier
        const budget_tier = bt ? (bt.label || bt.tier || null) : null
        evalMap.set(e.submission_id, { score: e.weighted_score, logline, format, genre, budget_tier })
      }

      for (const c of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
        const existing = scriptsByApp.get(c.consideration_id) || []
        const sub = subMap.get(c.script_submission_id)
        const ev = evalMap.get(c.script_submission_id)
        existing.push({
          submission_id: c.script_submission_id,
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
    scripts: scriptsByApp.get(app.id) || [],
  }))

  return <PartnerTriageClient opportunities={oppList} applications={enrichedApps} />
}
