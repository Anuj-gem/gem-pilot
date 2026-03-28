// ─── Core Dimension IDs (all 10 from v3_expanded engine) ────────────
export const DIMENSION_IDS = [
  "audience_appeal_marketability",
  "tonal_specificity",
  "world_density_and_texture",
  "conceptual_hook_clarity",
  "resonant_originality",
  "relationship_density_and_ensemble_engine",
  "character_appeal_and_long_term_potential",
  "latent_depth_slow_burn_potential",
  "creative_originality_and_boldness",
  "narrative_momentum_engagement",
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

// ─── Dimension Metadata ─────────────────────────────────────────────
export const DIMENSION_META: Record<
  DimensionId,
  { label: string; shortLabel: string; description: string }
> = {
  audience_appeal_marketability: {
    label: "Audience Appeal & Marketability",
    shortLabel: "Market Appeal",
    description:
      "How wide is the potential audience? Could a buyer see where this fits in their lineup?",
  },
  tonal_specificity: {
    label: "Tonal Specificity",
    shortLabel: "Tone",
    description:
      "How distinctive and controlled is your show's voice? Tone is the hardest thing to fake.",
  },
  world_density_and_texture: {
    label: "World Density & Texture",
    shortLabel: "World",
    description:
      "Does your world feel lived-in? Does it generate stories on its own?",
  },
  conceptual_hook_clarity: {
    label: "Conceptual Hook & Clarity",
    shortLabel: "Hook",
    description:
      "Can you explain your show in two sentences? Does the hook land in the pilot?",
  },
  resonant_originality: {
    label: "Resonant Originality",
    shortLabel: "Originality",
    description:
      "Does it feel both fresh and inevitable? Not just different — resonant.",
  },
  relationship_density_and_ensemble_engine: {
    label: "Relationship Density & Ensemble Engine",
    shortLabel: "Ensemble",
    description:
      "Do your character relationships generate conflict naturally? That's the engine of a series.",
  },
  character_appeal_and_long_term_potential: {
    label: "Character Appeal & Longevity",
    shortLabel: "Characters",
    description:
      "Are your leads compelling enough to carry multiple seasons? Do they have real contradictions?",
  },
  latent_depth_slow_burn_potential: {
    label: "Latent Depth & Slow-Burn Potential",
    shortLabel: "Depth",
    description:
      "Is there more beneath the surface? The best shows reveal new layers over time.",
  },
  creative_originality_and_boldness: {
    label: "Creative Originality & Boldness",
    shortLabel: "Boldness",
    description:
      "How fresh is your voice? Are you taking genuine creative risks that pay off?",
  },
  narrative_momentum_engagement: {
    label: "Narrative Momentum & Engagement",
    shortLabel: "Momentum",
    description:
      "Does it move? Does each scene build tension and pull us toward the next episode?",
  },
};

// ─── Verdicts (matching engine output) ──────────────────────────────
export type Verdict = "STRONG SIGNAL" | "WORTH THE READ" | "MIXED" | "PASS";

export const VERDICT_META: Record<
  Verdict,
  { label: string; colorClass: string; bgClass: string; description: string }
> = {
  "STRONG SIGNAL": {
    label: "GEM Select",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200",
    description:
      "This script stands out. We want to talk to you about development.",
  },
  "WORTH THE READ": {
    label: "On Our Radar",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-200",
    description:
      "Real strengths here. With targeted development, this could break through.",
  },
  MIXED: {
    label: "Development Notes",
    colorClass: "text-zinc-600",
    bgClass: "bg-zinc-100 border-zinc-300",
    description:
      "Promising elements alongside clear gaps. Here's what to focus on next.",
  },
  PASS: {
    label: "Keep Writing",
    colorClass: "text-zinc-500",
    bgClass: "bg-zinc-50 border-zinc-200",
    description:
      "Not where it needs to be yet — but every great writer started somewhere. Here's your roadmap.",
  },
};

// ─── Engine Report Shape (matches report_generator.py output) ───────

export interface DimensionScore {
  dimension: DimensionId;
  display_name: string;
  short_desc: string;
  score: number; // 1-10
  weight: number;
  winner_avg: number;
  vs_winner_avg: number;
  reasoning: string;
}

export interface ReportStrength {
  dimension: DimensionId;
  display_name: string;
  score: number;
  note: string;
}

export interface ReportRisk {
  dimension: DimensionId;
  display_name: string;
  score: number;
  note: string;
}

export interface GEMReport {
  show_id: string;
  generated_at: string;
  engine_version: string;
  model: string;
  scoring_mode: string;

  verdict: {
    label: Verdict;
    weighted_score: number; // 0-100
    percentile: number;     // 0-100
    description: string;
    one_line: string;
  };

  // Decision layer (added in report layer v2)
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  read_recommendation?: string;
  opportunity_type?: string;
  highlights?: {
    type: "why_it_stands_out" | "what_would_need_to_improve";
    bullets: string[];
  };

  strengths: ReportStrength[];
  risks: ReportRisk[];
  dimensions: DimensionScore[];
  producer_takeaway: string;
}

// ─── App Data Models ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  subscription_status:
    | "trialing"
    | "active"
    | "canceled"
    | "past_due"
    | "none";
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

export interface Script {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  file_size: number;
  created_at: string;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface AnalysisJob {
  job_id: string;
  show_id: string;
  filename: string;
  file_size: number;
  status: JobStatus;
  error: string | null;
  report_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DashboardItem {
  job: AnalysisJob;
  report: GEMReport | null;
}

// ─── API Types ──────────────────────────────────────────────────────

export interface EvaluateResponse {
  job_id: string;
  show_id: string;
  status: string;
}

export interface UploadResponse {
  script: Script;
  job: AnalysisJob;
}
