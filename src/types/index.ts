// ─── GEM Script Evaluation Types ────────────────────────────────────

// ─── Tier System ────────────────────────────────────────────────────
export type Tier =
  | "Exceptional"
  | "Strong"
  | "Promising"
  | "Early Stage"
  | "Needs Fundamental Rework";

export const TIER_META: Record<
  Tier,
  { label: string; colorClass: string; bgClass: string; description: string; range: string }
> = {
  "Exceptional": {
    label: "Exceptional",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-950/50 border-emerald-700",
    description: "Reads like top-tier produced material. A script at this level could attract talent and financing on its own merits.",
    range: "80+",
  },
  "Strong": {
    label: "Strong",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-950/50 border-amber-700",
    description: "Real commercial potential with clear strengths. Development-ready — a producer or rep would take a meeting on this.",
    range: "70–80",
  },
  "Promising": {
    label: "Promising",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-950/50 border-blue-700",
    description: "The foundation is there but significant gaps remain. Needs another draft or two with focused development notes.",
    range: "60–70",
  },
  "Early Stage": {
    label: "Early Stage",
    colorClass: "text-zinc-400",
    bgClass: "bg-zinc-800/50 border-zinc-600",
    description: "Shows some instinct or ambition, but the craft, structure, or commercial clarity isn't there yet.",
    range: "50–60",
  },
  "Needs Fundamental Rework": {
    label: "Needs Rework",
    colorClass: "text-zinc-500",
    bgClass: "bg-zinc-900/50 border-zinc-700",
    description: "Core elements need to be reconceived, not just polished. The most productive path is likely a page-one rewrite.",
    range: "Below 50",
  },
};

// ─── Score Dimensions ───────────────────────────────────────────────
export const DIMENSION_IDS = [
  "audience_appeal_marketability",
  "conceptual_hook_clarity",
  "character_appeal_and_long_term_potential",
  "creative_originality_and_boldness",
  "narrative_momentum_engagement",
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

export const DIMENSION_META: Record<
  DimensionId,
  { label: string; shortLabel: string; description: string; weight: number }
> = {
  audience_appeal_marketability: {
    label: "Audience Appeal & Marketability",
    shortLabel: "Market Appeal",
    description: "How wide is the potential audience? Is the emotional promise clear?",
    weight: 0.3443,
  },
  conceptual_hook_clarity: {
    label: "Conceptual Hook & Clarity",
    shortLabel: "Hook",
    description: "Can you explain the premise in two sentences? Does the hook land early?",
    weight: 0.1179,
  },
  character_appeal_and_long_term_potential: {
    label: "Character Appeal & Longevity",
    shortLabel: "Characters",
    description: "Are the leads compelling and contradictory enough to sustain the story?",
    weight: 0.3417,
  },
  creative_originality_and_boldness: {
    label: "Creative Originality & Boldness",
    shortLabel: "Originality",
    description: "How fresh is the voice? Are you taking genuine creative risks?",
    weight: 0.1589,
  },
  narrative_momentum_engagement: {
    label: "Narrative Momentum & Engagement",
    shortLabel: "Momentum",
    description: "Does it move? Does each scene build toward something that demands more?",
    weight: 0.0372,
  },
};

// ─── Evaluation Report Shape (matches GPT output) ───────────────────

export interface Comparable {
  title: string;
  why: string;
}

export interface FormatDetection {
  format: string;
  genre_primary: string;
  genre_tags: string[];
  tone: string;
  comparables: Comparable[];
}

export interface DimensionScore {
  score: number;
  reasoning: string;
}

export interface WorkingPoint {
  point: string;
  evidence: string;
  why_it_works: string;
}

export interface HurtingPoint {
  point: string;
  evidence: string;
  suggestion: string;
}

export interface DevelopmentAssessment {
  working: WorkingPoint[];
  hurting: HurtingPoint[];
  overall_take: string;
}

export interface CastReality {
  speaking_roles: number;
  leads: number;
  requires_name_talent: boolean;
  notes: string;
}

export interface LocationReality {
  distinct_count: number;
  interior_exterior_mix: string;
  expensive_flags: string[];
  notes: string;
}

export interface TechnicalReality {
  vfx_requirements: string;
  stunts: string;
  other_flags: string[];
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
  period_or_contemporary: string;
  rights_flags: string[];
  platform_fit: PlatformFit;
}

export interface GEMEvaluation {
  format_detection: FormatDetection;
  scores: Record<DimensionId, DimensionScore>;
  weighted_score: number;
  tier: Tier;
  development_assessment: DevelopmentAssessment;
  production_reality: ProductionReality;
}

// ─── Database Models ────────────────────────────────────────────────

export interface ScriptSubmission {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  file_url: string | null;
  file_size: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  is_public: boolean;
  error_message: string | null;
  created_at: string;
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
