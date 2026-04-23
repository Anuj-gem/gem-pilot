// POST /api/draft-submission
//
// Creates a script_submissions row in `awaiting_pdf` state for the guided
// submit flow when the writer doesn't have their PDF on hand. Mirrors the
// anon/auth pattern in /api/evaluate: anon rows get an expires_at and are
// claimed via /api/assign-submission once the user signs in.
//
// Body: { declared_format: 'Feature film' | 'Series', title?: string }
// Returns: { submission_id: string }

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
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

const ALLOWED_FORMATS = new Set(['Feature film', 'Series'])

export async function POST(request: NextRequest) {
  let body: { declared_format?: string; title?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const declaredFormat = (body.declared_format ?? '').trim()
  if (!ALLOWED_FORMATS.has(declaredFormat)) {
    return NextResponse.json(
      { error: 'declared_format must be "Feature film" or "Series"' },
      { status: 400 }
    )
  }

  // Title is optional on draft creation — they can edit it later from the
  // dashboard. Default to a friendly placeholder so the row reads clean.
  const rawTitle = (body.title ?? '').trim()
  const title = rawTitle.length > 0 ? rawTitle.slice(0, 200) : 'Untitled draft'

  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  const serviceClient = createServiceClient()

  // Anon drafts get a 24-hour expires_at — longer than the 10-minute eval
  // window because the writer is mid-signup and may bounce through Google
  // OAuth, which can take longer than a quick email/password flow.
  const expiresAt = !user
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null

  // `filename` is NOT NULL on the table, even though there's no PDF yet for
  // a draft. Use a placeholder; the column gets overwritten when the writer
  // comes back and uploads.
  const { data: submission, error } = await serviceClient
    .from('script_submissions')
    .insert({
      user_id: user?.id ?? null,
      title,
      filename: '(awaiting upload)',
      status: 'awaiting_pdf',
      declared_format: declaredFormat,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    })
    .select('id')
    .single()

  if (error || !submission) {
    console.error('Draft submission insert error:', error)
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    )
  }

  return NextResponse.json({ submission_id: submission.id })
}
