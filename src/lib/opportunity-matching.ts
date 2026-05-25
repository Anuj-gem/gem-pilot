/**
 * Canonical opportunity-to-script matching logic.
 *
 * ONE function, used everywhere. If you need to check whether a script
 * qualifies for an opportunity, call `scriptMatchesOpportunity()`.
 *
 * Matching criteria (all must pass if the opportunity specifies them):
 *   1. Format  — "Feature" / "Series"
 *   2. Genre   — fuzzy substring match
 *   3. Budget  — exact tier match
 *   4. Tags    — fuzzy substring match on classification tags
 */

// ─── Normalizers ──────────────────────────────────────────────────────────

/** Normalize a genre string for comparison */
export function normGenre(g: string | null | undefined): string {
  return (g ?? '')
    .toLowerCase()
    .replace(/[‐-―–—_/]/g, '-')
    .replace(/[^a-z0-9\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalize a tag string for comparison */
function normTag(t: string): string {
  return t.toLowerCase().replace(/\s+/g, '-')
}

/** Collect unique non-empty normalized genres from mixed sources */
export function collectGenres(
  ...sources: (string | string[] | null | undefined)[]
): string[] {
  const set = new Set<string>()
  for (const s of sources) {
    if (!s) continue
    const items = Array.isArray(s) ? s : [s]
    for (const item of items) {
      const n = normGenre(item)
      if (n) set.add(n)
    }
  }
  return Array.from(set)
}

// ─── Types ────────────────────────────────────────────────────────────────

/** Minimal opportunity shape needed for matching */
export interface MatchableOpportunity {
  formats?: string[] | null
  genres?: string[] | null
  budget_tiers?: string[] | null
  tags?: string[] | null
  min_score?: number | null
}

/** Minimal script/eval shape needed for matching */
export interface MatchableScript {
  /** "Feature film" or "Series" (or normalized "Feature"/"Series") */
  format?: string | null
  /** Normalized genre strings */
  genres: string[]
  /** Budget tier string, lowercase (e.g. "low", "moderate", "high") */
  budget?: string | null
  /** Classification tags from the eval, raw strings */
  tags?: string[]
  /** Weighted score (0-100) */
  score?: number | null
}

// ─── Core matching function ───────────────────────────────────────────────

/**
 * Returns true if a script qualifies for an opportunity.
 *
 * Each criterion is only checked if the opportunity specifies it
 * (non-empty array). All specified criteria must pass (AND logic).
 */
export function scriptMatchesOpportunity(
  script: MatchableScript,
  opp: MatchableOpportunity,
): boolean {
  // 1. Min score gate
  if (opp.min_score != null && (!script.score || script.score < opp.min_score)) {
    return false
  }

  // 2. Format matching
  if (opp.formats && opp.formats.length > 0) {
    // Normalize "Feature film" → "Feature" for comparison
    const declNorm = script.format === 'Feature film' ? 'Feature' : script.format
    if (!declNorm) return false
    const fmtMatch = opp.formats.some(f => {
      const fl = f.toLowerCase()
      const dl = declNorm.toLowerCase()
      return fl === dl || fl === 'both' ||
        (fl.includes('feature') && dl.includes('feature')) ||
        (fl.includes('series') && dl.includes('series'))
    })
    if (!fmtMatch) return false
  }

  // 3. Genre matching (fuzzy substring both directions)
  if (opp.genres && opp.genres.length > 0) {
    if (script.genres.length === 0) return false
    const oppGenresNorm = opp.genres.map(normGenre)
    const hasGenreOverlap = script.genres.some(sg =>
      oppGenresNorm.some(og => sg.includes(og) || og.includes(sg)),
    )
    if (!hasGenreOverlap) return false
  }

  // 4. Budget matching
  if (opp.budget_tiers && opp.budget_tiers.length > 0) {
    if (!script.budget || !opp.budget_tiers.includes(script.budget)) {
      return false
    }
  }

  // 5. Tag matching (fuzzy substring both directions)
  if (opp.tags && opp.tags.length > 0) {
    const scriptTags = (script.tags || []).map(normTag)
    if (scriptTags.length === 0) return false
    const oppTagsNorm = opp.tags.map(normTag)
    const hasTagOverlap = oppTagsNorm.some(ot =>
      scriptTags.some(st => st === ot || st.includes(ot) || ot.includes(st)),
    )
    if (!hasTagOverlap) return false
  }

  return true
}

// ─── Eval data extraction helper ──────────────────────────────────────────

/**
 * Extract matching-relevant fields from a raw evaluation JSON blob.
 * Use this when you have the raw `evaluation` column from script_evaluations.
 */
export function extractMatchData(evJson: Record<string, unknown> | null): {
  genres: string[]
  budget: string | null
  tags: string[]
  format: string | null
  score: number | null
} {
  if (!evJson) return { genres: [], budget: null, tags: [], format: null, score: null }

  const cls = (evJson.classification as Record<string, unknown>) || {}
  const fmt = (evJson.format_detection as Record<string, unknown>) || {}

  const genres = collectGenres(
    cls.genre_primary as string,
    cls.genre_secondary as string[],
    cls.genre_tags as string[],
  )

  const packaging = (evJson.packaging as Record<string, unknown>) || {}
  const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
  const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null

  const tags = ((cls.tags as string[]) || []).map(normTag)

  const format = (cls.format as string) || (fmt.format as string) || null

  return { genres, budget, tags, format, score: null }
}
