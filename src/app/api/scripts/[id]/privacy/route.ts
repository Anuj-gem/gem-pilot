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
  const privacy = normalizePrivacy(body?.privacy)
  const contactEnabled =
    typeof body?.contact_enabled === 'boolean' ? body.contact_enabled : undefined

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
