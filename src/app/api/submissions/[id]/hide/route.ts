// POST /api/submissions/[id]/hide
//
// Soft-removes a submission from the writer's dashboard. Sets
// script_submissions.hidden_at = now() after verifying the requester owns the
// row. This hides the card from the dashboard AND pulls it off the leaderboard
// view (Discover), but preserves:
//   - is_public (their publish intent — restored on a later un-hide)
//   - the evaluation row
//   - the free-eval paywall (hidden scripts still count as "used your free eval")
//
// There's intentionally no un-hide endpoint — restore is a support path.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
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
          } catch {}
        },
      },
    }
  )
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await context.params
    if (!submissionId || typeof submissionId !== 'string') {
      return NextResponse.json({ error: 'Missing submission id.' }, { status: 400 })
    }

    // 1. Authn
    const auth = await createAuthClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to remove this script.' }, { status: 401 })
    }

    // 2. Authz — confirm ownership
    const svc = createServiceClient()
    const { data: sub, error: subErr } = await svc
      .from('script_submissions')
      .select('id, user_id, hidden_at')
      .eq('id', submissionId)
      .single()

    if (subErr || !sub) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    }
    // Anuj 2026-04-28: admin (anuj@gem.studio) can take down any post
    // — used to remove problematic content while we sort out a proper
    // content-management surface. Owner check is bypassed in that case.
    const isAdmin = user.email === 'anuj@gem.studio'
    if (sub.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Not your submission.' }, { status: 403 })
    }

    // Idempotent — if it's already hidden, just succeed.
    if (sub.hidden_at) {
      return NextResponse.json({ ok: true, alreadyHidden: true })
    }

    // 3. Mark hidden AND force private. A hidden script must not leak
    //    onto Community even if its `is_public` flag was true.
    //    (Anuj 2026-04-30 bug: removing a script left it visible in
    //    /discover until the next page refresh of the Community
    //    queries, because they only filtered on is_public.)
    const { error: updErr } = await svc
      .from('script_submissions')
      .update({ hidden_at: new Date().toISOString(), is_public: false })
      .eq('id', submissionId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // 4. Propagate the removal to any active script_matches so producers
    //    stop seeing the script in their Inbox/Slate. We treat the writer's
    //    "remove from dashboard" as an implicit unmatch from their side.
    //    Wrapped in try/catch — if propagation fails we still want the hide
    //    to succeed (the writer's primary intent is honoured).
    //
    //    Note: we only flip rows that aren't already unmatched. If the
    //    writer later un-hides via support, matches stay unmatched — they
    //    do NOT auto-restore (would need an explicit re-trigger).
    try {
      await svc
        .from('script_matches')
        .update({
          unmatched_at: new Date().toISOString(),
          unmatched_by: 'writer',
          unmatch_reason: 'post_removed',
        })
        .eq('submission_id', submissionId)
        .is('unmatched_at', null)
    } catch (propagationErr) {
      // Log but don't fail the request — the hide already succeeded.
      console.error(
        '[submissions/hide] Failed to propagate to script_matches:',
        propagationErr
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
