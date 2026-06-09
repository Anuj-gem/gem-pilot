// POST /api/consideration/review-script — per-script review for a producer.
// Sets outcome ('pass') + feedback + tags on a single consideration_scripts row,
// or clears it. Auth: admin, or owner of the opportunity the application is for.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { sendEmail } from '@/lib/email'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

const ADMIN_EMAILS = ['anuj@gem.studio', 'anujkommareddy@gmail.com']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { consideration_id, script_submission_id, feedback, feedback_tags, outcome, clear } = (await req.json()) as {
    consideration_id?: string
    script_submission_id?: string
    feedback?: string
    feedback_tags?: string[]
    outcome?: string
    clear?: boolean
  }

  if (!consideration_id || !script_submission_id) {
    return NextResponse.json({ error: 'Missing consideration_id or script_submission_id' }, { status: 400 })
  }

  const service = svc()
  const isAdmin = ADMIN_EMAILS.includes(user.email || '')
  if (!isAdmin) {
    const { data: con } = await service.from('considerations').select('opportunity_id').eq('id', consideration_id).single()
    if (!con?.opportunity_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: opp } = await service.from('opportunities').select('owner_id').eq('id', con.opportunity_id).single()
    if (!opp || opp.owner_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const update: Record<string, unknown> = clear
    ? { outcome: null, feedback: null, feedback_tags: [], reviewed_at: null }
    : {
        outcome: outcome || 'pass',
        feedback: feedback?.trim() || null,
        feedback_tags: feedback_tags || [],
        reviewed_at: new Date().toISOString(),
      }

  const { error } = await service
    .from('consideration_scripts')
    .update(update)
    .eq('consideration_id', consideration_id)
    .eq('script_submission_id', script_submission_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the writer that this script's review is complete. Per-script, and
  // deduped on consideration+script so each script sends exactly once (a later
  // "Update feedback" on the same script won't re-send). Skipped on clear.
  if (!clear) {
    try {
      const { data: con } = await service
        .from('considerations')
        .select('writer_id')
        .eq('id', consideration_id)
        .single()
      const { data: script } = await service
        .from('script_submissions')
        .select('title')
        .eq('id', script_submission_id)
        .single()
      // Feedback lives on the report page for this script (keyed by eval id).
      const { data: ev } = await service
        .from('script_evaluations')
        .select('id')
        .eq('submission_id', script_submission_id)
        .single()
      const reportUrl = ev?.id
        ? `https://www.gem.studio/report/${ev.id}`
        : 'https://www.gem.studio/dashboard'
      if (con?.writer_id) {
        const { data: writer } = await service
          .from('profiles')
          .select('email')
          .eq('id', con.writer_id)
          .single()
        if (writer?.email) {
          await sendEmail({
            templateAlias: 'consideration_complete' as const,
            to: writer.email,
            variables: {
              script_title: script?.title || 'your script',
              feedback_url: reportUrl,
            },
            dedupeKey: `consideration_complete_${consideration_id}_${script_submission_id}`,
            tag: 'consideration_complete',
            userId: con.writer_id,
          }, service)
        }
      }
    } catch (e) {
      console.error('[review-script] complete email failed:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
