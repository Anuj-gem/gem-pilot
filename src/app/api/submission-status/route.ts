// GET /api/submission-status?id=xxx
// Returns the status of a script submission. Anonymous-friendly —
// used by the /evaluating and /onboarding pages to poll while the
// eval runs. When completed, also returns score, tier, and genres
// from the evaluation.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calculateTier } from '@/types'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const service = svc()
  const { data, error } = await service
    .from('script_submissions')
    .select('id, status, title, declared_format')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Base response — always returned
  const response: Record<string, any> = {
    id: data.id,
    status: data.status,
    title: data.title,
  }

  // If completed, enrich with score, tier, genres from the evaluation
  if (data.status === 'completed') {
    const { data: evalData } = await service
      .from('script_evaluations')
      .select('weighted_score, evaluation')
      .eq('submission_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (evalData) {
      const score = Math.round(evalData.weighted_score ?? 0)
      response.score = score
      response.tier = calculateTier(score)

      // Extract genres from the evaluation JSON classification
      const evaluation = evalData.evaluation as any
      const genrePrimary = evaluation?.classification?.genre_primary
      const genreSecondary = evaluation?.classification?.genre_secondary
      // Build clean genre list: primary first, then any secondaries
      const genres: string[] = []
      if (genrePrimary) genres.push(genrePrimary)
      if (Array.isArray(genreSecondary)) genres.push(...genreSecondary)
      response.genres = genres
      response.format = data.declared_format
      response.evaluation = evaluation
    }
  }

  return NextResponse.json(response)
}
