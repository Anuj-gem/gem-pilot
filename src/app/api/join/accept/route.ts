import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function makeServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * POST /api/join/accept
 *
 * Accepts a collaborator invite for the currently authenticated user.
 * Body: { token: string }  — the script_collaborators row UUID
 *
 * Returns: { ok: true, evalId: string | null }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  // Cookie-based auth client
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
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const token = (body.token || '').trim()
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  const service = makeServiceClient()

  // Look up the invite row
  const { data: collab } = await service
    .from('script_collaborators')
    .select('id, submission_id, collaborator_email, collaborator_id, status')
    .eq('id', token)
    .single()

  if (!collab) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // Accept — either it's pending or already accepted by this user (idempotent)
  if (collab.status === 'pending' || collab.collaborator_id !== user.id) {
    const { error: updateError } = await service
      .from('script_collaborators')
      .update({ collaborator_id: user.id, status: 'accepted' })
      .eq('id', collab.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
  }

  // Look up the evaluation ID so the client can redirect to the report
  const { data: evalInfo } = await service
    .from('script_evaluations')
    .select('id')
    .eq('submission_id', collab.submission_id)
    .single()

  return NextResponse.json({ ok: true, evalId: evalInfo?.id ?? null })
}
