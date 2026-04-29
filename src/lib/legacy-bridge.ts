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

/** Derive the modern `packaging` block from legacy fields. Pulls the
 *  budget tier from `package_angles.buyer_appeal`, falls back to the
 *  recommended-lane string from production_reality.platform_fit. The
 *  audience teaser is the buyer_appeal.detail (best legacy approximation
 *  for "who this is for"). */
export function bridgePackaging(report: GEMEvaluation): Packaging | null {
  if (report.packaging) return report.packaging
  const angles = report.package_angles
  const platform = report.production_reality?.platform_fit
  if (!angles && !platform) return null

  const tierRaw = angles?.buyer_appeal?.tier ?? ''
  const laneRaw = angles?.buyer_appeal?.lane ?? platform?.recommended_lane ?? ''
  const detail = angles?.buyer_appeal?.detail ?? ''

  const audienceTeaser = detail || laneRaw || 'Audience read pending.'

  return {
    comp_set: [],
    audience_target: {
      primary_audience: audienceTeaser,
      demographics: '',
      quadrants: [],
    },
    budget_tier: {
      tier: normalizeTier(tierRaw || laneRaw),
      range: laneRaw,
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
