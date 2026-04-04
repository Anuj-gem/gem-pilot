// ─── GEM Script Evaluation Types (v3 — 10 dimensions) ──────────────

// ─── Tier System ────────────────────────────────────────────────────
export type Tier =
  | "Greenlight Material"
  | "Optionable"
  | "Needs Development";

export const TIER_META: Record<
  Tier,
  { label: string; colorClass: string; bgClass: string; description: string; range: string }
> = {
  "Greenlight Material": {
    label: "Greenlight Material",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200",
    description: "This script reads like top-tier produced material — distinctive voice, strong commercial instincts, and production-ready craft.",
    range: "85+",
  },
  "Optionable": {
    label: "Optionable",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-200",
    description: "",
    range: "60–85",
  },
  "Needs Development": {
    label: "Needs Development",
    colorClass: "text-gray-500",
    bgClass: "bg-gray-50 border-gray-200",
    description: "",
    range: "Below 60",
  },
};

// ─── Score Dimensions (v3 — 10 dimensions) ─────────────────────────
export const DIMENSION_IDS = [
  "audience_appeal_marketability",
  "conceptual_hook_clarity",
  "character_appeal_and_long_term_potential",
  "creative_originality_and_boldness",
  "narrative_momentum_engagement",
  "resonant_originality",
  "world_density_and_texture",
  "tonal_specificity",
  "latent_depth_slow_burn_potential",
  "relationship_density_and_ensemble_engine",
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

// v3 weights from best_config_94.53pct.json (raw values, sum = 15.0)
export const V3_RAW_WEIGHTS: Record<DimensionId, number> = {
  audience_appeal_marketability: 2.5,
  conceptual_hook_clarity: 1.5,
  character_appeal_and_long_term_potential: 1.0,
  creative_originality_and_boldness: 0.5,
  narrative_momentum_engagement: 0.5,
  resonant_originality: 0.5,
  world_density_and_texture: 3.0,
  tonal_specificity: 2.5,
  latent_depth_slow_burn_potential: 0.5,
  relationship_density_and_ensemble_engine: 2.5,
};

const TOTAL_WEIGHT = Object.values(V3_RAW_WEIGHTS).reduce((a, b) => a + b, 0);

export const DIMENSION_META: Record<
  DimensionId,
  { label: string; shortLabel: string; description: string; weight: number }
> = {
  audience_appeal_marketability: {
    label: "Audience Appeal & Marketability",
    shortLabel: "Audience Appeal & Marketability",
    description: "How wide is the potential audience? Is the emotional promise clear?",
    weight: V3_RAW_WEIGHTS.audience_appeal_marketability / TOTAL_WEIGHT,
  },
  conceptual_hook_clarity: {
    label: "Conceptual Hook & Clarity",
    shortLabel: "Conceptual Hook & Clarity",
    description: "Can you explain the premise in two sentences? Does the hook land early?",
    weight: V3_RAW_WEIGHTS.conceptual_hook_clarity / TOTAL_WEIGHT,
  },
  character_appeal_and_long_term_potential: {
    label: "Character Appeal & Longevity",
    shortLabel: "Character Appeal & Longevity",
    description: "Are the leads compelling and contradictory enough to sustain the story?",
    weight: V3_RAW_WEIGHTS.character_appeal_and_long_term_potential / TOTAL_WEIGHT,
  },
  creative_originality_and_boldness: {
    label: "Creative Originality & Boldness",
    shortLabel: "Creative Originality & Boldness",
    description: "How fresh is the voice? Are you taking genuine creative risks?",
    weight: V3_RAW_WEIGHTS.creative_originality_and_boldness / TOTAL_WEIGHT,
  },
  narrative_momentum_engagement: {
    label: "Narrative Momentum & Engagement",
    shortLabel: "Narrative Momentum & Engagement",
    description: "Does it move? Does each scene build toward something that demands more?",
    weight: V3_RAW_WEIGHTS.narrative_momentum_engagement / TOTAL_WEIGHT,
  },
  resonant_originality: {
    label: "Resonant Originality",
    shortLabel: "Resonant Originality",
    description: "Does this feel fresh AND inevitable? The 'why didn't anyone do this before?' quality.",
    weight: V3_RAW_WEIGHTS.resonant_originality / TOTAL_WEIGHT,
  },
  world_density_and_texture: {
    label: "World Density & Texture",
    shortLabel: "World Density & Texture",
    description: "Is the setting an engine that generates story, not just a backdrop?",
    weight: V3_RAW_WEIGHTS.world_density_and_texture / TOTAL_WEIGHT,
  },
  tonal_specificity: {
    label: "Tonal Specificity",
    shortLabel: "Tonal Specificity",
    description: "Could you identify this show from a single scene? How ownable is the voice?",
    weight: V3_RAW_WEIGHTS.tonal_specificity / TOTAL_WEIGHT,
  },
  latent_depth_slow_burn_potential: {
    label: "Latent Depth & Slow-Burn Potential",
    shortLabel: "Latent Depth & Slow-Burn",
    description: "Are there hidden reserves beneath the surface that reward continued viewing?",
    weight: V3_RAW_WEIGHTS.latent_depth_slow_burn_potential / TOTAL_WEIGHT,
  },
  relationship_density_and_ensemble_engine: {
    label: "Relationship Density & Ensemble Engine",
    shortLabel: "Relationship Density & Ensemble",
    description: "Is it a web of dynamics that generates story, or a protagonist with satellites?",
    weight: V3_RAW_WEIGHTS.relationship_density_and_ensemble_engine / TOTAL_WEIGHT,
  },
};

// ─── Scoring Utility ───────────────────────────────────────────────

/** Calculate weighted score (0-100) from dimension scores */
export function calculateWeightedScore(scores: Record<DimensionId, { score: number }>): number {
  let weighted = 0;
  for (const dim of DIMENSION_IDS) {
    weighted += scores[dim].score * V3_RAW_WEIGHTS[dim];
  }
  return Math.round((weighted / TOTAL_WEIGHT) * 10 * 10) / 10; // one decimal
}

/** Determine tier from weighted score */
export function calculateTier(weightedScore: number): Tier {
  if (weightedScore >= 85) return "Greenlight Material";
  if (weightedScore >= 60) return "Optionable";
  return "Needs Development";
}

// ─── Evaluation Report Shape (v3 — matches GPT output) ────────────

export interface Classification {
  format: string;
  genre_primary: string;
  genre_tags: string[];
  tone: string;
}

/** @deprecated use Classification — kept for v2 backward compat */
export interface FormatDetection extends Classification {}

export interface DimensionScore {
  score: number;
  reasoning: string;
}

// ─── What's Special / What Needs Development (v3) ──────────────────

export interface Strength {
  dimension_or_area: string;
  what_it_means: string;
  evidence: string;
  source: "script" | "production" | "both";
}

export interface WhatsSpecial {
  strengths: Strength[];
  headline: string;
}

export interface DevelopmentTheme {
  theme: string;
  risk: string;
  evidence: string;
  source: "script" | "production" | "both";
}

export interface WhatsHoldingItBack {
  themes: DevelopmentTheme[];
  headline: string;
}

/** @deprecated v2 shape — kept for backward compat during migration */
export interface WorkingPoint {
  point: string;
  evidence: string;
  why_it_works: string;
}

/** @deprecated v2 shape — kept for backward compat during migration */
export interface HurtingPoint {
  point: string;
  evidence: string;
  suggestion: string;
}

/** @deprecated v2 shape — kept for backward compat during migration */
export interface DevelopmentAssessment {
  working: WorkingPoint[];
  hurting: HurtingPoint[];
  overall_take: string;
}

// ─── Production Reality (v3) ───────────────────────────────────────

export interface RightsFlag {
  type: "real_person" | "named_music" | "brand" | "ip_licensing";
  detail: string;
}

export interface CastReality {
  speaking_roles: number;
  leads: number;
  series_regulars?: number;
  child_actors?: boolean;
  requires_name_talent: boolean;
  name_talent_reason?: string;
  casting_challenges?: string[];
  notes?: string;
}

export interface LocationReality {
  distinct_count: number;
  interior_exterior_ratio?: string;
  interior_exterior_mix?: string; // v2 compat
  period_or_contemporary?: string;
  expensive_flags: string[];
  notes?: string;
}

export interface TechnicalReality {
  vfx_level?: string;
  vfx_details?: string;
  vfx_requirements?: string; // v2 compat
  stunts_level?: string;
  stunts?: string; // v2 compat
  sfx_needs?: string;
  night_shoots?: string;
  animals?: boolean;
  other_flags?: string[];
}

export interface PlatformFit {
  recommended_lane: string;
  content_level: string;
  series_engine_or_release_model: string;
}

export interface ProductionReality {
  cast: CastReality;
  locations: LocationReality;
  technical: TechnicalReality;
  period_or_contemporary?: string;
  rights_flags: (string | RightsFlag)[];
  platform_fit: PlatformFit;
}

// ─── Unified Evaluation Type (handles v2 and v3) ───────────────────

export interface GEMEvaluation {
  // v3 fields
  classification?: Classification;
  whats_special?: WhatsSpecial;
  whats_holding_it_back?: WhatsHoldingItBack;

  // v2 fields (backward compat — present on old evaluations)
  format_detection?: FormatDetection;
  development_assessment?: DevelopmentAssessment;
  weighted_score?: number;
  tier?: string;

  // shared
  scores: Record<string, DimensionScore>;
  production_reality: ProductionReality;
}

// ─── Helper: normalize v2/v3 evaluation for rendering ──────────────

export function normalizeEvaluation(raw: GEMEvaluation) {
  const classification: Classification = raw.classification ?? {
    format: raw.format_detection?.format ?? "",
    genre_primary: raw.format_detection?.genre_primary ?? "",
    genre_tags: raw.format_detection?.genre_tags ?? [],
    tone: raw.format_detection?.tone ?? "",
  };

  // Convert v2 working/hurting to v3 whats_special / whats_holding_it_back
  const whatsSpecial: WhatsSpecial = raw.whats_special ?? {
    strengths: (raw.development_assessment?.working ?? []).map((w) => ({
      dimension_or_area: w.point,
      what_it_means: w.why_it_works,
      evidence: w.evidence,
      source: "script" as const,
    })),
    headline: raw.development_assessment?.overall_take ?? "",
  };

  const whatsHoldingItBack: WhatsHoldingItBack = raw.whats_holding_it_back ?? {
    themes: (raw.development_assessment?.hurting ?? []).map((h) => ({
      theme: h.point,
      risk: h.suggestion,
      evidence: h.evidence,
      source: "script" as const,
    })),
    headline: "",
  };

  return { classification, whatsSpecial, whatsHoldingItBack };
}

// ─── Database Models ────────────────────────────────────────────────

export interface ScriptSubmission {
  id: string;
  user_id: string | null;
  title: string;
  filename: string;
  file_url: string | null;
  file_size: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  is_public: boolean;
  error_message: string | null;
  created_at: string;
  expires_at: string | null;
  // joined
  profiles?: { full_name: string; avatar_url: string | null };
  script_evaluations?: ScriptEvaluation[];
}

export interface ScriptEvaluation {
  id: string;
  submission_id: string;
  weighted_score: number;
  tier: Tier;
  evaluation: GEMEvaluation;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  created_at: string;
}

// ─── Leaderboard ────────────────────────────────────────────────────

export interface LeaderboardEntry {
  evaluation_id: string;
  submission_id: string;
  title: string;
  user_id: string;
  author_name: string;
  avatar_url: string | null;
  weighted_score: number;
  tier: Tier;
  format: string;
  genre: string;
  logline: string | null;
  overall_take: string | null;
  like_count: number;
  created_at: string;
}

export interface ScriptLike {
  id: string;
  evaluation_id: string;
  user_id: string;
  created_at: string;
}

// ─── API Types ──────────────────────────────────────────────────────

export interface EvaluateResponse {
  submission_id: string;
  evaluation_id: string;
  status: "completed" | "failed";
  error?: string;
}

// ─── Legacy types (kept for backward compat) ────────────────────────

export type LegacyTier =
  | "Exceptional"
  | "Strong"
  | "Promising"
  | "Early Stage"
  | "Needs Fundamental Rework";

export type Verdict = "STRONG SIGNAL" | "WORTH THE READ" | "MIXED" | "PASS";

export const VERDICT_META: Record<
  Verdict,
  { label: string; colorClass: string; bgClass: string; description: string }
> = {
  "STRONG SIGNAL": {
    label: "GEM Select",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200",
    description: "This script stands out.",
  },
  "WORTH THE READ": {
    label: "On Our Radar",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-200",
    description: "Real strengths here.",
  },
  MIXED: {
    label: "Development Notes",
    colorClass: "text-zinc-600",
    bgClass: "bg-zinc-100 border-zinc-300",
    description: "Promising elements alongside clear gaps.",
  },
  PASS: {
    label: "Keep Writing",
    colorClass: "text-zinc-500",
    bgClass: "bg-zinc-50 border-zinc-200",
    description: "Not where it needs to be yet.",
  },
};

// ─── Shared Constants ───────────────────────────────────────────────

export const SKILLS = [
  'writing', 'directing', 'cinematography', 'editing', 'sound-design',
  'composing', 'scoring', 'concept-art', 'world-building', 'vfx',
  'animation', 'prompt-engineering', 'producing', 'acting',
  'voice-acting', 'motion-capture', 'color-grading', 'storyboarding'
];

export const GENRES = [
  'horror', 'sci-fi', 'drama', 'comedy', 'thriller', 'action',
  'romance', 'documentary', 'animation', 'fantasy', 'mystery',
  'crime', 'western', 'musical', 'experimental', 'arthouse'
];

export const MEDIUMS = [
  { value: 'feature_film', label: 'Feature Film' },
  { value: 'short_film', label: 'Short Film' },
  { value: 'series', label: 'Series' },
  { value: 'limited_series', label: 'Limited Series' },
  { value: 'social_channel', label: 'Social Channel' },
  { value: 'visual_album', label: 'Visual Album' },
  { value: 'web_series', label: 'Web Series' },
  { value: 'other', label: 'Other' },
];

export const PROJECT_STATUSES = [
  { value: 'concept', label: 'Concept' },
  { value: 'development', label: 'In Development' },
  { value: 'production', label: 'Production' },
  { value: 'post', label: 'Post-Production' },
  { value: 'complete', label: 'Complete' },
];
