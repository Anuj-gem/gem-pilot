'use server'

// Server actions for invite-reviewer flow on the report page.
// Anuj 2026-04-29 (peer-reviews v0.2).

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { generateInviteToken, sendReviewInviteEmail } from '@/lib/review-invites'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

interface CreateInput {
  submissionId: string
  email: string
  note?: string | null
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

export async function createReviewInvite(input: CreateInput) {
  const email = (input.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  // Verify caller owns the submission
  const service = createServiceClient()
  const { data: submission } = await service
    .from('script_submissions')
    .select('id, user_id, title')
    .eq('id', input.submissionId)
    .single<{ id: string; user_id: string; title: string }>()
  if (!submission) return { error: 'Script not found.' }
  if (submission.user_id !== user.id) return { error: 'Not your script.' }

  // Don't allow inviting yourself
  if (user.email && user.email.toLowerCase() === email) {
    return { error: "You can't invite yourself." }
  }

  // Look for an existing pending or accepted invite
  const { data: existing } = await service
    .from('review_invites')
    .select('id, status, token')
    .eq('submission_id', input.submissionId)
    .ilike('invited_email', email)
    .in('status', ['pending', 'accepted'])
    .maybeSingle<{ id: string; status: string; token: string }>()

  let token: string
  let invite_id: string
  if (existing) {
    token = existing.token
    invite_id = existing.id
  } else {
    token = generateInviteToken()
    const { data: inserted, error: insErr } = await service
      .from('review_invites')
      .insert({
        submission_id: input.submissionId,
        invited_by: user.id,
        invited_email: email,
        token,
        note: input.note?.trim() || null,
      })
      .select('id')
      .single()
    if (insErr || !inserted) return { error: insErr?.message || 'Could not create invite.' }
    invite_id = inserted.id
  }

  // Inviter name = full_name or fallback to email local
  const { data: inviterProfile } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single<{ full_name: string | null }>()
  const inviterName =
    (inviterProfile?.full_name || '').trim() ||
    (user.email || '').split('@')[0] ||
    'A GEM writer'

  // Build invite URL using the request's origin
  const h = await headers()
  const origin =
    h.get('x-forwarded-host')
      ? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host')}`
      : (process.env.NEXT_PUBLIC_SITE_URL || 'https://gem.studio')
  const inviteUrl = `${origin}/review/invite/${token}`

  const send = await sendReviewInviteEmail({
    to: email,
    inviterName,
    scriptTitle: submission.title,
    inviteUrl,
    note: input.note ?? null,
  })

  if (!send.ok) {
    return { error: `Email send failed: ${send.error}` }
  }

  return { ok: true, invite_id }
}

interface CancelInput { inviteId: string }
export async function cancelReviewInvite({ inviteId }: CancelInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  const { error } = await supabase
    .from('review_invites')
    .delete()
    .eq('id', inviteId)
  if (error) return { error: error.message }
  return { ok: true }
}
