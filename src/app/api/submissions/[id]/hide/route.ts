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
    if (sub.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your submission.' }, { status: 403 })
    }

    // Idempotent — if it's already hidden, just succeed.
    if (sub.hidden_at) {
      return NextResponse.json({ ok: true, alreadyHidden: true })
    }

    // 3. Mark hidden
    const { error: updErr } = await svc
      .from('script_submissions')
      .update({ hidden_at: new Date().toISOString() })
      .eq('id', submissionId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
