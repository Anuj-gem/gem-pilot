import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: evaluationId } = await params
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

  // Toggle: check if already liked
  const { data: existing } = await supabase
    .from('script_likes')
    .select('id')
    .eq('evaluation_id', evaluationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Unlike
    await supabase
      .from('script_likes')
      .delete()
      .eq('id', existing.id)

    return NextResponse.json({ liked: false })
  } else {
    // Like
    const { error } = await supabase
      .from('script_likes')
      .insert({ evaluation_id: evaluationId, user_id: user.id })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ liked: true })
  }
}
