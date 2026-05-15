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

export async function GET() {
  const service = svc()

  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, subtitle, deadline, min_score')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  return NextResponse.json({
    opportunities: (opps || []).map(o => ({
      id: o.id,
      title: o.title,
      subtitle: o.subtitle,
      deadline: o.deadline,
      min_score: o.min_score,
    })),
  })
}
