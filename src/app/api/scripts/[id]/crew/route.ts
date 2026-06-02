import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_CREW_ROLES = ['Producer', 'Director', 'Editor', 'DP']

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

// GET — list crew/cast roles for a script (public)
// Query params: ?category=crew|cast&characters=Name1,Name2 (for cast auto-seeding)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const supabase = makeServiceClient()
  const url = new URL(_request.url)
  const category = url.searchParams.get('category') || 'crew'
  const characterNames = url.searchParams.get('characters')?.split(',').filter(Boolean) || []

  const { data: roles, error } = await supabase
    .from('project_crew_roles')
    .select('id, role_name, assigned_user_id, collaborator_row_id, sort_order, role_category, created_at')
    .eq('submission_id', submissionId)
    .eq('role_category', category)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // If no roles exist, seed defaults for the owner
  if (!roles || roles.length === 0) {
    const cookieStore = await cookies()
    const anonSupabase = makeAnonClient(cookieStore)
    const { data: { user } } = await anonSupabase.auth.getUser()

    // Check if current user is the owner
    const { data: submission } = await supabase
      .from('script_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single()

    if (submission && user && submission.user_id === user.id) {
      // Seed default roles based on category
      const defaultNames = category === 'cast' ? characterNames : DEFAULT_CREW_ROLES
      if (defaultNames.length > 0) {
        const inserts = defaultNames.map((name, i) => ({
          submission_id: submissionId,
          role_name: name,
          role_category: category,
          sort_order: i,
        }))

        const { data: seeded } = await supabase
          .from('project_crew_roles')
          .insert(inserts)
          .select('id, role_name, assigned_user_id, collaborator_row_id, sort_order, role_category, created_at')

        if (seeded) {
          return NextResponse.json(seeded.map(r => ({ ...r, profile: null, collaborator: null })))
        }
      }
    }

    return NextResponse.json([])
  }

  // Enrich assigned users with profile info
  const userIds = roles.filter(r => r.assigned_user_id).map(r => r.assigned_user_id!)
  let profiles: Record<string, { full_name: string | null; avatar_url: string | null; headline: string | null }> = {}

  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline')
      .in('id', userIds)

    if (profileRows) {
      profiles = Object.fromEntries(
        profileRows.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url, headline: (p as any).headline ?? null }])
      )
    }
  }

  // Also enrich from collaborator rows if linked
  const collabIds = roles.filter(r => r.collaborator_row_id).map(r => r.collaborator_row_id!)
  let collabProfiles: Record<string, { email: string; profile: any; status: string }> = {}

  if (collabIds.length > 0) {
    const { data: collabRows } = await supabase
      .from('script_collaborators')
      .select('id, collaborator_email, collaborator_id, status')
      .in('id', collabIds)

    if (collabRows) {
      // Get profiles for collaborators who have accounts
      const collabUserIds = collabRows.filter(c => c.collaborator_id).map(c => c.collaborator_id!)
      let cProfiles: Record<string, any> = {}
      if (collabUserIds.length > 0) {
        const { data: cRows } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, headline')
          .in('id', collabUserIds)
        if (cRows) {
          cProfiles = Object.fromEntries(cRows.map(p => [p.id, p]))
        }
      }

      for (const c of collabRows) {
        collabProfiles[c.id] = {
          email: c.collaborator_email,
          profile: c.collaborator_id ? cProfiles[c.collaborator_id] ?? null : null,
          status: c.status,
        }
      }
    }
  }

  const enriched = roles.map(r => ({
    ...r,
    profile: r.assigned_user_id ? profiles[r.assigned_user_id] ?? null : null,
    collaborator: r.collaborator_row_id ? collabProfiles[r.collaborator_row_id] ?? null : null,
  }))

  return NextResponse.json(enriched)
}

// POST — add a new crew role (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const supabase = makeServiceClient()
  const anonSupabase = makeAnonClient(cookieStore)

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: submission } = await supabase
    .from('script_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your script' }, { status: 403 })
  }

  const body = await request.json()
  const roleName = (body.role_name || '').trim().slice(0, 60)
  const roleCategory = body.role_category || 'crew'
  if (!roleName) {
    return NextResponse.json({ error: 'Role name required' }, { status: 400 })
  }

  // Get next sort order within the same category
  const { data: existing } = await supabase
    .from('project_crew_roles')
    .select('sort_order')
    .eq('submission_id', submissionId)
    .eq('role_category', roleCategory)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data: role, error } = await supabase
    .from('project_crew_roles')
    .insert({
      submission_id: submissionId,
      role_name: roleName,
      role_category: roleCategory,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(role)
}

// PATCH — self-assign, unassign, or rename a role (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const supabase = makeServiceClient()
  const anonSupabase = makeAnonClient(cookieStore)

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: submission } = await supabase
    .from('script_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your script' }, { status: 403 })
  }

  const body = await request.json()
  const { role_id, action, role_name } = body

  if (!role_id) return NextResponse.json({ error: 'role_id required' }, { status: 400 })

  // Verify role belongs to this submission
  const { data: role } = await supabase
    .from('project_crew_roles')
    .select('id, submission_id')
    .eq('id', role_id)
    .eq('submission_id', submissionId)
    .single()

  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  if (action === 'self_assign') {
    const { data: updated, error } = await supabase
      .from('project_crew_roles')
      .update({ assigned_user_id: user.id, collaborator_row_id: null })
      .eq('id', role_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(updated)
  }

  if (action === 'unassign') {
    const { data: updated, error } = await supabase
      .from('project_crew_roles')
      .update({ assigned_user_id: null, collaborator_row_id: null })
      .eq('id', role_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(updated)
  }

  if (action === 'link_collaborator') {
    // Link a crew role to an existing collaborator row
    const { collaborator_row_id } = body
    if (!collaborator_row_id) return NextResponse.json({ error: 'collaborator_row_id required' }, { status: 400 })

    const { data: updated, error } = await supabase
      .from('project_crew_roles')
      .update({ collaborator_row_id, assigned_user_id: null })
      .eq('id', role_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(updated)
  }

  if (role_name) {
    // Rename
    const { data: updated, error } = await supabase
      .from('project_crew_roles')
      .update({ role_name: role_name.trim().slice(0, 60) })
      .eq('id', role_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}

// DELETE — remove a crew role (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const supabase = makeServiceClient()
  const anonSupabase = makeAnonClient(cookieStore)

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: submission } = await supabase
    .from('script_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your script' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get('roleId')
  if (!roleId) return NextResponse.json({ error: 'roleId required' }, { status: 400 })

  const { error } = await supabase
    .from('project_crew_roles')
    .delete()
    .eq('id', roleId)
    .eq('submission_id', submissionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
