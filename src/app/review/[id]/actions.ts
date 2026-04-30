'use server'

// Server actions for /review/[id].
// submitReview — insert or update the calling user's Review on a script.
// deleteReview — soft-delete (sets deleted_at).

import { createClient } from '@/lib/supabase-server'

interface SubmitInput {
  submissionId: string
  score: number
  body: string
  suggestion: string | null
}

export async function submitReview(input: SubmitInput) {
  const { submissionId, score, body, suggestion } = input

  if (!Number.isInteger(score) || score < 0 || score > 100) {
    return { error: 'Score must be an integer between 0 and 100.' }
  }
  if (!body || !body.trim()) {
    return { error: 'Review body is required.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  // Reviewer gate — global is_reviewer OR accepted invite for this script.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_reviewer')
    .eq('id', user.id)
    .single<{ is_reviewer: boolean }>()
  let allowed = !!profile?.is_reviewer
  if (!allowed) {
    const { data: invite } = await supabase
      .from('review_invites')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('invited_user_id', user.id)
      .in('status', ['accepted', 'completed'])
      .maybeSingle<{ id: string }>()
    allowed = !!invite
  }
  if (!allowed) {
    return { error: 'You do not have reviewer permissions for this script.' }
  }

  // Upsert: one active review per (submission_id, reviewer_id)
  const { data: existing } = await supabase
    .from('peer_reviews')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('reviewer_id', user.id)
    .is('deleted_at', null)
    .maybeSingle<{ id: string }>()

  if (existing) {
    const { error } = await supabase
      .from('peer_reviews')
      .update({ score, body, suggestion })
      .eq('id', existing.id)
    if (error) return { error: error.message }
    return { ok: true, id: existing.id, action: 'updated' as const }
  }

  const { data: inserted, error } = await supabase
    .from('peer_reviews')
    .insert({
      submission_id: submissionId,
      reviewer_id: user.id,
      score,
      body,
      suggestion,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { ok: true, id: inserted.id, action: 'created' as const }
}

interface DeleteInput { reviewId: string }
export async function deleteReview({ reviewId }: DeleteInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  const { error } = await supabase
    .from('peer_reviews')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('reviewer_id', user.id)
  if (error) return { error: error.message }
  return { ok: true }
}
