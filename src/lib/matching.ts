// Matching engine — Selznick-4 producer-side push.
//
// Given a freshly scored submission, find producers whose declared lane
// (genres, format, budget tier) is compatible with the script and create
// `script_matches` rows so they show up on the producer dashboard.
//
// V1 predicate is intentionally forgiving:
//   - Genre: ANY overlap between the producer's lane.genres and the union of
//     {classification.genre_primary, ...classification.genre_tags} counts.
//   - Format: producer's lane.format ∈ {script's declared_format, 'Both'}.
//     Case-insensitive normalize.
//   - Budget: producer's lane.budget_tier ∈ {eval.packaging.budget_tier.tier,
//     'agnostic'}. Case-insensitive. Legacy evals without packaging fall
//     through as agnostic on the script side.
//
// Cap at 10 matches per submission for now (no ranking signal yet — we just
// take the first N). Existing rows are protected by the
// (producer_id, submission_id) UNIQUE constraint; we catch the dup error
// rather than pre-checking, so concurrent re-runs are safe.

import type { SupabaseClient } from "@supabase/supabase-js"

const MAX_MATCHES_PER_SUBMISSION = 10

type ProducerLane = {
  genres?: string[]
  format?: string
  budget_tier?: string
  audience?: string
  looking_for_text?: string
}

type ProducerRow = {
  id: string
  lane: ProducerLane | null
}

type SubmissionRow = {
  id: string
  declared_format: string | null
}

type EvaluationRow = {
  evaluation: {
    classification?: {
      genre_primary?: string
      genre_tags?: string[]
    }
    packaging?: {
      budget_tier?: {
        tier?: string
      }
    }
  } | null
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function uniqNonEmpty(values: (string | null | undefined)[]): string[] {
  const out = new Set<string>()
  for (const v of values) {
    const n = normalize(v)
    if (n) out.add(n)
  }
  return Array.from(out)
}

function genreOverlap(scriptGenres: string[], laneGenres: string[]): boolean {
  if (laneGenres.length === 0) return true // producer didn't restrict genre
  if (scriptGenres.length === 0) return false // script has no genre signal
  const scriptSet = new Set(scriptGenres)
  return laneGenres.some((g) => scriptSet.has(g))
}

function formatMatches(scriptFormat: string, laneFormat: string): boolean {
  if (!laneFormat) return true // producer didn't restrict
  if (laneFormat === "both") return true
  if (!scriptFormat) return false
  return laneFormat === scriptFormat
}

function budgetMatches(scriptBudget: string, laneBudget: string): boolean {
  if (!laneBudget) return true
  if (laneBudget === "agnostic") return true
  if (!scriptBudget) return true // legacy eval — be forgiving, let it through
  return laneBudget === scriptBudget
}

export interface MatchingResult {
  matchesCreated: number
  matchesSkipped: number
  candidatesEvaluated: number
}

export async function createMatchesForSubmission(
  submissionId: string,
  supabase: SupabaseClient
): Promise<MatchingResult> {
  // 1. Look up submission (need declared_format).
  const { data: submissionRaw, error: subErr } = await supabase
    .from("script_submissions")
    .select("id, declared_format")
    .eq("id", submissionId)
    .single()

  if (subErr || !submissionRaw) {
    console.error("[matching] submission lookup failed:", subErr?.message)
    return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
  }
  const submission = submissionRaw as SubmissionRow
  const scriptFormat = normalize(submission.declared_format)

  // 2. Look up the most recent evaluation for genre + budget signal.
  const { data: evalRaw } = await supabase
    .from("script_evaluations")
    .select("evaluation")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const evaluation = (evalRaw as EvaluationRow | null)?.evaluation ?? null
  const classification = evaluation?.classification ?? {}
  const scriptGenres = uniqNonEmpty([
    classification.genre_primary,
    ...(classification.genre_tags ?? []),
  ])
  const scriptBudget = normalize(evaluation?.packaging?.budget_tier?.tier)

  // 3. Pull all producers with a lane defined.
  const { data: producersRaw, error: prodErr } = await supabase
    .from("profiles")
    .select("id, lane")
    .eq("account_type", "producer")
    .not("lane", "is", null)

  if (prodErr) {
    console.error("[matching] producer query failed:", prodErr.message)
    return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
  }
  const producers: ProducerRow[] = (producersRaw ?? []) as ProducerRow[]

  // 4. Score each producer against the predicate.
  const matches: string[] = []
  for (const p of producers) {
    if (!p.lane) continue
    const laneGenres = uniqNonEmpty(p.lane.genres ?? [])
    const laneFormat = normalize(p.lane.format)
    const laneBudget = normalize(p.lane.budget_tier)

    if (!genreOverlap(scriptGenres, laneGenres)) continue
    if (!formatMatches(scriptFormat, laneFormat)) continue
    if (!budgetMatches(scriptBudget, laneBudget)) continue

    matches.push(p.id)
    if (matches.length >= MAX_MATCHES_PER_SUBMISSION) break
  }

  // 5. Insert match rows, individually so a UNIQUE-constraint dup on one
  //    doesn't poison the rest. status defaults to 'pending'.
  let created = 0
  let skipped = 0
  for (const producerId of matches) {
    const { error: insErr } = await supabase
      .from("script_matches")
      .insert({
        producer_id: producerId,
        submission_id: submissionId,
        status: "pending",
      })
    if (insErr) {
      // 23505 = unique_violation. Anything else, log it but keep going.
      const code = (insErr as { code?: string }).code
      if (code === "23505") {
        skipped += 1
      } else {
        console.error(
          `[matching] insert failed for producer=${producerId}:`,
          insErr.message
        )
        skipped += 1
      }
      continue
    }
    created += 1
  }

  return {
    matchesCreated: created,
    matchesSkipped: skipped,
    candidatesEvaluated: producers.length,
  }
}
