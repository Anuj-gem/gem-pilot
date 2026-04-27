// Helper for the report top-card edit flow.
//
// Writers can edit four fields on the top card — Title, Genre (primary +
// secondary genres from the locked vocabulary), Tone, and Logline. Title is
// written in-place on script_submissions.title; the other three are stored as
// JSONB on script_evaluations.edited_fields so the original generated values
// are always preserved.
//
// UI reads should go through getDisplayTopCard() so the fallback from
// edited_fields → evaluation.classification stays consistent everywhere.
// The field labeled "Logline" in the UI is stored as positioning_hook in
// the evaluation JSON — see MEMORY.md.
//
// genre_secondary vs genre_tags: v5.4 standardized secondary genres into the
// `genre_secondary` field (locked controlled vocab). Older edits and older
// generated evals stored them under `genre_tags`. We read both as fallback
// so legacy data still renders, and write new edits to `genre_secondary`.

import type { GEMEvaluation } from '@/types'

/** Shape of the edited_fields jsonb column. Keys are optional. */
export interface EditedFields {
  logline?: string
  genre_primary?: string
  /** v5.4 — controlled-vocab secondary genres (0-2). New edits write here. */
  genre_secondary?: string[]
  /** @deprecated pre-v5.4 — old edits stored secondary picks here. Read for
   *  backward compat; new edits go to `genre_secondary`. */
  genre_tags?: string[]
  tone?: string
}

/** What the top card renders. All four are strings/arrays the writer can edit. */
export interface TopCardDisplay {
  title: string
  logline: string
  genre_primary: string
  /** Secondary genres for display. Sourced from edited_fields.genre_secondary
   *  (preferred), falling back to edited_fields.genre_tags (legacy edit) or
   *  the eval's classification.genre_secondary / classification.genre_tags. */
  genre_secondary: string[]
  tone: string
  /** Format is NOT editable — it drives scoring and is declared at submission. */
  format: string
  /** Writer-editable tags. Source of truth is `script_submissions.tags`,
   *  not the eval JSON. Edited via the dedicated tag chips editor (see
   *  ScriptTagsEditor / /api/scripts/[id]/tags). Empty array if none. */
  tags: string[]
}

/**
 * Given the stored evaluation payload plus any writer edits, the submission
 * title, and the submission's tag list, produce the values the top card
 * should render.
 *
 * Edited values win over the original evaluation content. A missing / empty
 * edited value falls through to the generated value. Handles legacy evaluations
 * where classification may live under `format_detection` instead.
 *
 * `submissionTags` is the source of truth for tags — they live on
 * `script_submissions.tags`, not on the eval JSON, because the writer can edit
 * them post-eval via the dedicated tags editor. Pass [] when no tags exist.
 */
export function getDisplayTopCard(
  evaluation: GEMEvaluation | null | undefined,
  editedFields: EditedFields | null | undefined,
  submissionTitle: string,
  submissionTags: string[] | null | undefined = []
): TopCardDisplay {
  const ef = editedFields ?? {}
  const cls: any =
    (evaluation as any)?.classification ??
    (evaluation as any)?.format_detection ??
    {}

  const generatedLogline =
    (evaluation as any)?.positioning_hook ??
    cls.logline ??
    ''

  // Secondary genres — prefer edited_fields.genre_secondary (current key),
  // fall back to edited_fields.genre_tags (legacy edit key), then to the
  // generated eval's genre_secondary, then to the eval's legacy genre_tags.
  const editedSecondary = pickArray(ef.genre_secondary) ?? pickArray(ef.genre_tags)
  const generatedSecondary =
    pickArray(cls.genre_secondary) ?? pickArray(cls.genre_tags) ?? []

  return {
    title: submissionTitle,
    logline: nonEmpty(ef.logline) ?? generatedLogline ?? '',
    genre_primary: nonEmpty(ef.genre_primary) ?? cls.genre_primary ?? '',
    genre_secondary: editedSecondary ?? generatedSecondary,
    tone: nonEmpty(ef.tone) ?? cls.tone ?? '',
    format: cls.format ?? '',
    tags: Array.isArray(submissionTags)
      ? submissionTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [],
  }
}

/** True if the writer has any non-empty edit on the top card. */
export function hasEdits(editedFields: EditedFields | null | undefined): boolean {
  const ef = editedFields ?? {}
  return (
    !!nonEmpty(ef.logline) ||
    !!nonEmpty(ef.genre_primary) ||
    !!nonEmpty(ef.tone) ||
    (Array.isArray(ef.genre_secondary) && ef.genre_secondary.length > 0) ||
    (Array.isArray(ef.genre_tags) && ef.genre_tags.length > 0)
  )
}

/** Word-count helper used by the logline input (22-word soft cap). */
export function loglineWordCount(s: string): number {
  const trimmed = s.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export const LOGLINE_WORD_CAP = 22

function nonEmpty(s: string | null | undefined): string | null {
  if (typeof s !== 'string') return null
  const t = s.trim()
  return t.length > 0 ? s : null
}

/** Returns the array if it's a non-empty string array, otherwise null.
 *  Used for the cascading fallback: edited → legacy edited → generated. */
function pickArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const filtered = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  return filtered.length > 0 ? filtered : null
}

/** Locked genre vocabulary — must match STEP 1 of evaluation-prompt-v5-4.ts.
 *  Editor dropdowns (primary + secondary) pick from this list. */
export const LOCKED_GENRE_VOCAB = [
  'Drama',
  'Comedy',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Action',
  'Crime',
  'Mystery',
  'Romance',
  'Western',
  'Musical',
  'Family',
  'Historical',
  'War',
  'Sports',
  'Documentary',
] as const

export type LockedGenre = typeof LOCKED_GENRE_VOCAB[number]

/** Case-insensitive normalize to the locked-vocab spelling. Returns the
 *  canonical capitalization if found, otherwise null. */
export function canonicalizeGenre(input: string | null | undefined): LockedGenre | null {
  if (!input) return null
  const needle = input.trim().toLowerCase()
  if (!needle) return null
  for (const g of LOCKED_GENRE_VOCAB) {
    if (g.toLowerCase() === needle) return g
  }
  return null
}
