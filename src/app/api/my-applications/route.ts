// GET /api/my-applications
// Returns the authenticated user's opportunity submissions with opportunity + script details.
// Used by the onboarding flow to show "My Applications" tab.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ applications: [] })
  }

  const service = svc()

  // Fetch all submissions for this writer
  const { data: subs } = await service
    .from('opportunity_submissions')
    .select('id, opportunity_id, submission_id, status, feedback, next_steps, outcome, submitted_at, reviewed_at')
    .eq('writer_id', user.id)
    .order('submitted_at', { ascending: false })

  if (!subs || subs.length === 0) {
    return NextResponse.json({ applications: [] })
  }

  // Gather IDs
  const oppIds = [...new Set(subs.map((s: any) => s.opportunity_id))]
  const scriptIds = [...new Set(subs.map((s: any) => s.submission_id))]

  // Fetch opportunity details
  const { data: oppRows } = await service
    .from('opportunities')
    .select('id, title, subtitle, deadline, status')
    .in('id', oppIds)

  const oppMap = new Map<string, any>()
  for (const o of oppRows || []) {
    oppMap.set(o.id, o)
  }

  // Fetch script details + scores
  const [{ data: scriptRows }, { data: evalRows }] = await Promise.all([
    service.from('script_submissions').select('id, title, declared_format').in('id', scriptIds),
    service.from('script_evaluations').select('submission_id, weighted_score').in('submission_id', scriptIds),
  ])

  const scriptMap = new Map<string, { title: string; format: string | null }>()
  for (const s of (scriptRows || []) as any[]) {
    scriptMap.set(s.id, { title: s.title, format: s.declared_format })
  }

  const scoreMap = new Map<string, number>()
  for (const e of (evalRows || []) as any[]) {
    scoreMap.set(e.submission_id, Math.round(e.weighted_score ?? 0))
  }

  // Build grouped response: group by opportunity, include script details
  type AppGroup = {
    opportunity_id: string
    opportunity_title: string
    opportunity_subtitle: string | null
    deadline: string | null
    submissions: {
      id: string
      script_title: string
      script_format: string | null
      score: number | null
      status: string
      feedback: string | null
      outcome: string | null
      submitted_at: string
      reviewed_at: string | null
    }[]
  }

  const groupMap = new Map<string, AppGroup>()
  for (const sub of subs as any[]) {
    const opp = oppMap.get(sub.opportunity_id)
    if (!opp) continue

    if (!groupMap.has(sub.opportunity_id)) {
      groupMap.set(sub.opportunity_id, {
        opportunity_id: sub.opportunity_id,
        opportunity_title: opp.title,
        opportunity_subtitle: opp.subtitle || null,
        deadline: opp.deadline,
        submissions: [],
      })
    }

    const script = scriptMap.get(sub.submission_id)
    groupMap.get(sub.opportunity_id)!.submissions.push({
      id: sub.id,
      script_title: script?.title || 'Untitled',
      script_format: script?.format || null,
      score: scoreMap.get(sub.submission_id) ?? null,
      status: sub.status,
      feedback: sub.feedback,
      outcome: sub.outcome,
      submitted_at: sub.submitted_at,
      reviewed_at: sub.reviewed_at,
    })
  }

  const applications = [...groupMap.values()]

  return NextResponse.json({ applications })
}
