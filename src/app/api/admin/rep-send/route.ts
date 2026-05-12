// POST /api/admin/rep-send — admin creates rep_assignments (sends writers to a rep).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_EMAILS = [
  'anuj@gem.studio',
  'anujkommareddy@gmail.com',
  'anuj+producer@gem.studio',
]

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { rep_id, writers } = body as {
    rep_id: string
    writers: { writer_id: string; gem_note: string | null; featured_script_ids: string[] | null }[]
  }

  if (!rep_id || !Array.isArray(writers) || writers.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = svc()

  // Insert one rep_assignment per writer
  const rows = writers.map(w => ({
    rep_id,
    writer_id: w.writer_id,
    gem_note: w.gem_note || null,
    featured_script_ids: w.featured_script_ids,
    status: 'pending',
  }))

  const { error } = await service
    .from('rep_assignments')
    .insert(rows)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
