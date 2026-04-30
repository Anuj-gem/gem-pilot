// Server-side helpers for batched script community stats.
// Anuj 2026-04-29 v0.5.

import { createServerClient } from '@supabase/ssr'

export interface ScriptStats {
  reviewCount: number
  avgPeerScore: number | null  // null when reviewCount === 0
}

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/** For a batch of submission_ids, return a Map of stats keyed by submission_id.
 *  Missing entries default to { reviewCount: 0, avgPeerScore: null } at the
 *  caller's discretion. */
export async function getScriptStats(submissionIds: string[]): Promise<Map<string, ScriptStats>> {
  const out = new Map<string, ScriptStats>()
  if (submissionIds.length === 0) return out
  const service = svc()
  const { data: rows } = await service
    .from('peer_reviews')
    .select('submission_id, score')
    .in('submission_id', submissionIds)
    .is('deleted_at', null)
  const totals = new Map<string, { sum: number; n: number }>()
  for (const r of (rows as { submission_id: string; score: number }[] | null) || []) {
    const t = totals.get(r.submission_id) || { sum: 0, n: 0 }
    t.sum += r.score
    t.n += 1
    totals.set(r.submission_id, t)
  }
  for (const [id, { sum, n }] of totals) {
    out.set(id, { reviewCount: n, avgPeerScore: n > 0 ? sum / n : null })
  }
  // Backfill explicit zero rows for ids with no reviews
  for (const id of submissionIds) {
    if (!out.has(id)) out.set(id, { reviewCount: 0, avgPeerScore: null })
  }
  return out
}
