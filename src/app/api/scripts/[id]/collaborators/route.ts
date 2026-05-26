import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET — list collaborators for a script
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data, error } = await supabase
    .from('script_collaborators')
    .select('id, collaborator_email, collaborator_id, status, role, created_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Enrich with profile info for accepted collaborators
  const collaboratorIds = data
    .filter(c => c.collaborator_id)
    .map(c => c.collaborator_id!)

  let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
  if (collaboratorIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', collaboratorIds)

    if (profileRows) {
      profiles = Object.fromEntries(
        profileRows.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      )
    }
  }

  const enriched = data.map(c => ({
    ...c,
    profile: c.collaborator_id ? profiles[c.collaborator_id] ?? null : null,
  }))

  return NextResponse.json(enriched)
}

// POST — add a collaborator by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  // Auth check
  const anonSupabase = createServerClient(
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

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the user owns this script
  const { data: submission } = await supabase
    .from('script_submissions')
    .select('id, user_id')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your script' }, { status: 403 })
  }

  const body = await request.json()
  const email = (body.email || '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Can't add yourself
  if (email === user.email) {
    return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 })
  }

  // Check for duplicates
  const { data: existing } = await supabase
    .from('script_collaborators')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('collaborator_email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already invited' }, { status: 409 })
  }

  // Use auth admin to find user by email
  const { data: matchedUser } = await supabase
    .rpc('get_user_id_by_email', { email_input: email })
    .single() as { data: { id: string } | null }

  const collaboratorId = matchedUser?.id ?? null

  const { data: collab, error } = await supabase
    .from('script_collaborators')
    .insert({
      submission_id: submissionId,
      inviter_id: user.id,
      collaborator_id: collaboratorId,
      collaborator_email: email,
      status: 'pending',
      role: body.role || 'collaborator',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(collab)
}

// PATCH — accept or decline a collaboration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const anonSupabase = createServerClient(
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

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { collaborator_id: collabRowId, status } = body

  if (!['accepted', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Status must be accepted or declined' }, { status: 400 })
  }

  // Find the invitation — match by email or collaborator_id
  const { data: collab } = await supabase
    .from('script_collaborators')
    .select('id, collaborator_email, collaborator_id, status')
    .eq('submission_id', submissionId)
    .eq('id', collabRowId)
    .single()

  if (!collab) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  // Verify this user is the intended collaborator
  const userEmail = user.email?.toLowerCase()
  if (collab.collaborator_id !== user.id && collab.collaborator_email !== userEmail) {
    return NextResponse.json({ error: 'Not your invitation' }, { status: 403 })
  }

  const { data: updated, error } = await supabase
    .from('script_collaborators')
    .update({
      status,
      collaborator_id: user.id, // link the user if not already linked
    })
    .eq('id', collab.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(updated)
}
