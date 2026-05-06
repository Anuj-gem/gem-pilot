// POST /api/consideration/review — producer reviews a consideration.

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

  const body = await req.json()
  const { consideration_id, feedback, next_steps } = body as {
    consideration_id: string
    feedback: string
    next_steps: string | null
  }

  if (!consideration_id || !feedback?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const service = svc()

  // Update the consideration
  const { error } = await service
    .from('considerations')
    .update({
      status: 'reviewed',
      feedback: feedback.trim(),
      next_steps: next_steps?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', consideration_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
