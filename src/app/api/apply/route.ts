import { NextRequest, NextResponse } from 'next/server'

// POST /api/apply
//
// Industry partner application. Producers and reps fill the public form
// at /apply, we POST it here, and it fires a single email straight to
// Anuj. No DB write, no template — Anuj manually vets and sends an
// invite link to the ones he wants on the platform. Anuj 2026-04-28.
//
// Postmark is hit inline (no template) so this route has no dependency
// on a Postmark template existing in the dashboard.

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN!
const FROM_EMAIL = 'GEM Apply <anuj@gem.studio>'
const TO_EMAIL = 'anuj@gem.studio'

interface ApplyBody {
  full_name?: string
  company?: string
  role?: 'producer' | 'representative'
  imdb?: string
  phone?: string
  notes?: string
  email?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  let body: ApplyBody
  try {
    body = (await request.json()) as ApplyBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fullName = (body.full_name || '').trim()
  const company = (body.company || '').trim()
  const role = body.role
  const imdb = (body.imdb || '').trim()
  const phone = (body.phone || '').trim()
  const notes = (body.notes || '').trim()
  const email = (body.email || '').trim()

  if (!fullName || !company || !role || !email) {
    return NextResponse.json(
      { error: 'Name, company, role, and email are required.' },
      { status: 400 }
    )
  }
  if (role !== 'producer' && role !== 'representative') {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  }

  if (!POSTMARK_TOKEN) {
    console.error('[apply] POSTMARK_SERVER_TOKEN missing')
    return NextResponse.json({ error: 'Email is not configured.' }, { status: 500 })
  }

  const subject = `[GEM apply] ${fullName} · ${company} · ${role}`
  const lines: [string, string][] = [
    ['Name', fullName],
    ['Email', email],
    ['Company', company],
    ['Role', role],
    ['IMDb', imdb || '—'],
    ['Phone', phone || '—'],
  ]
  const textBody =
    lines.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nHow they want to work with writers:\n${notes || '—'}\n`
  const htmlBody = `
    <h2 style="font-family: Georgia, serif; font-size: 18px; margin: 0 0 14px;">New industry application</h2>
    <table style="font-family: -apple-system, sans-serif; font-size: 14px; border-collapse: collapse;">
      ${lines
        .map(
          ([k, v]) => `
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #666; vertical-align: top;"><strong>${escapeHtml(k)}</strong></td>
          <td style="padding: 4px 0;">${escapeHtml(v)}</td>
        </tr>
      `
        )
        .join('')}
    </table>
    <p style="margin: 18px 0 6px; font-size: 13px; color: #666;"><strong>How they want to work with writers</strong></p>
    <p style="font-family: -apple-system, sans-serif; font-size: 14px; white-space: pre-wrap; margin: 0;">${escapeHtml(notes || '—')}</p>
  `

  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: TO_EMAIL,
        ReplyTo: email,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: 'outbound',
        Tag: 'industry-apply',
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[apply] Postmark error', res.status, detail)
      return NextResponse.json({ error: 'Failed to send application.' }, { status: 500 })
    }
  } catch (err) {
    console.error('[apply] send error', err)
    return NextResponse.json({ error: 'Failed to send application.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
