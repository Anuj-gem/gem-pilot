import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
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

  const body = await request.json()
  const is_public = Boolean(body.is_public)

  // Gate: publishing to Discover requires an active subscription.
  // Also blocks free users from publishing locked (2nd+) scripts.
  if (is_public) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_status !== 'active' && profile?.subscription_status !== 'trialing') {
      return NextResponse.json(
        { error: 'Upgrade to Pro to publish on Discover.' },
        { status: 403 }
      )
    }
  }

  // Update — RLS ensures only the owner can update
  const { data, error } = await supabase
    .from('script_submissions')
    .update({ is_public })
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .select('id, is_public')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
