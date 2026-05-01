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

  // Open reviews (Anuj 2026-04-30 v0.7): any GEM member can review any
  // public, completed submission they don't own. The writer can hide
  // individual reviews from their report page; that's the safety valve.
  //
  // v0.10 (2026-04-30): also gate on `allow_reviews`. Writers can opt out
  // per-script from the triple-dot menu — when off we reject the submission
  // even if the script is otherwise public.
  const { data: subRow } = await supabase
    .from('script_submissions')
    .select('user_id, is_public, status, allow_reviews, hidden_at')
    .eq('id', submissionId)
    .single<{ user_id: string; is_public: boolean; status: string; allow_reviews: boolean | null; hidden_at: string | null }>()
  if (!subRow) return { error: 'Script not found.' }
  if (subRow.user_id === user.id) {
    return { error: "You can't review your own script." }
  }
  if (!subRow.is_public || subRow.status !== 'completed' || subRow.hidden_at) {
    return { error: 'This script is not open for community review.' }
  }
  if (subRow.allow_reviews === false) {
    return { error: 'The writer has turned off reviews for this script.' }
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

// Writer-side hide/unhide for reviews on their own scripts. The review
// stays in the database (and on the reviewer's profile) — it just
// disappears from the writer's report page AND stops contributing to
// review counts / "Most reviewed" sorting. That's the cost of hiding.
//
// Anuj 2026-04-30 v0.7.
interface HideInput { reviewId: string; hide: boolean }
export async function setReviewHidden({ reviewId, hide }: HideInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  // Look up the review + its submission to verify the caller owns the script.
  const { data: row } = await supabase
    .from('peer_reviews')
    .select('id, submission_id, script_submissions!inner ( user_id )')
    .eq('id', reviewId)
    .single<{ id: string; submission_id: string; script_submissions: { user_id: string } }>()
  if (!row) return { error: 'Review not found.' }
  if (row.script_submissions.user_id !== user.id) {
    return { error: 'Only the script owner can hide reviews.' }
  }

  const { error } = await supabase
    .from('peer_reviews')
    .update({ owner_hidden_at: hide ? new Date().toISOString() : null })
    .eq('id', reviewId)
  if (error) return { error: error.message }
  return { ok: true }
}
