// POST /api/consideration/heart-script — toggle hearted flag on a consideration_script
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

  const { consideration_id, script_submission_id, hearted } = await req.json() as {
    consideration_id: string
    script_submission_id: string
    hearted: boolean
  }

  if (!consideration_id || !script_submission_id || typeof hearted !== 'boolean') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const service = svc()

  const { error } = await service
    .from('consideration_scripts')
    .update({ hearted })
    .eq('consideration_id', consideration_id)
    .eq('script_submission_id', script_submission_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, hearted })
}
