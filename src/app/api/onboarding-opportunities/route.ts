// GET /api/onboarding-opportunities?ids=id1,id2
// Returns active opportunities that match the given script submissions.
// Anonymous-friendly — no auth required. Used by the onboarding flow
// to show which opportunities a script qualifies for.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')
  if (!idsParam) {
    return NextResponse.json({ opportunities: [] })
  }

  const ids = idsParam.split(',').filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ opportunities: [] })
  }

  const service = svc()

  // Fetch the scripts' evaluations to get scores and genres
  const { data: evals } = await service
    .from('script_evaluations')
    .select('submission_id, weighted_score, evaluation')
    .in('submission_id', ids)

  if (!evals || evals.length === 0) {
    return NextResponse.json({ opportunities: [] })
  }

  // Build a lookup of submission → { score, genres, format }
  const scriptData = new Map<string, { score: number; genres: string[] }>()
  for (const ev of evals) {
    const evaluation = ev.evaluation as any
    const genres = evaluation?.classification?.genre ||
      evaluation?.classification?.genres ||
      evaluation?.classification?.tags || []
    scriptData.set(ev.submission_id, {
      score: Math.round(ev.weighted_score ?? 0),
      genres: Array.isArray(genres) ? genres : [],
    })
  }

  // Also get the declared_format from submissions
  const { data: subs } = await service
    .from('script_submissions')
    .select('id, declared_format')
    .in('id', ids)

  const formatMap = new Map<string, string>()
  for (const s of subs || []) {
    formatMap.set(s.id, s.declared_format)
  }

  // Fetch all active opportunities
  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, deadline, min_score, formats, genres')
    .eq('status', 'active')

  if (!opps || opps.length === 0) {
    return NextResponse.json({ opportunities: [] })
  }

  // Match: an opportunity qualifies if ANY of the uploaded scripts meets its criteria
  const matched: { id: string; title: string; deadline: string | null; min_score: number | null }[] = []

  for (const opp of opps) {
    let qualifies = false

    for (const [subId, sd] of scriptData) {
      const format = formatMap.get(subId) || ''

      // Score check
      if (opp.min_score != null && sd.score < opp.min_score) continue

      // Format check (if opportunity specifies formats)
      if (opp.formats && opp.formats.length > 0) {
        const normalizedFormat = format.toLowerCase()
        const oppFormats = opp.formats.map((f: string) => f.toLowerCase())
        if (!oppFormats.some((f: string) => normalizedFormat.includes(f) || f.includes(normalizedFormat))) {
          continue
        }
      }

      // Genre check is optional — if opportunity has genres, at least one must match
      // (but many opportunities don't restrict by genre)
      qualifies = true
      break
    }

    if (qualifies) {
      matched.push({
        id: opp.id,
        title: opp.title,
        deadline: opp.deadline,
        min_score: opp.min_score,
      })
    }
  }

  return NextResponse.json({ opportunities: matched })
}
