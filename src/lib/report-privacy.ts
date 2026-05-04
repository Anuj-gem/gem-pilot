// Writer-controlled per-section privacy for report pages.
//
// Mental model:
//   - is_public (on submissions) = "is this report visible to industry"
//   - report_privacy (JSONB on submissions) = "what does a non-owner see"
//
// Owner (or admin) always sees everything. Non-owners see only the sections
// marked 'public'. Private sections are HIDDEN — not blurred. The visitor is
// nudged toward a single "Contact writer" card at the bottom of the page.
//
// Source of truth for section keys, defaults, and presets lives here so the
// DB shape (JSONB) stays stable as we iterate on what's public by default.
//
// Selznick-4 v9 (2026-04-28): the privacy panel is now aligned with the
// new report layout — four section toggles (Why this is a hit, Cast,
// Packaging, Project Complexity) plus the score badge toggle. The
// Development considerations and Reference sections always render when
// the post is published. Dropped section keys: production_signal,
// deep_dive_production, deep_dive_development, deep_dive_narrative.
// `normalizePrivacy` silently strips entries for those keys from any old
// DB row, so writers fall back to all-public defaults until they re-tune.

export type Visibility = 'public' | 'private'

/** Commercial score floor that puts a report on the "qualifies for the
 *  Discover Portal" side of the line. Lives in this server-safe file (not
 *  the 'use client' qualification-banner) so server components on the
 *  dashboard + report page can import it without build-time caveats. */
export const QUALIFICATION_THRESHOLD = 50

/** Section keys map 1:1 to the four visible sections in the report UI.
 *  Keys are persisted in the DB; the labels in SECTION_META are what the
 *  writer reads. */
export type SectionKey =
  | 'whats_working'              // "Why this is a hit"
  | 'deep_dive_characters'       // "Cast" (was Lead Characters)
  | 'deep_dive_package'          // "Packaging"
  | 'project_complexity'         // "Project Complexity" (Production + Cast cards)
  | 'development_considerations' // "Development considerations" (Issues + craft note)

export const SECTION_KEYS: SectionKey[] = [
  'whats_working',
  'deep_dive_characters',
  'deep_dive_package',
  'project_complexity',
  'development_considerations',
]

export interface SectionMeta {
  key: SectionKey
  label: string
  /** Short description shown in the privacy panel. */
  hint: string
  /** Grouping for the modal UI. With the slim 4-section model this is
   *  effectively cosmetic — kept for back-compat with components that
   *  still import the type. */
  group: 'pitch' | 'development'
}

export const SECTION_META: Record<SectionKey, SectionMeta> = {
  whats_working: {
    key: 'whats_working',
    label: 'Why this is a hit',
    hint: 'The strongest notes on why the script lands.',
    group: 'pitch',
  },
  deep_dive_characters: {
    key: 'deep_dive_characters',
    label: 'Cast',
    hint: 'Lead and supporting characters with actor appeal.',
    group: 'pitch',
  },
  deep_dive_package: {
    key: 'deep_dive_package',
    label: 'Packaging',
    hint: 'Audience, budget tier, franchise potential.',
    group: 'pitch',
  },
  project_complexity: {
    key: 'project_complexity',
    label: 'Project Complexity',
    hint: 'Production and cast lift — what to plan for.',
    group: 'development',
  },
  development_considerations: {
    key: 'development_considerations',
    label: 'Development considerations',
    hint: 'The case-against — issues a buyer would flag.',
    group: 'development',
  },
}

/** Shape stored in script_submissions.report_privacy. We version it so we can
 *  migrate defaults without rewriting DB rows. */
export interface ReportPrivacy {
  version: 1
  sections: Partial<Record<SectionKey, Visibility>>
  /** Whether the commercial score badge is visible to non-owners on the
   *  report page top card. Defaults to true (score visible) when unset.
   *  Owners always see their own score regardless. */
  show_score?: boolean
  migrated_at?: string
}

/** Default visibility for a NEW report that's never been adjusted.
 *
 *  2026-04-27: All public by default. Writers narrow visibility from the
 *  privacy modal if they want.
 */
const DEFAULT_VISIBILITY: Record<SectionKey, Visibility> = {
  whats_working:              'public',
  deep_dive_characters:       'public',
  deep_dive_package:          'public',
  project_complexity:         'public',
  development_considerations: 'public',
}

export type PresetKey = 'pitch_only' | 'pitch_plus_dev'

export interface Preset {
  key: PresetKey
  label: string
  blurb: string
  sections: Record<SectionKey, Visibility>
}

/** Named presets — fast paths for the privacy modal. With the slim
 *  4-section model these effectively become "show pitch only" vs
 *  "show everything". Custom is anything in between. */
export const PRESETS: Record<PresetKey, Preset> = {
  pitch_only: {
    key: 'pitch_only',
    label: 'Pitch only',
    blurb: 'Why this is a hit, cast, and packaging. (Top card always shown.)',
    sections: {
      whats_working:              'public',
      deep_dive_characters:       'public',
      deep_dive_package:          'public',
      project_complexity:         'private',
      development_considerations: 'private',
    },
  },
  pitch_plus_dev: {
    key: 'pitch_plus_dev',
    label: 'Everything',
    blurb: 'All five sections visible to industry partners.',
    sections: {
      whats_working:              'public',
      deep_dive_characters:       'public',
      deep_dive_package:          'public',
      project_complexity:         'public',
      development_considerations: 'public',
    },
  },
}

export function allPrivate(): Record<SectionKey, Visibility> {
  return SECTION_KEYS.reduce(
    (acc, k) => {
      acc[k] = 'private'
      return acc
    },
    {} as Record<SectionKey, Visibility>
  )
}

/** Given the raw JSONB from the DB (or missing/null), resolve a section's
 *  visibility for display. Empty/legacy rows fall through to DEFAULT_VISIBILITY. */
export function resolveVisibility(
  privacy: ReportPrivacy | null | undefined,
  key: SectionKey
): Visibility {
  const override = privacy?.sections?.[key]
  if (override === 'public' || override === 'private') return override
  return DEFAULT_VISIBILITY[key]
}

/** Public-facing gate used throughout the render tree. Owner/admin always
 *  sees the section; non-owners see only public sections. */
export function isSectionVisible(params: {
  privacy: ReportPrivacy | null | undefined
  section: SectionKey
  /** Owner (true) or admin (true) → always visible. */
  isOwnerOrAdmin: boolean
}): boolean {
  // opportunities-v1: all sections visible to everyone. Reports are fully
  // exposed — privacy gating stripped for the test site. Backend privacy
  // columns remain intact for production.
  return true
}

/** For the writer UI: given a section, is it currently marked public? Uses
 *  resolveVisibility so unset keys show their default state. */
export function sectionIsPublic(
  privacy: ReportPrivacy | null | undefined,
  key: SectionKey
): boolean {
  return resolveVisibility(privacy, key) === 'public'
}

/** Count how many sections are currently public. */
export function publicSectionCount(privacy: ReportPrivacy | null | undefined): number {
  return SECTION_KEYS.filter((k) => sectionIsPublic(privacy, k)).length
}

/** Match the current settings against a preset. Returns null if custom. */
export function matchPreset(privacy: ReportPrivacy | null | undefined): PresetKey | null {
  for (const preset of Object.values(PRESETS)) {
    const allMatch = SECTION_KEYS.every(
      (k) => resolveVisibility(privacy, k) === preset.sections[k]
    )
    if (allMatch) return preset.key
  }
  return null
}

/** Validate/normalize a privacy object coming in from the API. Drops unknown
 *  keys so we don't accidentally persist garbage — and so that retired
 *  section keys (production_signal, deep_dive_production, etc.) silently
 *  fall away. */
export function normalizePrivacy(input: unknown): ReportPrivacy {
  const empty: ReportPrivacy = { version: 1, sections: {} }
  if (!input || typeof input !== 'object') return empty
  const maybe = input as { version?: number; sections?: Record<string, unknown>; show_score?: unknown }
  const sections: Partial<Record<SectionKey, Visibility>> = {}
  if (maybe.sections && typeof maybe.sections === 'object') {
    for (const k of SECTION_KEYS) {
      const v = maybe.sections[k]
      if (v === 'public' || v === 'private') {
        sections[k] = v
      }
    }
  }
  const out: ReportPrivacy = { version: 1, sections }
  if (typeof maybe.show_score === 'boolean') {
    out.show_score = maybe.show_score
  }
  return out
}

/** Whether the score badge should render for a non-owner viewer. Defaults to
 *  true; only false if the writer explicitly turned it off. Owners always
 *  see their own score regardless of this flag. */
export function isScoreVisible(
  privacy: ReportPrivacy | null | undefined
): boolean {
  // opportunities-v1: score always visible to everyone. Old per-script
  // show_score toggles are dead — matches isSectionVisible behavior.
  return true
}

/** Default privacy used when creating a new published report. */
export function defaultPrivacy(): ReportPrivacy {
  return {
    version: 1,
    sections: { ...DEFAULT_VISIBILITY },
  }
}
