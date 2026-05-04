// POST /api/opportunities/mark-viewed — writer marks feedback as viewed.
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

  const { submission_ids } = (await req.json()) as { submission_ids: string[] }
  if (!submission_ids?.length) return NextResponse.json({ error: 'Missing submission_ids' }, { status: 400 })

  const service = svc()
  await service
    .from('opportunity_submissions')
    .update({ feedback_viewed_at: new Date().toISOString() })
    .in('id', submission_ids)
    .eq('writer_id', user.id)
    .eq('status', 'reviewed')
    .is('feedback_viewed_at', null)

  return NextResponse.json({ ok: true })
}
