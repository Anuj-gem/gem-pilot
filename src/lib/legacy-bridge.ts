// Legacy → modern shape bridge for evaluation payloads.
//
// Background: the prod /api/evaluate route uses the v5.4 prompt
// (`evaluation-prompt-v5-4.ts`), which emits the modern producer-decision
// fields `risk_details` + `packaging`. The standalone rescore script
// (`scripts/rescore-all.mjs`) reads from the older
// `src/lib/evaluation-prompt.ts`, which still emits the legacy
// `production_reality.risk_rubric` + `package_angles` fields under
// different names. Same content, different schema.
//
// Until the rescore is rerun on the modern prompt, every evaluation
// rescored on the legacy prompt rendered the legacy UI components, while
// fresh submissions rendered the modern ones — visually inconsistent
// across two scripts viewed by the same user.
//
// This bridge derives the modern shape from the legacy fields so the
// renderer can always reach for `<RiskDetailsSection>` and
// `<PackagingSection>` without branching on schema.
//
// The bridge is lossy in places (legacy rights/location risk axes have
// nowhere to go in the 3-card modern shape; legacy buyer_appeal.detail
// becomes the modern audience teaser even though it's framed for buyers,
// not viewers). We accept the lossiness as the cost of UI consistency
// while the rescore catches up.

import type {
  GEMEvaluation,
  Packaging,
  RiskDetails,
  BudgetTier,
} from '@/types'

const BUDGET_TIERS: BudgetTier['tier'][] = [
  'micro',
  'indie',
  'mid',
  'studio',
  'premium',
  'tentpole',
]

/** Canonical dollar ranges per tier — these match the BUDGET_TAG_LABEL
 *  strings the producer dashboard cards already display, so the bridged
 *  range and the dashboard pill stay in lockstep. The legacy lane string
 *  ("Prestige historical drama / adult-skewing literary adaptation lane")
 *  used to land in `range` and read like a broken description; it lives
 *  in `note` now. */
const TIER_RANGE: Record<BudgetTier['tier'], string> = {
  micro: 'Sub-$1M',
  indie: '$1–15M',
  mid: '$15–50M',
  studio: '$50M+',
  premium: '$50–100M',
  tentpole: '$100M+',
}

/** Map a free-form legacy tier string ("Indie", "$10-25M prestige feature",
 *  "Mid-budget streamer", etc.) to the closest modern enum value. Falls
 *  back to "mid" when no token matches. */
function normalizeTier(raw: string | undefined): BudgetTier['tier'] {
  if (!raw) return 'mid'
  const lc = raw.toLowerCase()
  for (const tier of BUDGET_TIERS) {
    if (lc.includes(tier)) return tier
  }
  // Heuristic fallbacks the loop misses.
  if (lc.includes('tent')) return 'tentpole'
  if (lc.includes('prestige') || lc.includes('streamer')) return 'premium'
  if (lc.includes('low') || lc.includes('micro')) return 'micro'
  return 'mid'
}

/** Title-case a single token. */
function tc(s: string | undefined): string {
  if (!s) return ''
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Derive the modern `risk_details` 3-card shape from the legacy
 *  `production_reality.risk_rubric` 5-axis shape. The modern UI only
 *  surfaces `budget` and `casting`; we fill `development` from the
 *  legacy `content` axis as the closest analogue so the type contract
 *  is satisfied even though that card is hidden today. */
export function bridgeRiskDetails(report: GEMEvaluation): RiskDetails | null {
  if (report.risk_details) return report.risk_details
  const rubric = report.production_reality?.risk_rubric
  if (!rubric) return null
  return {
    budget: rubric.cost,
    casting: rubric.cast,
    development: rubric.content,
  }
}

/** Derive the modern `packaging` block from legacy fields. The audience
 *  teaser is the recommended-lane string (the closest legacy stand-in for
 *  "who this is for"); the buyer_appeal.detail goes under it as the
 *  unfold body. The budget range comes from the canonical tier table —
 *  the legacy lane sentence ("Prestige historical drama / adult-skewing
 *  literary adaptation lane") used to land in the range slot and read
 *  broken, so it now sits in `note` where descriptive copy belongs. */
export function bridgePackaging(report: GEMEvaluation): Packaging | null {
  if (report.packaging) return report.packaging
  const angles = report.package_angles
  const platform = report.production_reality?.platform_fit
  if (!angles && !platform) return null

  const tierRaw = angles?.buyer_appeal?.tier ?? ''
  const laneRaw = angles?.buyer_appeal?.lane ?? platform?.recommended_lane ?? ''
  const detail = angles?.buyer_appeal?.detail ?? ''
  const tier = normalizeTier(tierRaw || laneRaw)

  // Audience: prefer the recommended-lane string (descriptive sentence
  // about the lane this fits), fall back to a genre-derived label so the
  // card never renders empty.
  const genre = report.classification?.genre_primary ?? ''
  const audienceFallback = genre
    ? `${tc(genre)} audience`
    : 'Audience read pending.'
  const audience = laneRaw || audienceFallback

  return {
    comp_set: [],
    audience_target: {
      primary_audience: audience,
      demographics: '',
      quadrants: [],
    },
    budget_tier: {
      tier,
      range: TIER_RANGE[tier],
      note: detail,
    },
    lane_fit: {
      lane: laneRaw,
      types_of_buyers: [],
      detail,
    },
    ip_potential: {
      has_potential: false,
      detail: '',
    },
  }
}
