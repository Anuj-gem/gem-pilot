// POST /api/evaluations/[id]/edit
//
// Writer-owned edit of the report top card. Accepts any subset of four fields —
// title, logline, genre_primary, genre_secondary, tone. Title is written in-place on
// script_submissions; the other three are merged into script_evaluations.edited_fields.
//
// Authorization: the authenticated user must own the script_submissions row
// linked to this evaluation. Service client bypasses RLS only after that check.
//
// Field semantics:
//   - Omitted key      → leave the current edited value untouched
//   - Empty string     → clear that edit (falls back to the generated value)
//   - Non-empty string → set / overwrite that edit
//   - genre_secondary: array (max 2 entries) of locked-vocab genres; empty
//     array clears the override. New canonical key.
//   - genre_tags: legacy alias still accepted on input for backward compat;
//     internally written into edited_fields.genre_secondary so reads stay clean.
//     The client always sends `genre_tags: []` alongside a write to clear any
//     stale legacy override left over from pre-v5.4 edits.
//
// Revert-all: send { revert: true } to null out edited_fields entirely.
//
// Logline has a soft 22-word cap that's echoed on the client; this route
// accepts anything but rejects absurd sizes (>500 chars) to keep the column
// tidy.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EditedFields } from '@/lib/edited-fields'

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

const MAX_STR = 500
const MAX_SECONDARY_GENRES = 2

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evaluationId } = await context.params
    if (!evaluationId || typeof evaluationId !== 'string') {
      return NextResponse.json({ error: 'Missing evaluation id.' }, { status: 400 })
    }

    // 1. Authn
    const auth = await createAuthClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to edit your report.' }, { status: 401 })
    }

    // 2. Parse
    const body = await request.json().catch(() => ({}))
    const revert = body?.revert === true

    // 3. Authz — confirm the evaluation belongs to a submission owned by the user
    const svc = createServiceClient()
    const { data: evalRow, error: evalErr } = await svc
      .from('script_evaluations')
      .select('id, submission_id, edited_fields, script_submissions!inner(id, user_id, title)')
      .eq('id', evaluationId)
      .single()

    if (evalErr || !evalRow) {
      return NextResponse.json({ error: 'Evaluation not found.' }, { status: 404 })
    }
    const submission = Array.isArray((evalRow as any).script_submissions)
      ? (evalRow as any).script_submissions[0]
      : (evalRow as any).script_submissions
    if (!submission || submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your report.' }, { status: 403 })
    }

    // 4. Revert-all shortcut
    if (revert) {
      const { error: revertEvalErr } = await svc
        .from('script_evaluations')
        .update({ edited_fields: null })
        .eq('id', evaluationId)
      if (revertEvalErr) {
        return NextResponse.json({ error: revertEvalErr.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, reverted: true })
    }

    // 5. Validate + merge
    const current: EditedFields = (evalRow as any).edited_fields ?? {}
    const next: EditedFields = { ...current }

    const stringField = (key: 'logline' | 'genre_primary' | 'tone') => {
      if (!(key in body)) return null // not provided
      const v = body[key]
      if (v === null || v === undefined) return 'clear'
      if (typeof v !== 'string') return 'invalid'
      const trimmed = v.trim()
      if (trimmed.length === 0) return 'clear'
      if (trimmed.length > MAX_STR) return 'too-long'
      return trimmed
    }

    for (const key of ['logline', 'genre_primary', 'tone'] as const) {
      const out = stringField(key)
      if (out === 'invalid' || out === 'too-long') {
        return NextResponse.json(
          { error: `${key} is ${out === 'invalid' ? 'invalid' : 'too long'}.` },
          { status: 400 }
        )
      }
      if (out === 'clear') {
        delete next[key]
      } else if (out !== null) {
        next[key] = out
      }
    }

    // Secondary genres — accept either the canonical `genre_secondary` key
    // (v5.4 onward) or the legacy `genre_tags` key (older clients / scripts).
    // Both paths write into edited_fields.genre_secondary; we also clear the
    // legacy `genre_tags` slot whenever we see EITHER key in the body, so
    // pre-v5.4 overrides can't keep bleeding through after a save.
    const secondaryKeyInBody = 'genre_secondary' in body || 'genre_tags' in body
    if (secondaryKeyInBody) {
      // Prefer the canonical key when both are present.
      const raw = 'genre_secondary' in body ? body.genre_secondary : body.genre_tags
      const sourceKey = 'genre_secondary' in body ? 'genre_secondary' : 'genre_tags'
      if (raw === null || raw === undefined || (Array.isArray(raw) && raw.length === 0)) {
        delete next.genre_secondary
        delete next.genre_tags
      } else if (
        !Array.isArray(raw) ||
        !raw.every((t) => typeof t === 'string' && t.trim().length > 0 && t.length <= MAX_STR)
      ) {
        return NextResponse.json(
          { error: `${sourceKey} must be an array of strings.` },
          { status: 400 }
        )
      } else if (raw.length > MAX_SECONDARY_GENRES) {
        return NextResponse.json(
          { error: `${sourceKey} accepts up to ${MAX_SECONDARY_GENRES} entries.` },
          { status: 400 }
        )
      } else {
        next.genre_secondary = raw.map((t: string) => t.trim())
        delete next.genre_tags
      }
    }

    // 5b. Characters — optional array of {name, hook, demographics, role_type}
    if ('characters' in body) {
      const raw = body.characters
      if (raw === null || raw === undefined || (Array.isArray(raw) && raw.length === 0)) {
        delete (next as any).characters
      } else if (
        !Array.isArray(raw) ||
        !raw.every(
          (c: any) =>
            typeof c === 'object' &&
            typeof c.name === 'string' &&
            typeof c.hook === 'string' &&
            typeof c.demographics === 'string' &&
            typeof c.role_type === 'string' &&
            c.name.length <= MAX_STR &&
            c.hook.length <= MAX_STR &&
            c.demographics.length <= MAX_STR
        )
      ) {
        return NextResponse.json(
          { error: 'characters must be an array of {name, hook, demographics, role_type}.' },
          { status: 400 }
        )
      } else if (raw.length > 20) {
        return NextResponse.json(
          { error: 'Too many characters (max 20).' },
          { status: 400 }
        )
      } else {
        ;(next as any).characters = raw.map((c: any) => ({
          name: c.name.trim(),
          hook: c.hook.trim(),
          demographics: c.demographics.trim(),
          role_type: c.role_type.trim(),
        }))
      }
    }

    // 6. Title (separate table) — optional
    let titleChanged = false
    if ('title' in body) {
      const raw = body.title
      if (typeof raw !== 'string') {
        return NextResponse.json({ error: 'title must be a string.' }, { status: 400 })
      }
      const t = raw.trim()
      if (t.length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty.' }, { status: 400 })
      }
      if (t.length > 200) {
        return NextResponse.json({ error: 'Title is too long.' }, { status: 400 })
      }
      if (t !== submission.title) {
        const { error: titleErr } = await svc
          .from('script_submissions')
          .update({ title: t })
          .eq('id', submission.id)
        if (titleErr) {
          return NextResponse.json({ error: titleErr.message }, { status: 500 })
        }
        titleChanged = true
      }
    }

    // 7. Persist edited_fields (null out if the object emptied)
    const nextIsEmpty = Object.keys(next).length === 0
    const { error: updErr } = await svc
      .from('script_evaluations')
      .update({ edited_fields: nextIsEmpty ? null : next })
      .eq('id', evaluationId)
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      titleChanged,
      edited_fields: nextIsEmpty ? null : next,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
