import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { submissionId, budgetPlan, revenuePlan } = body
  if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })

  const service = createServiceClient()

  // Verify ownership
  const { data: sub } = await service
    .from('script_submissions')
    .select('id, user_id')
    .eq('id', submissionId)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = user.email === 'anuj@gem.studio' || user.email === 'anujkommareddy@gmail.com'
  if (sub.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const update: Record<string, unknown> = {}
  if (budgetPlan !== undefined) update.budget_plan = budgetPlan
  if (revenuePlan !== undefined) update.revenue_plan = revenuePlan

  const { error } = await service
    .from('script_submissions')
    .update(update)
    .eq('id', submissionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
