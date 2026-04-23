// POST /api/contact-writer
//
// Inbound contact request from a viewer → Anuj's admin inbox.
//
// Flow:
//   1. Sender must be signed in (signup is the soft gate to reach writers).
//   2. Writer must have contact_enabled on this submission.
//   3. Insert into contact_messages (Anuj reads these via admin).
//   4. Fire an email to anuj@gem.studio (admin notification) so Anuj can
//      broker the connection manually — "do you want to accept this?" to
//      the writer, then forward to the sender if yes.
//
// Deliberately NO direct-to-writer email yet. Anuj wants to sit in the
// middle as a matchmaker until the product version of this is built.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'anuj@gem.studio'
const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN

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

async function sendAdminNotification(args: {
  senderName: string | null
  senderEmail: string
  writerName: string | null
  writerEmail: string | null
  evaluationId: string
  submissionTitle: string | null
  message: string
}) {
  if (!POSTMARK_TOKEN) {
    console.warn('[contact-writer] POSTMARK_SERVER_TOKEN missing — skipping admin email')
    return
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gem-pilot.vercel.app'
  const reportUrl = `${baseUrl}/report/${args.evaluationId}`
  const subject = `New contact request: ${args.submissionTitle || 'Untitled'} — from ${args.senderName || args.senderEmail}`
  const body = [
    `Sender: ${args.senderName || '(no name)'} <${args.senderEmail}>`,
    `Writer: ${args.writerName || '(no name)'} <${args.writerEmail || '(no email)'}>`,
    `Script:  ${args.submissionTitle || '(untitled)'}`,
    `Report:  ${reportUrl}`,
    '',
    '--- Message ---',
    args.message,
    '---',
    '',
    'Reply to the sender directly to broker the connection, or loop in the writer with consent.',
  ].join('\n')

  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: 'GEM Contact <anuj@gem.studio>',
        To: ADMIN_EMAIL,
        ReplyTo: args.senderEmail,
        Subject: subject,
        TextBody: body,
        MessageStream: 'outbound',
        Tag: 'contact_writer_admin',
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      console.error('[contact-writer] Postmark error:', json)
    }
  } catch (err) {
    console.error('[contact-writer] admin email send failed:', err)
  }
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
    if (!evaluationId || message.length < 10) {
      return NextResponse.json(
        { error: 'Please write at least a short message (10+ characters).' },
        { status: 400 }
      )
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long.' }, { status: 400 })
    }

    const service = createServiceClient()

    // Load evaluation + submission + writer profile for gating + email content.
    const { data: ev, error: evErr } = await service
      .from('script_evaluations')
      .select('id, submission_id, script_submissions(id, user_id, title, is_public, contact_enabled, profiles(full_name))')
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

    // In the new privacy model: contact is gated by the submission's
    // contact_enabled flag (default true on publish) + is_public (viewer only
    // landed on the report via a share link, which implies the writer meant
    // for it to be reachable). We drop the old "writer must be Pro" gate —
    // Anuj's plan is to route contact through him for now regardless of
    // writer tier, and upgrade gating can come back when the product version
    // of this ships.
    const contactEnabled = sub?.contact_enabled !== false
    const isPublic = sub?.is_public === true
    if (!isPublic || !contactEnabled) {
      return NextResponse.json(
        { error: 'This writer has not enabled inbound contact on this report.' },
        { status: 403 }
      )
    }

    // Fetch sender profile for name + writer's email for admin context.
    const [{ data: senderProfile }, { data: writerAuth }] = await Promise.all([
      service.from('profiles').select('full_name').eq('id', user.id).single(),
      service.auth.admin.getUserById(writerId).catch(() => ({ data: null })),
    ])

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

    // Fire the admin notification email. Don't block the response on it —
    // the DB insert is the source of truth.
    void sendAdminNotification({
      senderName: senderProfile?.full_name ?? null,
      senderEmail: user.email ?? '(no email)',
      writerName: sub?.profiles?.full_name ?? null,
      writerEmail: (writerAuth as any)?.data?.user?.email ?? null,
      evaluationId,
      submissionTitle: sub?.title ?? null,
      message,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact-writer error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
