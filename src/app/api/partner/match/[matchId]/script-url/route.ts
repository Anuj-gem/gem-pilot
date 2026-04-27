// GET /api/partner/match/[matchId]/script-url
//
// Returns a short-lived signed URL to the underlying script PDF for a
// producer who has marked the match Interested (or Commented). Pre-Interested
// producers and producers who passed get a 403 — the script download is
// part of the Interested unlock.
//
// We use the user's authed supabase client (RLS already restricts the
// match row to the owning producer); the storage `scripts` bucket is
// service-role-managed but `createSignedUrl` is allowed for the anon
// session as long as RLS lets the user "read" the underlying row. The
// PDF path lives in `script_submissions.file_url`.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await context.params
  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: matchRow, error: lookupErr } = await supabase
    .from('script_matches')
    .select(
      `
      id, producer_id, status, unmatched_at,
      script_submissions ( id, file_url, title )
      `
    )
    .eq('id', matchId)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json({ error: 'Match lookup failed.' }, { status: 500 })
  }
  if (!matchRow || matchRow.producer_id !== user.id) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
  }

  // Gate the download on Interested / Commented and not unmatched.
  if (matchRow.status !== 'interested' && matchRow.status !== 'commented') {
    return NextResponse.json(
      { error: 'Mark this match Interested to unlock the script download.' },
      { status: 403 }
    )
  }
  if (matchRow.unmatched_at) {
    return NextResponse.json(
      { error: 'This match has been unmatched.' },
      { status: 409 }
    )
  }

  const sub = Array.isArray(matchRow.script_submissions)
    ? matchRow.script_submissions[0]
    : matchRow.script_submissions
  if (!sub || !sub.file_url) {
    return NextResponse.json(
      { error: 'Script file is unavailable.' },
      { status: 404 }
    )
  }

  // Sign the storage URL with the service-role client. The producer-side
  // RLS doesn't extend into the storage layer, so we use the service key
  // here after we've already enforced the gate above.
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Server is missing storage credentials.' },
      { status: 500 }
    )
  }
  const service = createServiceClient(serviceUrl, serviceKey)
  const { data: signed, error: signErr } = await service.storage
    .from('scripts')
    .createSignedUrl(sub.file_url, 60 * 10) // 10-minute window

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: 'Could not sign the script URL.', detail: signErr?.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    url: signed.signedUrl,
    title: sub.title ?? 'Script',
  })
}
