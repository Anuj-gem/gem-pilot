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
      "Can you pitch it? Is it commercially viable across formats and audiences?",
  },
  tonal_specificity: {
    label: "Tonal Specificity",
    shortLabel: "Tone",
    description:
      "Distinctiveness and control of the show's tonal fingerprint — the hardest quality to fake.",
  },
  world_density_and_texture: {
    label: "World Density & Texture",
    shortLabel: "World",
    description:
      "Is the world a story-generating machine? Does it feel lived-in and rich?",
  },
  conceptual_hook_clarity: {
    label: "Conceptual Hook & Clarity",
    shortLabel: "Hook",
    description:
      "Can you explain it in two sentences? Does the hook land in the pilot?",
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
      "Do the character relationships generate conflict automatically?",
  },
  character_appeal_and_long_term_potential: {
    label: "Character Appeal & Longevity",
    shortLabel: "Characters",
    description:
      "Are the leads charismatic and durable? Can they sustain multiple seasons?",
  },
  latent_depth_slow_burn_potential: {
    label: "Latent Depth & Slow-Burn Potential",
    shortLabel: "Depth",
    description:
      "Is there more beneath the surface that will reveal itself over time?",
  },
  creative_originality_and_boldness: {
    label: "Creative Originality & Boldness",
    shortLabel: "Boldness",
    description:
      "How fresh is the voice or approach? Does it take genuine creative risks?",
  },
  narrative_momentum_engagement: {
    label: "Narrative Momentum & Engagement",
    shortLabel: "Momentum",
    description:
      "Does it move? Does it compel you to the next episode? Clear stakes and escalation?",
  },
};

// ─── Verdicts (matching engine output) ──────────────────────────────
export type Verdict = "STRONG SIGNAL" | "WORTH THE READ" | "MIXED" | "PASS";

export const VERDICT_META: Record<
  Verdict,
  { label: string; colorClass: string; bgClass: string; description: string }
> = {
  "STRONG SIGNAL": {
    label: "Strong Signal",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200",
    description:
      "Exceptional breakout potential. The DNA of transcendent television.",
  },
  "WORTH THE READ": {
    label: "Worth the Read",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-200",
    description:
      "Above-average signal. Worth a full read — real upside even if not all cylinders are firing.",
  },
  MIXED: {
    label: "Mixed",
    colorClass: "text-zinc-600",
    bgClass: "bg-zinc-100 border-zinc-300",
    description:
      "Some dimensions show promise, others underperform. Significant revision needed.",
  },
  PASS: {
    label: "Pass",
    colorClass: "text-zinc-500",
    bgClass: "bg-zinc-50 border-zinc-200",
    description:
      "Does not meet the threshold on the dimensions most predictive of transcendence.",
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
