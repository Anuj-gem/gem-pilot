// POST /api/consideration/review — producer reviews a consideration.

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

  // Send feedback notification email to the writer
  try {
    const { data: consideration } = await service
      .from('considerations')
      .select('writer_id')
      .eq('id', consideration_id)
      .single()

    if (consideration) {
      const { data: profile } = await service
        .from('profiles')
        .select('full_name, email')
        .eq('id', consideration.writer_id)
        .single()

      if (profile?.email) {
        const firstName = profile.full_name?.split(' ')[0] || 'there'
        await sendEmail({
          templateAlias: 'consideration_feedback',
          to: profile.email,
          variables: {
            first_name: firstName,
            feedback_url: 'https://www.gem.studio/dashboard',
          },
          dedupeKey: `consideration_feedback_${consideration_id}`,
          tag: 'consideration_feedback',
        }, service)
      }
    }
  } catch (emailErr) {
    // Non-critical — don't fail the review if email fails
    console.error('[consideration/review] Email send failed:', emailErr)
  }

  return NextResponse.json({ ok: true })
}
