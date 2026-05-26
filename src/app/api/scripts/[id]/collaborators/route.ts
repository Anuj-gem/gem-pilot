import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const VALID_ROLES = ['producer', 'talent_representative', 'actor', 'director', 'other'] as const

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function makeAnonClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

// GET — list collaborators for a script
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const supabase = makeServiceClient()

  const { data, error } = await supabase
    .from('script_collaborators')
    .select('id, collaborator_email, collaborator_id, status, role, role_other, created_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Enrich with profile info
  const collaboratorIds = data
    .filter(c => c.collaborator_id)
    .map(c => c.collaborator_id!)

  let profiles: Record<string, { full_name: string | null; avatar_url: string | null; headline: string | null }> = {}
  if (collaboratorIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline')
      .in('id', collaboratorIds)

    if (profileRows) {
      profiles = Object.fromEntries(
        profileRows.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url, headline: (p as any).headline ?? null }])
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
  const supabase = makeServiceClient()
  const anonSupabase = makeAnonClient(cookieStore)

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
  const role = VALID_ROLES.includes(body.role) ? body.role : 'other'
  const roleOther = role === 'other' ? (body.role_other || '').trim().slice(0, 60) : null

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

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
      role,
      role_other: roleOther,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(collab)
}

// PATCH — accept/decline OR edit role (owner)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const supabase = makeServiceClient()
  const anonSupabase = makeAnonClient(cookieStore)

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { collaborator_id: collabRowId, status, role, role_other } = body

  // Find the collab row
  const { data: collab } = await supabase
    .from('script_collaborators')
    .select('id, collaborator_email, collaborator_id, status, submission_id')
    .eq('submission_id', submissionId)
    .eq('id', collabRowId)
    .single()

  if (!collab) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // If status change (accept/decline) — must be the collaborator
  if (status) {
    if (!['accepted', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Status must be accepted or declined' }, { status: 400 })
    }
    const userEmail = user.email?.toLowerCase()
    if (collab.collaborator_id !== user.id && collab.collaborator_email !== userEmail) {
      return NextResponse.json({ error: 'Not your invitation' }, { status: 403 })
    }

    const { data: updated, error } = await supabase
      .from('script_collaborators')
      .update({ status, collaborator_id: user.id })
      .eq('id', collab.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(updated)
  }

  // If role change — must be the script owner
  if (role) {
    const { data: submission } = await supabase
      .from('script_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single()

    if (!submission || submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the owner can edit roles' }, { status: 403 })
    }

    const safeRole = VALID_ROLES.includes(role) ? role : 'other'
    const safeOther = safeRole === 'other' ? (role_other || '').trim().slice(0, 60) : null

    const { data: updated, error } = await supabase
      .from('script_collaborators')
      .update({ role: safeRole, role_other: safeOther })
      .eq('id', collab.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}

// DELETE — owner removes a collaborator, or collaborator removes themselves
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const supabase = makeServiceClient()
  const anonSupabase = makeAnonClient(cookieStore)

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const collabRowId = searchParams.get('collabId')
  if (!collabRowId) {
    return NextResponse.json({ error: 'collabId required' }, { status: 400 })
  }

  const { data: collab } = await supabase
    .from('script_collaborators')
    .select('id, collaborator_email, collaborator_id, submission_id')
    .eq('submission_id', submissionId)
    .eq('id', collabRowId)
    .single()

  if (!collab) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check: is caller the script owner OR the collaborator themselves?
  const { data: submission } = await supabase
    .from('script_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single()

  const isScriptOwner = submission?.user_id === user.id
  const userEmail = user.email?.toLowerCase()
  const isSelf = collab.collaborator_id === user.id || collab.collaborator_email === userEmail

  if (!isScriptOwner && !isSelf) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { error } = await supabase
    .from('script_collaborators')
    .delete()
    .eq('id', collab.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
