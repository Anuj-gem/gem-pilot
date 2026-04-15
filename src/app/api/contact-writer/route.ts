// POST /api/contact-writer
// Stores a message from a signed-in viewer to the writer of a submission.
// Email delivery is deferred — the writer sees their inbox in-app for now.
//
// Gating:
//   - sender must be authenticated (signup is the upsell to reach writers)
//   - target writer's submission must be fully unlocked (owner is subscribed
//     OR the post is public), matching the Contact Writer button visibility
//   - sender cannot message themselves
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
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

export async function POST(request: NextRequest) {
  try {
    const auth = await createAuthClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to contact the writer.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const evaluationId = typeof body.evaluation_id === 'string' ? body.evaluation_id : null
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!evaluationId || message.length < 1) {
      return NextResponse.json(
        { error: 'Message is empty.' },
        { status: 400 }
      )
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long.' }, { status: 400 })
    }

    const service = createServiceClient()

    // Load evaluation + submission + owner profile for gating
    const { data: ev, error: evErr } = await service
      .from('script_evaluations')
      .select('id, submission_id, script_submissions(id, user_id, is_public, profiles(subscription_status))')
      .eq('id', evaluationId)
      .single()

    if (evErr || !ev) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 })
    }

    const sub = (ev as any).script_submissions
    const writerId: string | null = sub?.user_id ?? null
    if (!writerId) {
      return NextResponse.json({ error: 'This report has no writer to contact.' }, { status: 400 })
    }
    if (writerId === user.id) {
      return NextResponse.json({ error: 'You cannot contact yourself.' }, { status: 400 })
    }

    const ownerSubscribed = sub?.profiles?.subscription_status === 'active'
    const isPublic = sub?.is_public === true
    if (!ownerSubscribed && !isPublic) {
      return NextResponse.json(
        { error: 'This writer has not enabled inbound contact on this report.' },
        { status: 403 }
      )
    }

    // Fetch sender profile for name
    const { data: senderProfile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { error: insErr } = await service.from('contact_messages').insert({
      evaluation_id: evaluationId,
      submission_id: sub.id,
      writer_id: writerId,
      sender_id: user.id,
      sender_email: user.email ?? '',
      sender_name: senderProfile?.full_name ?? null,
      message,
    })

    if (insErr) {
      console.error('contact_messages insert failed:', insErr)
      return NextResponse.json({ error: 'Could not send message.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact-writer error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
