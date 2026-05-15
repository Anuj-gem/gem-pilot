// POST /api/opportunity/batch-apply
// Batch-apply to multiple opportunities from the onboarding flow.
// Expects: { applications: [{ script_id, opportunity_id }] }
// Creates a consideration row for each unique opportunity, attaching the script.
// Requires auth (user must have just created their account).

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
  const { applications } = body as {
    applications: { script_id: string; opportunity_id: string }[]
  }

  if (!applications || applications.length === 0) {
    return NextResponse.json({ ok: true, created: 0 })
  }

  const service = svc()

  // Group by opportunity — one consideration per opportunity, attach all scripts
  const byOpp = new Map<string, string[]>()
  for (const app of applications) {
    if (!app.opportunity_id || !app.script_id) continue
    const existing = byOpp.get(app.opportunity_id) || []
    existing.push(app.script_id)
    byOpp.set(app.opportunity_id, existing)
  }

  let created = 0

  for (const [oppId, scriptIds] of byOpp) {
    // Check if user already applied to this opportunity
    const { data: existing } = await service
      .from('considerations')
      .select('id')
      .eq('writer_id', user.id)
      .eq('opportunity_id', oppId)
      .limit(1)

    if (existing && existing.length > 0) continue

    // Create the consideration
    const { data: consideration, error } = await service
      .from('considerations')
      .insert({
        writer_id: user.id,
        opportunity_id: oppId,
        status: 'submitted',
        review_stage: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !consideration) continue

    // Attach scripts via consideration_scripts
    const scriptRows = scriptIds.map(sid => ({
      consideration_id: consideration.id,
      submission_id: sid,
    }))

    await service.from('consideration_scripts').insert(scriptRows)
    created++
  }

  return NextResponse.json({ ok: true, created })
}
