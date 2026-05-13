// GET /api/unsubscribe?uid=xxx&sig=xxx
//
// Self-serve email unsubscribe. The link is HMAC-signed so users can't
// forge unsubscribe requests for other people. Returns a simple HTML page
// confirming the unsubscribe — no redirects, no login required.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifyUnsubscribeSignature } from '@/lib/email'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

function htmlResponse(title: string, message: string, status = 200) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — GEM</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fafafa; color: #111; }
    .card { max-width: 420px; padding: 40px; text-align: center; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    p { font-size: 15px; color: #666; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const uid = url.searchParams.get('uid')
  const sig = url.searchParams.get('sig')

  if (!uid || !sig) {
    return htmlResponse('Invalid link', 'This unsubscribe link is missing required parameters.', 400)
  }

  if (!verifyUnsubscribeSignature(uid, sig)) {
    return htmlResponse('Invalid link', 'This unsubscribe link is invalid or has expired.', 403)
  }

  const service = createServiceClient()

  const { error } = await service
    .from('profiles')
    .update({ email_unsubscribed: true })
    .eq('id', uid)

  if (error) {
    console.error('[unsubscribe] DB update failed:', error.message)
    return htmlResponse('Something went wrong', 'Please try again or email anuj@gem.studio to be removed.', 500)
  }

  console.log(`[unsubscribe] User ${uid} unsubscribed via self-serve link`)

  return htmlResponse(
    "You've been unsubscribed",
    "You won't receive any more emails from GEM. If you change your mind, you can update your preferences from your dashboard."
  )
}
