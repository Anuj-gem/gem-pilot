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

/** Commercial score floor that puts a report on the "qualifies for the
 *  Discover Portal" side of the line. Lives in this server-safe file (not
 *  the 'use client' qualification-banner) so server components on the
 *  dashboard + report page can import it without build-time caveats. */
export const QUALIFICATION_THRESHOLD = 50

/** Section keys map 1:1 to bounded chunks of the report UI. Names mirror the
 *  actual section headings in the report page (keep these aligned so writers
 *  see the same labels in the privacy modal and in the report body).
 *
 *  Internal key names stay as-is for DB compatibility with rows written before
 *  the label rename (2026-04-23). Only the UI labels in SECTION_META changed. */
// NOTE (2026-04-23): `headline` was removed from this enum. The top card
// (title + author + format + tags + posted date + headline) is ALWAYS
// visible whenever a report is published — it's the bare minimum context a
// visitor needs for anything else to make sense. Old DB rows with
// `headline: 'private'` are silently ignored by normalizePrivacy.
export type SectionKey =
  | 'whats_working'         // "Why this is a hit" strengths
  | 'production_signal'     // Production Planning Overview (at-a-glance cards)
  | 'deep_dive_characters'  // Lead Characters + actor appeal
  | 'deep_dive_package'     // Package Angles (director + buyer)
  | 'deep_dive_production'  // Production Planning Details (full)
  | 'deep_dive_development' // Development Priorities (incl. primary lever + craft note)
  | 'deep_dive_narrative'   // Narrative Breakdown (10-dim)

/** Score is deliberately NOT a section. Anuj's 2026-04-23 call: the numeric
 *  score is never shown to writers directly, and shouldn't be a toggle
 *  visitors can opt into. Qualification (≥50) is the only score-derived
 *  signal that surfaces publicly, via the qualification banner. */
export const SECTION_KEYS: SectionKey[] = [
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
  /** Grouping for the modal UI:
   *    'pitch'       — the 4 sections that make up the producer pitch
   *                    (headline, why this is a hit, lead characters, package angles)
   *    'development' — everything else: score, production overview/details,
   *                    development priorities, narrative breakdown. */
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
    label: 'Lead Characters',
    hint: 'Full character breakdown + actor appeal.',
    group: 'pitch',
  },
  deep_dive_package: {
    key: 'deep_dive_package',
    label: 'Package Angles',
    hint: 'Who would direct it, who would buy it.',
    group: 'pitch',
  },
  production_signal: {
    key: 'production_signal',
    label: 'Production Planning Overview',
    hint: 'Cost, cast, and content complexity at a glance.',
    group: 'development',
  },
  deep_dive_production: {
    key: 'deep_dive_production',
    label: 'Production Planning Details',
    hint: 'Cast count, locations, VFX/stunts, rights flags.',
    group: 'development',
  },
  deep_dive_development: {
    key: 'deep_dive_development',
    label: 'Development Priorities',
    hint: 'Sharpest lever, craft note, and all other development notes.',
    group: 'development',
  },
  deep_dive_narrative: {
    key: 'deep_dive_narrative',
    label: 'Narrative Breakdown',
    hint: '10 dimension scores + reasoning.',
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
 *  2026-04-27: Flipped to ALL PUBLIC by default per Anuj. Posts default to
 *  100% visible; writers narrow visibility from the privacy modal if they
 *  want. This is a deliberate posture change — we'd rather a producer
 *  reading a report sees the whole picture than a writer's guarded subset.
 *
 *  Note: existing rows with explicit per-section privacy in the DB are
 *  unaffected by this change — `resolveVisibility` returns the explicit
 *  override first, falls through to this default only when unset. */
const DEFAULT_VISIBILITY: Record<SectionKey, Visibility> = {
  whats_working:         'public',
  deep_dive_characters:  'public',
  deep_dive_package:     'public',
  production_signal:     'public',
  deep_dive_production:  'public',
  deep_dive_development: 'public',
  deep_dive_narrative:   'public',
}

export type PresetKey = 'pitch_only' | 'pitch_plus_dev'

export interface Preset {
  key: PresetKey
  label: string
  blurb: string
  sections: Record<SectionKey, Visibility>
}

/** Named presets — the fast path. Custom is a separate mode (all-private,
 *  writer toggles sections individually via the preview grid), not a preset. */
export const PRESETS: Record<PresetKey, Preset> = {
  pitch_only: {
    key: 'pitch_only',
    label: 'Pitch only',
    blurb: 'Why this is a hit, lead characters, and package angles. (Top card always shown.)',
    sections: {
      ...allPrivate(),
      whats_working: 'public',
      deep_dive_characters: 'public',
      deep_dive_package: 'public',
    },
  },
  pitch_plus_dev: {
    key: 'pitch_plus_dev',
    label: 'Pitch + development notes',
    blurb: 'Everything — pitch sections plus all development details.',
    sections: {
      // Everything public. This is the "open book" option, renamed to
      // match the two-tier mental model writers asked for.
      whats_working:         'public',
      production_signal:     'public',
      deep_dive_characters:  'public',
      deep_dive_package:     'public',
      deep_dive_production:  'public',
      deep_dive_development: 'public',
      deep_dive_narrative:   'public',
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
  return privacy?.show_score !== false
}

/** Default privacy used when creating a new published report. */
export function defaultPrivacy(): ReportPrivacy {
  return {
    version: 1,
    sections: { ...DEFAULT_VISIBILITY },
  }
}
