// GET /api/onboarding-results?submission_id=xxx
// Returns evaluation data + matched opportunities for the get-started results step.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } },
  )
}

export async function GET(req: NextRequest) {
  const submissionId = req.nextUrl.searchParams.get('submission_id')
  if (!submissionId) {
    return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 })
  }

  const supabase = svc()

  // ─── Submission ───────────────────────────────────────────────────────
  const { data: submission } = await supabase
    .from('script_submissions')
    .select('id, title, declared_format, status, heat_score')
    .eq('id', submissionId)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // ─── Evaluation ───────────────────────────────────────────────────────
  const { data: evalRow } = await supabase
    .from('script_evaluations')
    .select('id, submission_id, weighted_score, tier, evaluation')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const evalBlob = evalRow?.evaluation as Record<string, any> | null
  const logline = evalBlob?.positioning_hook ?? ''
  const cls = (evalBlob?.classification as Record<string, any>) || {}
  const genres: string[] = [
    cls.genre_primary,
    ...(cls.genre_secondary ?? []),
  ].filter(Boolean)

  // ─── Active opportunities ─────────────────────────────────────────────
  const { data: opps } = await supabase
    .from('opportunities')
    .select(
      'id, title, description, slug, formats, genres, min_score, deadline, created_at, subtitle',
    )
    .eq('status', 'active')
    .eq('published', true)
    .order('created_at', { ascending: false })

  // ─── Match opportunities to script ────────────────────────────────────
  const scriptFormat = (submission.declared_format ?? '').toLowerCase()
  const scriptScore = evalRow?.weighted_score ?? 0

  const matched = (opps ?? []).filter((opp) => {
    // Format gate
    if (opp.formats?.length) {
      const fmtOk = opp.formats.some((f: string) => {
        const fl = f.toLowerCase()
        return (
          fl === scriptFormat ||
          fl === 'both' ||
          (fl.includes('feature') && scriptFormat.includes('feature')) ||
          (fl.includes('series') && scriptFormat.includes('series'))
        )
      })
      if (!fmtOk) return false
    }
    // Min-score gate
    if (opp.min_score != null && scriptScore < opp.min_score) return false
    // Genre gate (loose substring match)
    if (opp.genres?.length && genres.length) {
      const genreOk = opp.genres.some((g: string) =>
        genres.some(
          (sg: string) =>
            sg.toLowerCase().includes(g.toLowerCase()) ||
            g.toLowerCase().includes(sg.toLowerCase()),
        ),
      )
      if (!genreOk) return false
    }
    return true
  })

  // ─── Applicant counts ─────────────────────────────────────────────────
  const oppIds = matched.map((o) => o.id)
  const counts: Record<string, number> = {}
  if (oppIds.length) {
    const { data: rows } = await supabase
      .from('considerations')
      .select('opportunity_id')
      .in('opportunity_id', oppIds)
      .not('opportunity_id', 'is', null)
    for (const r of rows ?? []) {
      counts[r.opportunity_id] = (counts[r.opportunity_id] ?? 0) + 1
    }
  }

  // ─── Response ─────────────────────────────────────────────────────────
  return NextResponse.json({
    script: {
      title: submission.title,
      format: submission.declared_format,
      status: submission.status,
      heat: submission.heat_score ?? 0,
    },
    evaluation: evalRow
      ? {
          id: evalRow.id,
          score: Math.round(evalRow.weighted_score),
          tier: evalRow.tier,
          logline,
          genres,
        }
      : null,
    opportunities: matched.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      slug: o.slug,
      subtitle: o.subtitle,
      deadline: o.deadline,
      created_at: o.created_at,
      applicant_count: counts[o.id] ?? 0,
    })),
    total_matches: matched.length,
  })
}
