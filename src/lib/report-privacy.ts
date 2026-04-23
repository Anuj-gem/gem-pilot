// Writer-controlled per-section privacy for report pages.
//
// Mental model:
//   - is_public (on submissions) = "is this report on Discover"
//   - report_privacy (JSONB on submissions) = "what does a non-owner see"
//
// Owner (or admin) always sees everything. Non-owners see only the sections
// marked 'public'. Private sections are HIDDEN — not blurred. The visitor is
// nudged toward a single "Contact writer" card at the bottom of the page.
//
// Source of truth for section keys, defaults, and presets lives here so the
// DB shape (JSONB) stays stable as we iterate on what's public by default.

export type Visibility = 'public' | 'private'

/** Section keys map 1:1 to bounded chunks of the report UI. Names mirror the
 *  actual section headings in the report page (keep these aligned so writers
 *  see the same labels in the privacy modal and in the report body).
 *
 *  Internal key names stay as-is for DB compatibility with rows written before
 *  the label rename (2026-04-23). Only the UI labels in SECTION_META changed. */
export type SectionKey =
  | 'headline'              // top card: title + headline (logline)
  | 'score'                 // commercial potential score + tier
  | 'whats_working'         // "Why this is a hit" strengths
  | 'production_signal'     // Production Planning Overview (at-a-glance cards)
  | 'deep_dive_characters'  // Lead Characters + actor appeal
  | 'deep_dive_package'     // Package Angles (director + buyer)
  | 'deep_dive_production'  // Production Planning Details (full)
  | 'deep_dive_development' // Development Priorities (incl. primary lever + craft note)
  | 'deep_dive_narrative'   // Narrative Breakdown (10-dim)

export const SECTION_KEYS: SectionKey[] = [
  'headline',
  'score',
  'whats_working',
  'production_signal',
  'deep_dive_characters',
  'deep_dive_package',
  'deep_dive_production',
  'deep_dive_development',
  'deep_dive_narrative',
]

export interface SectionMeta {
  key: SectionKey
  label: string
  /** Short description shown in the privacy panel. */
  hint: string
  /** Grouping for the panel UI: summary = exec block, deep = deep-dive rows. */
  group: 'summary' | 'deep'
}

export const SECTION_META: Record<SectionKey, SectionMeta> = {
  headline: {
    key: 'headline',
    label: 'Headline',
    hint: 'Your title + one-line headline.',
    group: 'summary',
  },
  score: {
    key: 'score',
    label: 'Score',
    hint: 'Commercial potential score + tier.',
    group: 'summary',
  },
  whats_working: {
    key: 'whats_working',
    label: 'Why this is a hit',
    hint: 'The strongest notes on why the script lands.',
    group: 'summary',
  },
  production_signal: {
    key: 'production_signal',
    label: 'Production Planning Overview',
    hint: 'Cost, cast, and content complexity at a glance.',
    group: 'summary',
  },
  deep_dive_characters: {
    key: 'deep_dive_characters',
    label: 'Lead Characters',
    hint: 'Full character breakdown + actor appeal.',
    group: 'deep',
  },
  deep_dive_package: {
    key: 'deep_dive_package',
    label: 'Package Angles',
    hint: 'Who would direct it, who would buy it.',
    group: 'deep',
  },
  deep_dive_production: {
    key: 'deep_dive_production',
    label: 'Production Planning Details',
    hint: 'Cast count, locations, VFX/stunts, rights flags.',
    group: 'deep',
  },
  deep_dive_development: {
    key: 'deep_dive_development',
    label: 'Development Priorities',
    hint: 'Sharpest lever, craft note, and all other development notes.',
    group: 'deep',
  },
  deep_dive_narrative: {
    key: 'deep_dive_narrative',
    label: 'Narrative Breakdown',
    hint: '10 dimension scores + reasoning.',
    group: 'deep',
  },
}

/** Shape stored in script_submissions.report_privacy. We version it so we can
 *  migrate defaults without rewriting DB rows. */
export interface ReportPrivacy {
  version: 1
  sections: Partial<Record<SectionKey, Visibility>>
  migrated_at?: string
}

/** Default visibility for a NEW report that's never been adjusted.
 *  Anuj's call (2026-04-23 iteration): Teaser is the floor for everyone —
 *  only the headline is public by default. Writers pick a preset (or go
 *  Custom) when they open the privacy modal, so the default is deliberately
 *  conservative. Nothing leaks until the writer picks a broader preset. */
const DEFAULT_VISIBILITY: Record<SectionKey, Visibility> = {
  headline:              'public',
  score:                 'private',
  whats_working:         'private',
  production_signal:     'private',
  deep_dive_characters:  'private',
  deep_dive_package:     'private',
  deep_dive_production:  'private',
  deep_dive_development: 'private',
  deep_dive_narrative:   'private',
}

export type PresetKey = 'teaser' | 'balanced' | 'open'

export interface Preset {
  key: PresetKey
  label: string
  blurb: string
  sections: Record<SectionKey, Visibility>
}

export const PRESETS: Record<PresetKey, Preset> = {
  teaser: {
    key: 'teaser',
    label: 'Teaser',
    blurb: 'Headline and what\'s working. Everything else stays with you.',
    sections: {
      ...allPrivate(),
      headline: 'public',
      whats_working: 'public',
    },
  },
  balanced: {
    key: 'balanced',
    label: 'Balanced',
    blurb: 'The producer pitch — headline, what\'s working, lead characters, and package angles.',
    sections: {
      ...allPrivate(),
      headline: 'public',
      whats_working: 'public',
      deep_dive_characters: 'public',
      deep_dive_package: 'public',
    },
  },
  open: {
    key: 'open',
    label: 'Open book',
    blurb: 'Everything. No sections private.',
    sections: {
      headline: 'public',
      score: 'public',
      whats_working: 'public',
      production_signal: 'public',
      deep_dive_characters: 'public',
      deep_dive_package: 'public',
      deep_dive_production: 'public',
      deep_dive_development: 'public',
      deep_dive_narrative: 'public',
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
  if (params.isOwnerOrAdmin) return true
  return resolveVisibility(params.privacy, params.section) === 'public'
}

/** For the writer UI: given a section, is it currently marked public? Uses
 *  resolveVisibility so unset keys show their default state. */
export function sectionIsPublic(
  privacy: ReportPrivacy | null | undefined,
  key: SectionKey
): boolean {
  return resolveVisibility(privacy, key) === 'public'
}

/** Count how many sections are currently public. Drives the privacy summary
 *  line ("3 of 10 sections visible") in the writer UI. */
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
 *  keys so we don't accidentally persist garbage. */
export function normalizePrivacy(input: unknown): ReportPrivacy {
  const empty: ReportPrivacy = { version: 1, sections: {} }
  if (!input || typeof input !== 'object') return empty
  const maybe = input as { version?: number; sections?: Record<string, unknown> }
  const sections: Partial<Record<SectionKey, Visibility>> = {}
  if (maybe.sections && typeof maybe.sections === 'object') {
    for (const k of SECTION_KEYS) {
      const v = maybe.sections[k]
      if (v === 'public' || v === 'private') {
        sections[k] = v
      }
    }
  }
  return { version: 1, sections }
}

/** Default privacy used when creating a new published report. */
export function defaultPrivacy(): ReportPrivacy {
  return {
    version: 1,
    sections: { ...DEFAULT_VISIBILITY },
  }
}
