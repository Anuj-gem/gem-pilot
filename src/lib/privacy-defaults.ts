// Account-level privacy settings.
// Anuj 2026-04-30 v0.10.
//
// Lives on profiles.privacy_defaults (JSONB). Three top-level toggles
// + a section-visibility map keyed off the EXACT SectionKey vocab the
// per-script `script_submissions.report_privacy` already uses (see
// src/lib/report-privacy.ts). Same keys = the account default can
// flow into per-script defaults later without translation.

import { SECTION_KEYS, SECTION_META, type SectionKey } from './report-privacy'

export type SectionVisibility = Record<SectionKey, boolean>

export interface PrivacyDefaults {
  /** Auto-publish new scripts to Community on completion. New scripts
   *  inherit this as their initial `is_public` value. The writer can
   *  always unpublish any individual post later. */
  public_default: boolean
  /** Allow GEM members to review your scripts. "Allow reviews" =
   *  reviewers can read your script (the access IS the review). Off →
   *  no one can leave a community review on your scripts. */
  allow_reviews: boolean
  /** Allow GEM industry partners (producers, reps) to access your
   *  script and reach out. Off → matching skips this writer; producers
   *  can't read or download. */
  allow_industry: boolean
  /** Per-section visibility — same keys as the per-script
   *  ReportPrivacy.sections. */
  sections: SectionVisibility
  /** Score chip + scorecard visibility for non-owners. Owner always
   *  sees their own score. */
  show_score: boolean
}

const ALL_SECTIONS_VISIBLE: SectionVisibility = SECTION_KEYS.reduce(
  (acc, k) => { acc[k] = true; return acc },
  {} as SectionVisibility,
)

export const DEFAULT_PRIVACY: PrivacyDefaults = {
  // All toggles default ON (Anuj 2026-04-30): users start fully open
  // and dial back what they don't want, rather than starting closed
  // and missing reach.
  public_default: true,
  allow_reviews: true,
  allow_industry: true,
  sections: ALL_SECTIONS_VISIBLE,
  show_score: true,
}

/** Coerce an unknown JSONB blob into a fully-populated PrivacyDefaults
 *  with our defaults filling any missing fields. Safe to call on null
 *  (returns the canonical defaults). */
export function normalizePrivacyDefaults(input: unknown): PrivacyDefaults {
  const raw = (input ?? {}) as Partial<PrivacyDefaults> & { sections?: Partial<SectionVisibility> }
  const sections: SectionVisibility = SECTION_KEYS.reduce((acc, k) => {
    const v = raw.sections?.[k]
    acc[k] = typeof v === 'boolean' ? v : true
    return acc
  }, {} as SectionVisibility)
  // Back-compat: accept legacy `allow_reviewer_script_access` field
  // as a synonym for the renamed `allow_reviews`.
  const legacy = raw as { allow_reviewer_script_access?: boolean }
  const reviews =
    typeof raw.allow_reviews === 'boolean' ? raw.allow_reviews
    : typeof legacy.allow_reviewer_script_access === 'boolean' ? legacy.allow_reviewer_script_access
    : DEFAULT_PRIVACY.allow_reviews
  return {
    public_default: typeof raw.public_default === 'boolean' ? raw.public_default : DEFAULT_PRIVACY.public_default,
    allow_reviews: reviews,
    allow_industry: typeof raw.allow_industry === 'boolean' ? raw.allow_industry : DEFAULT_PRIVACY.allow_industry,
    sections,
    show_score: typeof raw.show_score === 'boolean' ? raw.show_score : DEFAULT_PRIVACY.show_score,
  }
}

/** Section list (key + label) for rendering the privacy form. Pulls
 *  from the canonical SECTION_META so it matches what's actually on
 *  the report page. */
export function privacySectionList(): { key: SectionKey | 'show_score'; label: string }[] {
  return [
    ...SECTION_KEYS.map((k) => ({ key: k as SectionKey | 'show_score', label: SECTION_META[k].label })),
    { key: 'show_score' as const, label: 'GEM Score' },
  ]
}
