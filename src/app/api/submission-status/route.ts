// GET /api/submission-status?id=xxx
// Returns the status of a script submission. Anonymous-friendly —
// only returns status + title, no sensitive data. Used by the
// /evaluating page to poll while the eval runs.

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
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const service = svc()
  const { data, error } = await service
    .from('script_submissions')
    .select('id, status, title')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    title: data.title,
  })
}
