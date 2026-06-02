import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

// GET — list all backers for a script (self-added + invited + opportunity-flow)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const supabase = makeServiceClient()

  // 1. Get self-added / invited backers from project_backers
  const { data: directBackers } = await supabase
    .from('project_backers')
    .select('id, user_id, email, name, amount, status, created_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  // Resolve profiles for user_id backers
  const userIds = (directBackers || []).filter(b => b.user_id).map(b => b.user_id!)
  let profileMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline')
      .in('id', userIds)
    if (profiles) {
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
    }
  }

  const selfAndInvited = (directBackers || []).map(b => {
    const profile = b.user_id ? profileMap[b.user_id] : null
    return {
      id: b.id,
      source: 'direct' as const,
      amount: b.amount,
      status: b.status,
      name: profile?.full_name || b.name || b.email || 'Backer',
      avatar_url: profile?.avatar_url || null,
      email: b.email,
      user_id: b.user_id,
      created_at: b.created_at,
    }
  })

  // 2. Get opportunity-flow backers (from considerations)
  const { data: links } = await supabase
    .from('consideration_scripts')
    .select('consideration_id')
    .eq('script_submission_id', submissionId)

  let opportunityBackers: any[] = []
  if (links && links.length > 0) {
    const conIds = links.map(l => l.consideration_id)
    const { data: considerations } = await supabase
      .from('considerations')
      .select('id, opportunity_id, backing_status, backing_amount')
      .in('id', conIds)
      .in('backing_status', ['following', 'attached'])

    if (considerations && considerations.length > 0) {
      const oppIds = [...new Set(considerations.map(c => c.opportunity_id))]
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('id, title, owner_id')
        .in('id', oppIds)

      const oppMap: Record<string, any> = {}
      if (opportunities) {
        for (const o of opportunities) oppMap[o.id] = o
      }

      const ownerIds = [...new Set((opportunities || []).map(o => o.owner_id).filter(Boolean))]
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, headline')
          .in('id', ownerIds)
        if (profiles) {
          for (const p of profiles) profileMap[p.id] = p
        }
      }

      opportunityBackers = considerations.map(c => {
        const opp = oppMap[c.opportunity_id]
        const owner = opp?.owner_id ? profileMap[opp.owner_id] : null
        return {
          id: `opp-${c.id}`,
          source: 'opportunity' as const,
          amount: c.backing_amount || 0,
          status: c.backing_status === 'attached' ? 'confirmed' : 'considering',
          name: owner?.full_name || 'Investor',
          avatar_url: owner?.avatar_url || null,
          email: null,
          user_id: opp?.owner_id || null,
          opportunity_title: opp?.title || null,
          created_at: null,
        }
      })
    }
  }

  return NextResponse.json({
    direct: selfAndInvited,
    opportunity: opportunityBackers,
  })
}

// POST — add self as backer or invite someone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const anonClient = makeAnonClient(cookieStore)
  const { data: { user } } = await anonClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = makeServiceClient()

  // Verify ownership
  const { data: submission } = await supabase
    .from('script_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { action, amount, email, name } = body

  if (action === 'add_self') {
    // Check not already self-backed
    const { data: existing } = await supabase
      .from('project_backers')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('user_id', user.id)
      .limit(1)

    if (existing && existing.length > 0) {
      // Update amount instead
      await supabase
        .from('project_backers')
        .update({ amount: amount || 0 })
        .eq('id', existing[0].id)
      return NextResponse.json({ id: existing[0].id, updated: true })
    }

    const { data: inserted, error } = await supabase
      .from('project_backers')
      .insert({
        submission_id: submissionId,
        user_id: user.id,
        amount: amount || 0,
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: inserted.id })
  }

  if (action === 'invite') {
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const { data: inserted, error } = await supabase
      .from('project_backers')
      .insert({
        submission_id: submissionId,
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        amount: amount || 0,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: inserted.id })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// DELETE — remove a backer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()
  const anonClient = makeAnonClient(cookieStore)
  const { data: { user } } = await anonClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = makeServiceClient()

  // Verify ownership
  const { data: submission } = await supabase
    .from('script_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const url = new URL(request.url)
  const backerId = url.searchParams.get('backerId')
  if (!backerId) {
    return NextResponse.json({ error: 'backerId required' }, { status: 400 })
  }

  await supabase
    .from('project_backers')
    .delete()
    .eq('id', backerId)
    .eq('submission_id', submissionId)

  return NextResponse.json({ ok: true })
}
