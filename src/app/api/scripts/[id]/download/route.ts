// PDF download route. Two query params:
//   ?type=pitch         — pitch sections only (Pro)
//   ?type=full          — everything (Pro)
// Free writers always get the 'free' scope (only the unblurred pieces — top
// card + bullet 01 of Why this is a hit + Primary Lever) regardless of the
// requested type. Mirrors the on-screen paywall blur exactly.
//
// :id in the route is the script_evaluations.id (eval_id), matching how the
// rest of the app addresses reports.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateReportPdf, type PdfScope } from '@/lib/report-pdf'

export const runtime = 'nodejs'
export const maxDuration = 30

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const requested = (request.nextUrl.searchParams.get('type') || 'pitch').toLowerCase()
  if (requested !== 'pitch' && requested !== 'full') {
    return NextResponse.json({ error: 'Invalid type — use pitch or full' }, { status: 400 })
  }

  // 1. Auth — must be logged in
  const auth = await createAuthClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to download' }, { status: 401 })
  }

  // 2. Load eval + submission + owner profile
  const sb = createServiceClient()
  const { data: evalRow, error: evalErr } = await sb
    .from('script_evaluations')
    .select(`
      id, evaluation, edited_fields,
      script_submissions ( id, user_id, title, declared_format, created_at, profiles ( full_name ) )
    `)
    .eq('id', id)
    .maybeSingle()
  if (evalErr || !evalRow) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }
  const submission = (evalRow as any).script_submissions
  if (!submission) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // 3. Owner-only — admin can also download for support purposes
  const isAdmin = user.email === 'anuj@gem.studio'
  if (submission.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Not your report' }, { status: 403 })
  }

  // 4. Resolve subscription status (admin treated as Pro)
  let isSubscribed = isAdmin
  if (!isSubscribed && submission.user_id) {
    const { data: profile } = await sb
      .from('profiles')
      .select('subscription_status')
      .eq('id', submission.user_id)
      .maybeSingle()
    isSubscribed = profile?.subscription_status === 'active'
  }

  // 5. Pick scope. Free writers ALWAYS get 'free' regardless of requested type.
  const scope: PdfScope = isSubscribed ? (requested as 'pitch' | 'full') : 'free'

  // 6. Apply edited_fields overrides (writer-edited title/headline/etc.) so
  //    the PDF reflects what they actually see + share, not the raw model output.
  const baseEval = (evalRow as any).evaluation || {}
  const edited = (evalRow as any).edited_fields || null
  const evaluation = applyEdits(baseEval, edited)
  const titleToShow = (edited?.title?.trim() || submission.title || 'Untitled').trim()

  // 7. Generate
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateReportPdf({
      title: titleToShow,
      authorName: submission.profiles?.full_name ?? null,
      declaredFormat: submission.declared_format ?? null,
      postedAt: submission.created_at ?? null,
      evaluation,
      scope,
    })
  } catch (e: any) {
    console.error('[download] PDF generation failed:', e?.message, e?.stack)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  // Filename pattern: "GEM Report - <Title> (<Scope>).pdf"
  // Quoted in Content-Disposition so spaces are preserved; sanitized to
  // strip filesystem-unsafe characters (colons, slashes, etc.).
  const scopeLabel = scope === 'free' ? 'Teaser' : scope === 'full' ? 'Full' : 'Pitch'
  const cleanTitle = sanitizeFilenameSegment(titleToShow)
  const safeFilename = `GEM Report - ${cleanTitle} (${scopeLabel}).pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // Both filename= (legacy) and filename*= (RFC 5987 UTF-8) — the latter
      // covers titles with non-ASCII characters that the legacy form mangles.
      'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}

// Merge writer edits over the raw eval. Same fields editable-top-card.tsx
// touches: title, logline (positioning_hook), genre_primary, genre_tags, tone.
function applyEdits(evaluation: any, edited: any | null) {
  if (!edited) return evaluation
  const out = { ...evaluation }
  out.classification = { ...(evaluation.classification || {}) }
  if (edited.logline) out.positioning_hook = edited.logline
  if (edited.genre_primary) out.classification.genre_primary = edited.genre_primary
  if (Array.isArray(edited.genre_tags)) out.classification.genre_tags = edited.genre_tags
  if (edited.tone) out.classification.tone = edited.tone
  return out
}

// Used for the Title segment inside the filename. Allows spaces (so the
// final filename reads naturally) but strips characters that break filesystems
// — slashes, colons, asterisks, quotes, angle brackets, pipes, control chars.
function sanitizeFilenameSegment(s: string): string {
  const cleaned = s
    .normalize('NFKD')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || 'Untitled'
}
