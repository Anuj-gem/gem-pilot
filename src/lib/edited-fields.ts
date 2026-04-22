// Helper for the report top-card edit flow.
//
// Writers can edit four fields on the top card — Title, Genre (primary +
// secondaries), Tone, and Logline. Title is written in-place on
// script_submissions.title; the other three are stored as JSONB on
// script_evaluations.edited_fields so the original generated values are
// always preserved.
//
// UI reads should go through getDisplayTopCard() so the fallback from
// edited_fields → evaluation.classification stays consistent everywhere.
// The field labeled "Logline" in the UI is stored as positioning_hook in
// the evaluation JSON — see MEMORY.md.

import type { GEMEvaluation } from '@/types'

/** Shape of the edited_fields jsonb column. Keys are optional. */
export interface EditedFields {
  logline?: string
  genre_primary?: string
  genre_tags?: string[]
  tone?: string
}

/** What the top card renders. All four are strings/arrays the writer can edit. */
export interface TopCardDisplay {
  title: string
  logline: string
  genre_primary: string
  genre_tags: string[]
  tone: string
  /** Format is NOT editable — it drives scoring and is declared at submission. */
  format: string
}

/**
 * Given the stored evaluation payload plus any writer edits and the submission
 * title, produce the values the top card should render.
 *
 * Edited values win over the original evaluation content. A missing / empty
 * edited value falls through to the generated value. Handles legacy evaluations
 * where classification may live under `format_detection` instead.
 */
export function getDisplayTopCard(
  evaluation: GEMEvaluation | null | undefined,
  editedFields: EditedFields | null | undefined,
  submissionTitle: string
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

  return {
    title: submissionTitle,
    logline: nonEmpty(ef.logline) ?? generatedLogline ?? '',
    genre_primary: nonEmpty(ef.genre_primary) ?? cls.genre_primary ?? '',
    genre_tags: Array.isArray(ef.genre_tags) && ef.genre_tags.length > 0
      ? ef.genre_tags
      : Array.isArray(cls.genre_tags) ? cls.genre_tags : [],
    tone: nonEmpty(ef.tone) ?? cls.tone ?? '',
    format: cls.format ?? '',
  }
}

/** True if the writer has any non-empty edit on the top card. */
export function hasEdits(editedFields: EditedFields | null | undefined): boolean {
  const ef = editedFields ?? {}
  return (
    !!nonEmpty(ef.logline) ||
    !!nonEmpty(ef.genre_primary) ||
    !!nonEmpty(ef.tone) ||
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
