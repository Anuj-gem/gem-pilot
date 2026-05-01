// /api/scripts/[id]/industry-stats — owner-only producer activity counters.
// Anuj 2026-04-30 v0.7.
//
// Returns:
//   { viewed, interested, passed, emailed }
//
// `viewed`     = distinct producers who opened the script (script_views or
//                script_matches.opened_at, whichever exists). We use the
//                count of script_matches rows whose `opened_at` is set —
//                that's the existing tracking signal across the app.
// `interested` = matches with status='interested' or 'commented' AND not unmatched.
// `passed`     = matches with status='passed'.
// `emailed`    = matches with `producer_emailed_at` set.
//
// Auth: only the writer owning the submission can read these. Returns 404
// for non-owners (avoids leaking submission existence).
//
// All counts ignore unmatched rows so a previously-interested producer who
// later un-matched isn't double-counted on both sides.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Confirm the requester owns this submission.
  const { data: sub } = await supabase
    .from('script_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single()
  if (!sub || sub.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Pull all relevant matches in one go and bucket client-side. Cheaper
  // than 4 round-trips.
  const { data: rows } = await supabase
    .from('script_matches')
    .select('status, opened_at, producer_emailed_at, unmatched_at')
    .eq('submission_id', submissionId)

  type Row = {
    status: string | null
    opened_at: string | null
    producer_emailed_at: string | null
    unmatched_at: string | null
  }
  const matches = (rows as Row[] | null) || []

  let viewed = 0
  let interested = 0
  let passed = 0
  let emailed = 0
  for (const m of matches) {
    if (m.unmatched_at) continue
    if (m.opened_at) viewed += 1
    if (m.producer_emailed_at) emailed += 1
    if (m.status === 'interested' || m.status === 'commented') interested += 1
    if (m.status === 'passed') passed += 1
  }

  return NextResponse.json({ viewed, interested, passed, emailed })
}
