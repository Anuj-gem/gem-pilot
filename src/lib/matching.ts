// Matching engine — Selznick-4 producer-side push.
//
// Two entry points:
//   createMatchesForSubmission(submissionId, supabase)
//     → for one freshly scored script, find producers whose lane fits.
//
//   createMatchesForProducer(producerId, supabase)
//     → for one producer (e.g. just signed up or just edited their lane),
//       backfill matches against all existing v5.4 evals that fit.
//
// Predicate (shared, intentionally forgiving for v1):
//   - Genre: ANY overlap between the producer's lane.genres and the union of
//     {classification.genre_primary, ...classification.genre_secondary}, using
//     loose matching: lowercase + alias map + substring containment.
//     "drama" matches "dramedy", "dark drama"; "sci-fi" matches "sci-fi
//     thriller", "science fiction"; "rom-com" matches "romantic comedy".
//     Legacy evals (pre-v5.4 standardization) used `genre_tags` instead of
//     `genre_secondary` — we still read that field as a fallback so old
//     evals keep matching.
//   - Format: producer's lane.format ∈ {script's declared_format, 'both'}.
//   - Budget: producer's lane.budget_tier ∈ {eval.packaging.budget_tier.tier,
//     'agnostic'}. Legacy evals without packaging fall through as agnostic.
//   - Tags: NOT a hard predicate — `script_submissions.tags` is plumbed
//     through into the script signal vector so producer-side filter UI can
//     narrow on it client-side, but a missing-tags overlap doesn't kill a
//     match.
//
// Cap at 10 matches per submission; cap at 50 backfilled matches per producer
// (to avoid flooding their inbox on first signup). Existing rows protected by
// the (producer_id, submission_id) UNIQUE constraint — dup catches are silent.

import type { SupabaseClient } from "@supabase/supabase-js"

const MAX_MATCHES_PER_SUBMISSION = 10
const MAX_MATCHES_PER_PRODUCER_BACKFILL = 50

// Genre normalization — lowercase, strip punctuation, collapse whitespace.
function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[\u2010-\u2015–—_/]/g, "-") // unify dashes
    .replace(/[^a-z0-9\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Aliases — map common synonyms to a canonical form. Both directions get
// added to a producer's "expanded" lane.
const GENRE_ALIASES: Record<string, string[]> = {
  "sci-fi": ["sci-fi", "scifi", "science fiction"],
  "rom-com": ["rom-com", "romcom", "romantic comedy"],
  "dramedy": ["dramedy", "drama-comedy", "drama comedy"],
  "thriller": ["thriller"],
  "drama": ["drama", "dramedy"],
  "comedy": ["comedy", "dramedy", "rom-com", "dark comedy"],
  "horror": ["horror", "supernatural", "slasher"],
  "fantasy": ["fantasy", "supernatural"],
  "crime": ["crime", "noir", "heist"],
  "action": ["action"],
  "romance": ["romance", "rom-com", "romantic"],
  "family": ["family"],
  "documentary": ["documentary", "doc"],
  "musical": ["musical"],
  "western": ["western"],
  "mystery": ["mystery", "noir"],
  "true crime": ["true crime", "crime"],
}

// For a single producer-lane genre, return the set of normalized phrases that
// should count as a match. E.g. "sci-fi" → {"sci-fi", "scifi", "science fiction"}.
function expandLaneGenre(g: string): string[] {
  const norm = normalize(g)
  const set = new Set<string>([norm])
  // Direct alias entry?
  const direct = GENRE_ALIASES[norm]
  if (direct) for (const alt of direct) set.add(normalize(alt))
  // Reverse: any alias map where this genre appears in the values?
  for (const [key, values] of Object.entries(GENRE_ALIASES)) {
    if (values.map(normalize).includes(norm)) {
      set.add(normalize(key))
      for (const alt of values) set.add(normalize(alt))
    }
  }
  return Array.from(set).filter(Boolean)
}

// True if any of `laneGenres` (expanded with aliases) appears as a substring
// of any of `scriptGenres` (or vice versa). Substring catches things like
// lane "drama" → script "dark drama"; lane "horror" → script "psychological
// horror".
function genreOverlap(scriptGenres: string[], laneGenres: string[]): boolean {
  if (laneGenres.length === 0) return true // producer didn't restrict
  if (scriptGenres.length === 0) return false
  const expanded = laneGenres.flatMap(expandLaneGenre)
  for (const lane of expanded) {
    if (!lane) continue
    for (const script of scriptGenres) {
      if (!script) continue
      if (script === lane) return true
      if (script.includes(lane)) return true // "dark drama" includes "drama"
      if (lane.includes(script)) return true // lane "sci-fi thriller" includes script "sci-fi"
    }
  }
  return false
}

function formatMatches(scriptFormat: string, laneFormat: string): boolean {
  if (!laneFormat) return true
  if (laneFormat === "both") return true
  if (!scriptFormat) return false
  // Normalize "feature" / "feature film" both ways.
  const s = scriptFormat.includes("feature") ? "feature" : scriptFormat.includes("series") ? "series" : scriptFormat
  const l = laneFormat.includes("feature") ? "feature" : laneFormat.includes("series") ? "series" : laneFormat
  return s === l
}

function budgetMatches(scriptBudget: string, laneBudget: string): boolean {
  if (!laneBudget) return true
  if (laneBudget === "agnostic") return true
  if (!scriptBudget) return true // legacy eval — be forgiving
  return laneBudget === scriptBudget
}

function uniqNonEmpty(values: (string | null | undefined)[]): string[] {
  const out = new Set<string>()
  for (const v of values) {
    const n = normalize(v)
    if (n) out.add(n)
  }
  return Array.from(out)
}

// Extract the script's signal vector from an evaluation row + the
// submission's denormalized tags column.
//
// Genre union: prefer the v5.4 standardized fields (genre_primary +
// genre_secondary), fall back to the legacy `genre_tags` array on older
// evals so they keep matching after the cutover.
//
// Tags: the new `script_submissions.tags` column (writer-editable). Plumbed
// through to the producer side as a script signal so filter UIs can narrow
// the inbox on tag overlap. Tag overlap is NOT a hard predicate — a missing
// tag intersection doesn't kill the match.
function scriptSignals(
  evaluation: EvaluationJson | null,
  declaredFormat: string | null,
  scriptTags: string[] | null = null
) {
  const classification = evaluation?.classification ?? {}
  const scriptGenres = uniqNonEmpty([
    classification.genre_primary,
    ...(classification.genre_secondary ?? []),
    // Legacy fallback — pre-v5.4 evals stored secondary genres in genre_tags.
    ...(classification.genre_tags ?? []),
  ])
  const scriptBudget = normalize(evaluation?.packaging?.budget_tier?.tier)
  const scriptFormat = normalize(declaredFormat)
  const tags = uniqNonEmpty(scriptTags ?? [])
  return { scriptGenres, scriptBudget, scriptFormat, scriptTags: tags }
}

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
  user_id?: string | null
  status?: string | null
  is_public?: boolean | null
  is_sample?: boolean | null
  hidden_at?: string | null
  tags?: string[] | null
}

// A script is eligible for industry matching only when the writer has
// explicitly published it (is_public=true), it has a real owner (user_id not
// null), it isn't a sample/test, isn't hidden, and is fully scored.
function isEligibleForMatching(s: SubmissionRow): boolean {
  if (s.is_sample === true) return false
  if (!s.user_id) return false
  if (s.is_public !== true) return false
  if (s.hidden_at) return false
  if (s.status && s.status !== "completed") return false
  return true
}

type EvaluationJson = {
  classification?: {
    genre_primary?: string
    genre_secondary?: string[]
    /** @deprecated pre-v5.4 — keep reading for backward compat. */
    genre_tags?: string[]
    tags?: string[]
  }
  packaging?: {
    budget_tier?: {
      tier?: string
    }
  }
}

export interface MatchingResult {
  matchesCreated: number
  matchesSkipped: number
  candidatesEvaluated: number
}

// ─── createMatchesForSubmission ─────────────────────────────────────────────
//
// Used post-eval: a script just got scored, find producers in its lane.

export async function createMatchesForSubmission(
  submissionId: string,
  supabase: SupabaseClient
): Promise<MatchingResult> {
  const { data: submissionRaw, error: subErr } = await supabase
    .from("script_submissions")
    .select("id, declared_format, user_id, status, is_public, is_sample, hidden_at, tags")
    .eq("id", submissionId)
    .single()

  if (subErr || !submissionRaw) {
    console.error("[matching] submission lookup failed:", subErr?.message)
    return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
  }
  const submission = submissionRaw as SubmissionRow

  // Eligibility gate — never route writer's private/sample/hidden scripts.
  if (!isEligibleForMatching(submission)) {
    return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
  }

  // Anuj 2026-04-28: industry matching is now a Pro-only feature. Free
  // writers get a sharable URL but their posts don't propagate to
  // producer feeds. Skip match creation entirely if the writer isn't
  // on an active subscription.
  if (submission.user_id) {
    const { data: writerProfile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", submission.user_id)
      .single<{ subscription_status: string | null }>()
    if (writerProfile?.subscription_status !== "active") {
      return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
    }
  }

  const { data: evalRaw } = await supabase
    .from("script_evaluations")
    .select("evaluation")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const evaluation = (evalRaw as { evaluation: EvaluationJson | null } | null)?.evaluation ?? null
  // scriptTags is read here for plumbing parity with the producer-side
  // backfill — the matching predicate doesn't gate on tags today, but
  // pulling the data keeps the call sites symmetric.
  const { scriptGenres, scriptBudget, scriptFormat } = scriptSignals(
    evaluation,
    submission.declared_format,
    submission.tags ?? null
  )

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

// ─── createMatchesForProducer ───────────────────────────────────────────────
//
// Used post-onboarding / lane-edit: a producer's lane just changed, backfill
// matches across all existing v5.4-scored submissions that fit.

export async function createMatchesForProducer(
  producerId: string,
  supabase: SupabaseClient
): Promise<MatchingResult> {
  // 1. Look up the producer's lane.
  const { data: producerRaw, error: prodErr } = await supabase
    .from("profiles")
    .select("id, lane, account_type")
    .eq("id", producerId)
    .single()

  if (prodErr || !producerRaw) {
    console.error("[matching] producer lookup failed:", prodErr?.message)
    return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
  }
  const producer = producerRaw as ProducerRow & { account_type?: string }
  if (producer.account_type !== "producer" || !producer.lane) {
    return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
  }
  const laneGenres = uniqNonEmpty(producer.lane.genres ?? [])
  const laneFormat = normalize(producer.lane.format)
  const laneBudget = normalize(producer.lane.budget_tier)

  // 2. Pull all completed submissions joined to their latest evaluation,
  //    ordered by score DESC. We only consider scripts that actually have
  //    an evaluation (otherwise no genre signal). Limit to a wide sweep —
  //    we re-cap below after filtering.
  const { data: candidatesRaw, error: candErr } = await supabase
    .from("script_evaluations")
    .select(
      `id, weighted_score, evaluation,
       submission:script_submissions!inner ( id, declared_format, user_id, status, is_public, is_sample, hidden_at, tags )`
    )
    .order("weighted_score", { ascending: false })
    .limit(500)

  if (candErr) {
    console.error("[matching] candidate query failed:", candErr.message)
    return { matchesCreated: 0, matchesSkipped: 0, candidatesEvaluated: 0 }
  }
  type CandidateRow = {
    id: string
    weighted_score: number | null
    evaluation: EvaluationJson | null
    submission: SubmissionRow | SubmissionRow[] | null
  }
  const rawCandidates = (candidatesRaw ?? []) as unknown as CandidateRow[]

  // 3a. Anuj 2026-04-28: industry matching is Pro-only on the writer
  //     side. Pre-fetch the subscription_status for every candidate
  //     submission's owner so we can filter out free writers in the loop
  //     below. One query keeps this O(1) per candidate.
  const candidateUserIds = Array.from(
    new Set(
      rawCandidates
        .map((r) => {
          const sub = Array.isArray(r.submission) ? r.submission[0] : r.submission
          return sub?.user_id
        })
        .filter((u): u is string => typeof u === "string" && u.length > 0)
    )
  )
  const proWriterIds = new Set<string>()
  if (candidateUserIds.length > 0) {
    const { data: subStatusRows } = await supabase
      .from("profiles")
      .select("id, subscription_status")
      .in("id", candidateUserIds)
    for (const row of (subStatusRows ?? []) as Array<{
      id: string
      subscription_status: string | null
    }>) {
      if (row.subscription_status === "active") proWriterIds.add(row.id)
    }
  }

  // 3. Filter — only completed scripts whose signals match.
  const matchedSubmissionIds: string[] = []
  let candidatesEvaluated = 0
  for (const row of rawCandidates) {
    const submission = Array.isArray(row.submission) ? row.submission[0] : row.submission
    if (!submission) continue
    // Eligibility gate — same rules as createMatchesForSubmission.
    if (!isEligibleForMatching(submission)) continue
    // Pro-only gate. Free writers aren't on Industry.
    if (!submission.user_id || !proWriterIds.has(submission.user_id)) continue
    candidatesEvaluated += 1

    const { scriptGenres, scriptBudget, scriptFormat } = scriptSignals(
      row.evaluation,
      submission.declared_format,
      submission.tags ?? null
    )

    if (!genreOverlap(scriptGenres, laneGenres)) continue
    if (!formatMatches(scriptFormat, laneFormat)) continue
    if (!budgetMatches(scriptBudget, laneBudget)) continue

    matchedSubmissionIds.push(submission.id)
    if (matchedSubmissionIds.length >= MAX_MATCHES_PER_PRODUCER_BACKFILL) break
  }

  // 4. Insert match rows. The UNIQUE constraint dedupes; we silently skip
  //    rows that already exist so re-running this on a producer who already
  //    has matches is safe.
  let created = 0
  let skipped = 0
  for (const submissionId of matchedSubmissionIds) {
    const { error: insErr } = await supabase
      .from("script_matches")
      .insert({
        producer_id: producerId,
        submission_id: submissionId,
        status: "pending",
      })
    if (insErr) {
      const code = (insErr as { code?: string }).code
      if (code === "23505") {
        skipped += 1
      } else {
        console.error(
          `[matching] producer-backfill insert failed for submission=${submissionId}:`,
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
    candidatesEvaluated,
  }
}
