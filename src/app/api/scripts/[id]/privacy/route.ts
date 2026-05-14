// PATCH /api/scripts/[id]/privacy
// Update report_privacy JSON (and optionally industry visibility) for a
// submission.
//
// Body shape (all fields optional, all atomic):
//   { privacy?: ReportPrivacy }       — full or partial privacy object
//   { show_score?: boolean }          — targeted score-visibility flip
//   { is_public?: boolean }           — master "published" toggle
//   { contact_enabled?: boolean }     — let producers email the writer
//   { allow_reviews?: boolean }       — GEM members may read + review (Anuj 2026-04-30 v0.10)
//   { allow_industry?: boolean }      — producers/reps may match + reach out (v0.10)
//
// When a caller sets `is_public`, we also write the matching `report_privacy`
// shape if not provided: unpublishing flips every section to private (so
// the writer's own pills reflect the state); publishing flips every section
// to public (default state). Owners always see their full report regardless.
//
// Writers can update any of their own submissions. No Pro gating — the
// publish-by-default model means anyone can hide / re-show their post.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  normalizePrivacy,
  SECTION_KEYS,
  type ReportPrivacy,
  type SectionKey,
  type Visibility,
} from '@/lib/report-privacy'

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

  // Admin override (Anuj 2026-04-28): anuj@gem.studio can flip any post's
  // privacy — used to take down problematic content while we sort out a
  // proper content-management surface. We promote the supabase client to
  // a service-role client when admin, so the existing user_id filters
  // below silently match any submission. Easier than rewriting all the
  // .eq('user_id', user.id) calls into branched queries.
  const isAdmin = user.email === 'anuj@gem.studio'
  const writeClient = isAdmin
    ? createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() {} } }
      )
    : supabase

  const body = await request.json().catch(() => ({}))
  const topLevelShowScore =
    typeof body?.show_score === 'boolean' ? body.show_score : undefined
  const isPublic =
    typeof body?.is_public === 'boolean' ? body.is_public : undefined
  const contactEnabled =
    typeof body?.contact_enabled === 'boolean' ? body.contact_enabled : undefined
  const allowReviews =
    typeof body?.allow_reviews === 'boolean' ? body.allow_reviews : undefined
  const allowIndustry =
    typeof body?.allow_industry === 'boolean' ? body.allow_industry : undefined
  const privacyProvided = body?.privacy !== undefined && body.privacy !== null

  // Start from whatever shape the caller sent (may be empty). If they
  // didn't send `privacy` at all, we'll preserve the row's existing
  // sections — small targeted flips (score-only, contact-only) shouldn't
  // wipe section choices.
  let privacy = privacyProvided
    ? normalizePrivacy(body.privacy)
    : ({ version: 1, sections: {} } as ReportPrivacy)

  // Targeted flips (show_score, is_public) without a `privacy` body need
  // the existing privacy state pulled in so we don't lose per-section
  // settings. Master is_public flips also need this so we can layer the
  // all-private / all-public default on top.
  if (
    !privacyProvided &&
    (topLevelShowScore !== undefined || isPublic !== undefined)
  ) {
    const existingQuery = writeClient
      .from('script_submissions')
      .select('report_privacy')
      .eq('id', submissionId)
    const { data: existing } = await (isAdmin
      ? existingQuery.single()
      : existingQuery.eq('user_id', user.id).single())
    privacy = normalizePrivacy(existing?.report_privacy)
  }

  // Gate: publishing requires Pro. Block non-active users from setting
  // is_public = true through this endpoint. Anuj 2026-05-02.
  if (isPublic === true && !isAdmin) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    if (callerProfile?.subscription_status !== 'active' && callerProfile?.subscription_status !== 'trialing') {
      return NextResponse.json(
        { error: 'Upgrade to Pro to publish on Discover.' },
        { status: 403 }
      )
    }
  }

  // Master "Published / Unpublished" toggle: when the caller flips
  // is_public, rewrite the entire privacy shape so the writer's pills +
  // score badge mirror the new state. Unpublish → all sections private +
  // score hidden. Publish → all sections public + score visible.
  if (isPublic !== undefined) {
    const visibility: Visibility = isPublic ? 'public' : 'private'
    const sectionsAll: Partial<Record<SectionKey, Visibility>> = {}
    for (const k of SECTION_KEYS) sectionsAll[k] = visibility
    privacy = {
      version: 1,
      sections: sectionsAll,
      show_score: isPublic,
    }
  }

  if (topLevelShowScore !== undefined) {
    privacy = { ...privacy, show_score: topLevelShowScore }
  }

  const update: Record<string, unknown> = {
    report_privacy: privacy,
    privacy_review_needed: false,
  }
  if (isPublic !== undefined) update.is_public = isPublic
  if (contactEnabled !== undefined) update.contact_enabled = contactEnabled
  if (allowReviews !== undefined) update.allow_reviews = allowReviews
  if (allowIndustry !== undefined) update.allow_industry = allowIndustry

  const updateQuery = writeClient
    .from('script_submissions')
    .update(update)
    .eq('id', submissionId)
  const { data, error } = await (isAdmin
    ? updateQuery
        .select(
          'id, report_privacy, contact_enabled, privacy_review_needed, is_public, allow_reviews, allow_industry'
        )
        .single()
    : updateQuery
        .eq('user_id', user.id)
        .select(
          'id, report_privacy, contact_enabled, privacy_review_needed, is_public, allow_reviews, allow_industry'
        )
        .single())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Propagation: if the writer just turned `allow_industry` off (or the
  // master is_public off), pull this script out of every active producer
  // inbox by stamping unmatched_at on the open script_matches rows.
  // Same pattern as /api/submissions/[id]/hide. Anuj 2026-04-30 v0.10.
  // Failures are swallowed — the privacy save already succeeded; the
  // matches just won't disappear until the next backfill / cron run.
  const shouldDepropagate = allowIndustry === false || isPublic === false
  if (shouldDepropagate) {
    try {
      await writeClient
        .from('script_matches')
        .update({
          unmatched_at: new Date().toISOString(),
          unmatched_by: 'writer',
          unmatch_reason: allowIndustry === false ? 'industry_access_off' : 'unpublished',
        })
        .eq('submission_id', submissionId)
        .is('unmatched_at', null)
    } catch (propagationErr) {
      console.error('[scripts/privacy] propagation failed:', propagationErr)
    }
  }

  return NextResponse.json(data)
}
