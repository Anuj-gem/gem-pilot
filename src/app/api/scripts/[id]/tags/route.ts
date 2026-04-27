// PATCH /api/scripts/[id]/tags — writer-editable tags for a script.
//
// Body: { tags: string[] }
// Auth: must be the script owner (RLS plus an explicit user_id check).
// Validation:
//   - lowercase, hyphenated (whitespace collapsed to single hyphens)
//   - max 30 characters per tag
//   - max 25 tags total
//   - empty / whitespace-only entries dropped
//   - duplicates collapsed (case-insensitive after normalization)
//
// Returns 200 with { id, tags } on success; 4xx on validation / auth errors.
//
// Note: tags are denormalized onto `script_submissions.tags` (text[]) so the
// producer-side filter UI can use the column's GIN index without a join.
// This route writes directly to that column.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const MAX_TAG_LEN = 30
const MAX_TAGS = 25

// Tag canonicalization. The v5.4 prompt emits lowercase-hyphenated tokens;
// writer edits should match. We:
//   - trim
//   - lowercase
//   - replace any run of whitespace / underscores / slashes with a single hyphen
//   - strip characters outside [a-z0-9-]
//   - collapse repeated hyphens
//   - trim leading/trailing hyphens
//   - cap length to MAX_TAG_LEN
function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TAG_LEN)
}

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
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            /* Server Component */
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const rawTags = (body as { tags?: unknown })?.tags
  if (!Array.isArray(rawTags)) {
    return NextResponse.json(
      { error: 'tags must be an array of strings.' },
      { status: 400 }
    )
  }

  // Normalize, drop empties, dedupe (preserving first-seen order), cap.
  const seen = new Set<string>()
  const tags: string[] = []
  for (const t of rawTags) {
    if (typeof t !== 'string') continue
    const norm = normalizeTag(t)
    if (!norm) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    tags.push(norm)
    if (tags.length >= MAX_TAGS) break
  }

  // Update — RLS plus an explicit user_id filter ensures only the owner
  // can write. PostgREST returns the updated row in the response.
  const { data, error } = await supabase
    .from('script_submissions')
    .update({ tags })
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .select('id, tags')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data) {
    return NextResponse.json(
      { error: 'Script not found or not yours.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ id: data.id, tags: data.tags ?? [] })
}
