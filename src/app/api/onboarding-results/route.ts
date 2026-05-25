// GET /api/onboarding-results?submission_id=xxx
// Returns evaluation data + matched opportunities for the get-started results step.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { scriptMatchesOpportunity, collectGenres, type MatchableScript } from '@/lib/opportunity-matching'

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

  // Build matchable script from eval data
  const packaging = (evalBlob?.packaging as Record<string, any>) || {}
  const budgetTier = packaging.budget_tier as Record<string, any> | undefined
  const scriptBudget = (budgetTier?.tier as string)?.toLowerCase() ?? null
  const scriptTags = ((cls.tags as string[]) || []).map((t: string) => t.toLowerCase().replace(/\s+/g, '-'))
  const scriptGenres = collectGenres(cls.genre_primary, cls.genre_secondary, cls.genre_tags)
  const scriptFormat = submission.declared_format ?? null
  const scriptScore = evalRow?.weighted_score ?? null

  const matchableScript: MatchableScript = {
    format: scriptFormat,
    genres: scriptGenres,
    budget: scriptBudget,
    tags: scriptTags,
    score: scriptScore,
  }

  // ─── Active opportunities ─────────────────────────────────────────────
  const { data: opps } = await supabase
    .from('opportunities')
    .select(
      'id, title, description, slug, formats, genres, min_score, budget_tiers, tags, deadline, created_at, subtitle',
    )
    .eq('status', 'active')
    .eq('published', true)
    .order('created_at', { ascending: false })

  // ─── Match opportunities to script ────────────────────────────────────
  const matched = (opps ?? []).filter((opp) => scriptMatchesOpportunity(matchableScript, opp))

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
