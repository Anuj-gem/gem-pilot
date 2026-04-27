// PATCH /api/scripts/[id]/privacy
// Update report_privacy JSON for a submission.
//
// Body: { privacy: ReportPrivacy }  — preset application happens client-side
//                                     (UI picks a preset → builds the JSON →
//                                     POSTs). Server normalizes to drop
//                                     unknown keys before writing.
//
// Writers can update any of their own submissions. Clearing privacy_review_needed
// happens on any successful PATCH (the writer has engaged with the panel).
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { normalizePrivacy } from '@/lib/report-privacy'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component */ }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  // Two ways callers can adjust privacy:
  //   - Full shape: body.privacy = { sections: {...}, show_score: ... }
  //   - Targeted: body.show_score (top-level) — merged into existing privacy
  // Both end up normalized through normalizePrivacy before write so we never
  // persist garbage. For the targeted case, fetch the current row, layer the
  // new show_score on top, and write the merged object back.
  const privacyInput = body?.privacy ?? {}
  const topLevelShowScore =
    typeof body?.show_score === 'boolean' ? body.show_score : undefined
  const contactEnabled =
    typeof body?.contact_enabled === 'boolean' ? body.contact_enabled : undefined

  let privacy = normalizePrivacy(privacyInput)

  // If the caller didn't send a full privacy shape, preserve any existing
  // sections/show_score on the row so a targeted score-only flip doesn't
  // wipe per-section choices.
  if (!body?.privacy && topLevelShowScore !== undefined) {
    const { data: existing } = await supabase
      .from('script_submissions')
      .select('report_privacy')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()
    privacy = normalizePrivacy(existing?.report_privacy)
  }
  if (topLevelShowScore !== undefined) {
    privacy = { ...privacy, show_score: topLevelShowScore }
  }

  const update: Record<string, unknown> = {
    report_privacy: privacy,
    privacy_review_needed: false,
  }
  if (contactEnabled !== undefined) update.contact_enabled = contactEnabled

  const { data, error } = await supabase
    .from('script_submissions')
    .update(update)
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .select('id, report_privacy, contact_enabled, privacy_review_needed')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
