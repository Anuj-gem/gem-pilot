import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const service = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )

  // Look up submission and verify ownership
  const { data: sub } = await service
    .from('script_submissions')
    .select('id, status, file_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (sub.status !== 'failed') {
    return NextResponse.json({ error: 'Only failed submissions can be retried' }, { status: 400 })
  }

  if (!sub.file_url) {
    return NextResponse.json({ error: 'No PDF on file' }, { status: 400 })
  }

  // Set status to processing
  await service
    .from('script_submissions')
    .update({ status: 'processing' })
    .eq('id', id)

  // Fire-and-forget: kick off score-submission
  const origin = request.nextUrl.origin
  fetch(`${origin}/api/score-submission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submission_id: id }),
  })

  return NextResponse.json({ retrying: true })
}
