// PATCH /api/opportunity/update — edit or close/reopen an opportunity (producer only)

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

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify producer account
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') {
    return NextResponse.json({ error: 'Producer account required' }, { status: 403 })
  }

  const body = await req.json()
  const { opportunity_id, ...fields } = body

  if (!opportunity_id) {
    return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 })
  }

  const service = svc()

  // Verify ownership
  const { data: existing } = await service
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', opportunity_id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }
  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'You do not own this opportunity' }, { status: 403 })
  }

  // Whitelist editable fields
  const allowed = ['title', 'subtitle', 'description', 'formats', 'genres', 'budget_tiers', 'tags', 'status']
  const update: Record<string, any> = {}
  for (const key of allowed) {
    if (key in fields) {
      update[key] = fields[key]
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error: updateError } = await service
    .from('opportunities')
    .update(update)
    .eq('id', opportunity_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
