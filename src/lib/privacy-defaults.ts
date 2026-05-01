// Account-level privacy settings.
// Anuj 2026-04-30 v0.10.
//
// Lives on profiles.privacy_defaults (JSONB). Three top-level toggles
// + a section-visibility map. New users confirm via onboarding step;
// existing users via a blocking dashboard prompt.

export interface SectionVisibility {
  headline: boolean
  cast: boolean
  packaging: boolean
  issues: boolean
  complexity: boolean
  risk: boolean
  comps: boolean
  /** Score chip on Community cards + report scorecard. Owner always
   *  sees their own; this gates non-owner viewers only. */
  score: boolean
}

export interface PrivacyDefaults {
  /** Appear on Community + on /w/[handle] by default. New scripts
   *  inherit this as their initial `is_public` value. */
  public_default: boolean
  /** Producers and reps can read the full report, download the PDF,
   *  and email the writer. Off → matching skips this writer. */
  allow_industry: boolean
  /** Reviewers can pull the script PDF when they review. Off →
   *  reviewers see only the report. The incentive: turn on → more
   *  (and deeper) reviews. */
  allow_reviewer_script_access: boolean
  /** Per-section visibility. Section-level Pro-gated. */
  sections: SectionVisibility
}

export const DEFAULT_PRIVACY: PrivacyDefaults = {
  // All toggles default ON (Anuj 2026-04-30): users start fully open
  // and dial back what they don't want, rather than starting closed
  // and missing reach.
  public_default: true,
  allow_industry: true,
  allow_reviewer_script_access: true,
  sections: {
    headline: true,
    cast: true,
    packaging: true,
    issues: true,
    complexity: true,
    risk: true,
    comps: true,
    score: true,
  },
}

/** Coerce an unknown JSONB blob into a fully-populated PrivacyDefaults
 *  with our defaults filling any missing fields. Safe to call on null
 *  (returns the canonical defaults). */
export function normalizePrivacyDefaults(input: unknown): PrivacyDefaults {
  const raw = (input ?? {}) as Partial<PrivacyDefaults> & { sections?: Partial<SectionVisibility> }
  return {
    public_default: typeof raw.public_default === 'boolean' ? raw.public_default : DEFAULT_PRIVACY.public_default,
    allow_industry: typeof raw.allow_industry === 'boolean' ? raw.allow_industry : DEFAULT_PRIVACY.allow_industry,
    allow_reviewer_script_access: typeof raw.allow_reviewer_script_access === 'boolean' ? raw.allow_reviewer_script_access : DEFAULT_PRIVACY.allow_reviewer_script_access,
    sections: {
      headline: raw.sections?.headline ?? DEFAULT_PRIVACY.sections.headline,
      cast: raw.sections?.cast ?? DEFAULT_PRIVACY.sections.cast,
      packaging: raw.sections?.packaging ?? DEFAULT_PRIVACY.sections.packaging,
      issues: raw.sections?.issues ?? DEFAULT_PRIVACY.sections.issues,
      complexity: raw.sections?.complexity ?? DEFAULT_PRIVACY.sections.complexity,
      risk: raw.sections?.risk ?? DEFAULT_PRIVACY.sections.risk,
      comps: raw.sections?.comps ?? DEFAULT_PRIVACY.sections.comps,
      score: raw.sections?.score ?? DEFAULT_PRIVACY.sections.score,
    },
  }
}
