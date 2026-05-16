import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Legacy PATCH — kept for backwards compat but now just does the same as DELETE
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleDelete(await params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleDelete(await params)
}

async function handleDelete({ id: submissionId }: { id: string }) {
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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role for cascading deletes
  const service = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )

  // Verify ownership
  const { data: sub } = await service
    .from('script_submissions')
    .select('id')
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete evaluation first (FK reference)
  await service
    .from('script_evaluations')
    .delete()
    .eq('submission_id', submissionId)

  // Delete consideration_scripts references
  await service
    .from('consideration_scripts')
    .delete()
    .eq('script_id', submissionId)

  // Delete the submission itself
  const { error } = await service
    .from('script_submissions')
    .delete()
    .eq('id', submissionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ deleted: true })
}
