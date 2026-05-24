// /partner — producer triage page.
// Master/detail split: opportunity tabs, sorted app list, detail panel with Pass/Watchlist/Meet.

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
  scripts: { submission_id: string; title: string; score: number | null; heat_score: number | null; logline: string | null; poster_url: string | null }[]
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

  // Fetch opportunities owned by this partner
  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, status, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const oppList = (opps || []) as PartnerOpp[]
  const oppIds = oppList.map(o => o.id)

  if (oppIds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-500 text-[14px]">You don&apos;t have any opportunities yet.</p>
        <a href="/partner/opportunities/create" className="inline-block mt-4 bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-colors no-underline">
          Create your first opportunity
        </a>
      </div>
    )
  }

  // Fetch all considerations for those opportunities
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
  const scriptsByApp = new Map<string, { submission_id: string; title: string; score: number | null; heat_score: number | null; logline: string | null; poster_url: string | null }[]>()

  if (appIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', appIds)

    const scriptIds = (cs || []).map((c: any) => c.script_submission_id)

    if (scriptIds.length > 0) {
      const { data: subs } = await service
        .from('script_submissions')
        .select('id, title, heat_score, poster_url')
        .in('id', scriptIds)

      const titleMap = new Map<string, { title: string; heat_score: number | null; poster_url: string | null }>()
      for (const s of (subs || []) as { id: string; title: string; heat_score: number | null; poster_url: string | null }[]) {
        titleMap.set(s.id, { title: s.title, heat_score: s.heat_score, poster_url: s.poster_url })
      }

      const { data: evals } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score, evaluation')
        .in('submission_id', scriptIds)

      const evalMap = new Map<string, { score: number | null; logline: string | null }>()
      for (const e of (evals || []) as { submission_id: string; weighted_score: number | null; evaluation: any }[]) {
        const logline = e.evaluation?.positioning_hook || e.evaluation?.whats_special?.headline || null
        evalMap.set(e.submission_id, { score: e.weighted_score, logline })
      }

      for (const c of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
        const existing = scriptsByApp.get(c.consideration_id) || []
        const sub = titleMap.get(c.script_submission_id)
        const ev = evalMap.get(c.script_submission_id)
        existing.push({
          submission_id: c.script_submission_id,
          title: sub?.title || 'Untitled',
          score: ev?.score ?? null,
          heat_score: sub?.heat_score ?? null,
          logline: ev?.logline ?? null,
          poster_url: sub?.poster_url ?? null,
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
    scripts: scriptsByApp.get(app.id) || [],
  }))

  return <PartnerTriageClient opportunities={oppList} applications={enrichedApps} />
}
