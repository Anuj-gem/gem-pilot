// POST /api/consideration/withdraw-script — remove one script from the writer's
// pending application to an opportunity. If it was the last script, the whole
// (now-empty) application is removed so the writer is no longer "pending".

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

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

  const { opportunity_id, script_id } = (await req.json()) as { opportunity_id?: string; script_id?: string }
  if (!opportunity_id || !script_id) {
    return NextResponse.json({ error: 'Missing opportunity_id or script_id' }, { status: 400 })
  }

  const service = svc()

  const { data: cons } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('opportunity_id', opportunity_id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (!cons) return NextResponse.json({ ok: true }) // nothing pending to withdraw

  await service
    .from('consideration_scripts')
    .delete()
    .eq('consideration_id', cons.id)
    .eq('script_submission_id', script_id)

  // If no scripts remain, drop the empty application entirely.
  const { count } = await service
    .from('consideration_scripts')
    .select('script_submission_id', { count: 'exact', head: true })
    .eq('consideration_id', cons.id)

  if ((count ?? 0) === 0) {
    await service.from('considerations').delete().eq('id', cons.id)
  }

  return NextResponse.json({ ok: true })
}
