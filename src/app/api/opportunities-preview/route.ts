// GET /api/opportunities-preview
// Returns up to 3 active opportunities for the onboarding preview section.
// No auth required.

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function GET(request: Request) {
  const service = svc()
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === 'true'

  let query = service
    .from('opportunities')
    .select('id, title, slug, subtitle, description, deadline, min_score, formats, genres, budget_tiers')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (!all) query = query.limit(3)

  const { data: opps } = await query

  return NextResponse.json({
    opportunities: (opps || []).map(o => ({
      id: o.id,
      title: o.title,
      slug: o.slug,
      subtitle: o.subtitle,
      description: o.description,
      deadline: o.deadline,
      min_score: o.min_score,
      formats: o.formats,
      genres: o.genres,
      budget_tiers: o.budget_tiers,
    })),
  })
}
