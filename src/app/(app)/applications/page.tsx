// /review — Writer's opportunity applications listing.
// Shows all applications (considerations with opportunity_id),
// with status, feedback tags, and links to detail.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { UploadCTAButton } from '@/components/upload-cta-button'
import { ApplicationsList } from '@/components/applications/applications-list'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="mb-5">
          <h1 className="text-[22px] font-bold text-white m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Applications
          </h1>
          <p className="text-[13px] text-white/50 mt-1 m-0">Your opportunity applications will appear here.</p>
        </header>
        <div className="rounded-xl border border-white/10 bg-white px-6 py-10 text-center" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.25), 0 0 1px rgba(255,255,255,0.1)' }}>
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No applications yet</p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">Upload a script, get your report, then apply to open opportunities.</p>
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

  const service = svc()

  // Load all opportunity applications (considerations with opportunity_id)
  const { data: rawApps } = await service
    .from('considerations')
    .select('id, status, review_stage, submitted_at, reviewed_at, feedback, feedback_tags, next_steps_tags, opportunity_id, writer_pitch, heat_earned, backing_status, backing_conditions')
    .eq('writer_id', user.id)
    .not('opportunity_id', 'is', null)
    .order('submitted_at', { ascending: false })

  const apps = (rawApps || []) as {
    id: string; status: string; review_stage: string; submitted_at: string
    reviewed_at: string | null; feedback: string | null
    feedback_tags: string[] | null; next_steps_tags: string[] | null
    opportunity_id: string; writer_pitch: string | null
    heat_earned: number; backing_status: string | null
    backing_conditions: string[] | null
  }[]

  // Load opportunity titles + active status
  const oppIds = [...new Set(apps.map(a => a.opportunity_id))]
  let oppMap = new Map<string, { title: string; slug: string; isActive: boolean }>()
  if (oppIds.length > 0) {
    const { data: opps } = await service
      .from('opportunities')
      .select('id, title, slug, status')
      .in('id', oppIds)
    for (const o of (opps || []) as { id: string; title: string; slug: string; status: string }[]) {
      oppMap.set(o.id, { title: o.title, slug: o.slug, isActive: o.status === 'active' })
    }
  }

  // Load scripts per application
  const appIds = apps.map(a => a.id)
  let scriptsByApp = new Map<string, { title: string; score: number | null }[]>()
  if (appIds.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('consideration_id, script_submission_id')
      .in('consideration_id', appIds)

    const scriptIds = (cs || []).map((c: any) => c.script_submission_id)
    let titleMap = new Map<string, string>()
    let evalMap = new Map<string, number | null>()

    if (scriptIds.length > 0) {
      const { data: subs } = await service
        .from('script_submissions')
        .select('id, title')
        .in('id', scriptIds)
      for (const s of (subs || []) as { id: string; title: string }[]) {
        titleMap.set(s.id, s.title)
      }
      const { data: evals } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score')
        .in('submission_id', scriptIds)
      for (const e of (evals || []) as { submission_id: string; weighted_score: number | null }[]) {
        evalMap.set(e.submission_id, e.weighted_score)
      }
    }

    for (const c of (cs || []) as { consideration_id: string; script_submission_id: string }[]) {
      const existing = scriptsByApp.get(c.consideration_id) || []
      existing.push({
        title: titleMap.get(c.script_submission_id) || 'Untitled',
        score: evalMap.get(c.script_submission_id) ?? null,
      })
      scriptsByApp.set(c.consideration_id, existing)
    }
  }


  // Derive total heat from sum of all script heat scores
  const { data: heatSubs } = await service
    .from('script_submissions')
    .select('heat_score')
    .eq('user_id', user.id)
    .eq('status', 'completed')
  const totalHeat = (heatSubs || []).reduce((sum: number, s: any) => sum + (s.heat_score ?? 0), 0)

  // Count matching scripts per opportunity for reapply CTA
  const matchingScriptCounts: Record<string, number> = {}
  for (const app of apps) {
    const scripts = scriptsByApp.get(app.id) || []
    matchingScriptCounts[app.opportunity_id] = scripts.length
  }

  // Convert Maps to plain objects for client component
  const oppMapObj: Record<string, { title: string; slug: string; isActive: boolean }> = {}
  for (const [k, v] of oppMap) oppMapObj[k] = v
  const scriptsByAppObj: Record<string, { title: string; score: number | null }[]> = {}
  for (const [k, v] of scriptsByApp) scriptsByAppObj[k] = v

  return (
    <div className="max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-white m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Applications
          </h1>
          <p className="text-[13px] text-white/50 mt-1 m-0">{apps.length} {apps.length === 1 ? 'application' : 'applications'}</p>
        </div>
        <Link
          href="/opportunities"
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          Browse opportunities
        </Link>
      </header>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white px-6 py-10 text-center" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.25), 0 0 1px rgba(255,255,255,0.1)' }}>
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No applications yet</p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">Upload a script, get your report, then apply to open opportunities.</p>
          <Link
            href="/opportunities"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ background: 'var(--gem-accent)' }}
          >
            View opportunities
          </Link>
        </div>
      ) : (
        <ApplicationsList
          apps={apps}
          oppMap={oppMapObj}
          scriptsByApp={scriptsByAppObj}
          totalHeat={totalHeat}
          matchingScriptCounts={matchingScriptCounts}
        />
      )}
    </div>
  )
}
