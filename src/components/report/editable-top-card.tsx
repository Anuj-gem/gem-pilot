'use client'

// Owner-editable top card on the report page. Renders title + classification
// pills + logline hero. When the owner clicks the pencil it flips to an inline
// editor for four fields: Title, Genre (primary + up to 2 secondaries), Tone,
// Logline. Format is NOT editable (it drives scoring and is declared at
// submission — editing it post-hoc would silently decouple label from score).
//
// Save posts to /api/evaluations/[id]/edit, then router.refresh() pulls the
// new values from the server. Revert-all uses the same endpoint with
// { revert: true }.
//
// Non-owners see the same layout without the pencil; edit mode can also be
// pre-opened from dashboard via ?edit=1 which auto-scrolls + flips the card.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Check, X, RotateCcw, Loader2 } from 'lucide-react'
import {
  LOGLINE_WORD_CAP,
  LOCKED_GENRE_VOCAB,
  canonicalizeGenre,
  loglineWordCount,
  type TopCardDisplay,
} from '@/lib/edited-fields'

interface Props {
  evaluationId: string
  /** script_submissions.id — needed for the inline tag editor, which posts
   *  to /api/scripts/[id]/tags (a different endpoint from the eval-fields
   *  edit endpoint). */
  submissionId: string
  initial: TopCardDisplay
  isOwner: boolean
  hasEdits: boolean
  postedAt: string | null
  /** Extra action(s) to render to the LEFT of the Edit button, in the
   *  card's top-right action row. Used by the report page to slot the
   *  Download pill in next to Edit. */
  headerActionsLeft?: React.ReactNode
  /** Writer's full name (from profiles.full_name). Rendered as read-only
   *  "By {name}" under the title. Null/empty when the submission is anonymous
   *  or the profile has no name set, in which case the line is omitted.
   *  Full profile editing comes later — for now this is display-only. */
  authorName?: string | null
}

// Tag editor constants — mirror src/components/dashboard/script-tags-editor.tsx
// and the server-side normalizer at /api/scripts/[id]/tags so the optimistic
// chip preview matches what the server will actually persist.
const MAX_TAGS = 25
const MAX_TAG_LEN = 30

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TAG_LEN)
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags ?? []) {
    if (typeof t !== 'string') continue
    const v = t.trim().toLowerCase()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

export function EditableTopCard({ evaluationId, submissionId, initial, isOwner, hasEdits, postedAt, authorName, headerActionsLeft }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoEdit = isOwner && searchParams?.get('edit') === '1'

  const [editing, setEditing] = useState<boolean>(autoEdit)
  const [saving, setSaving] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tags are part of the bundled edit-mode state — they're displayed in
  // display mode as read-only chips, and only become editable when the
  // writer is in the edit form. On Save we PATCH /api/scripts/[id]/tags in
  // parallel with the eval-fields edit endpoint (only if they actually
  // changed, to avoid a no-op write).
  const initialTagsList = useMemo(() => dedupeTags(initial.tags ?? []), [initial.tags])
  const [tags, setTags] = useState<string[]>(() => initialTagsList)
  const [tagDraft, setTagDraft] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)
  const tagsAtCap = tags.length >= MAX_TAGS

  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
    setTagError(null)
  }

  function handleAddTag() {
    const norm = normalizeTag(tagDraft)
    if (!norm) {
      setTagError('Tag must be letters, numbers, or hyphens.')
      return
    }
    if (tags.includes(norm)) {
      setTagError('That tag is already on this script.')
      return
    }
    if (tags.length >= MAX_TAGS) {
      setTagError(`Max ${MAX_TAGS} tags per script.`)
      return
    }
    setTags((prev) => [...prev, norm])
    setTagDraft('')
    setTagError(null)
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  // Editable state — seeded from what's currently being rendered.
  // Genre primary + secondary are normalized into the locked vocab so the
  // dropdowns line up with what's stored. Anything that doesn't match the
  // vocab (e.g. a legacy free-text entry) collapses to '' / drops out, and
  // the writer is free to pick a fresh value from the list.
  const [title, setTitle] = useState(initial.title)
  const [logline, setLogline] = useState(initial.logline)
  const [genrePrimary, setGenrePrimary] = useState<string>(
    () => canonicalizeGenre(initial.genre_primary) ?? ''
  )
  const [genreSecondary, setGenreSecondary] = useState<string[]>(() =>
    initial.genre_secondary
      .map((g) => canonicalizeGenre(g))
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .slice(0, 2)
  )
  const [tone, setTone] = useState(initial.tone)

  // Secondary dropdown options exclude whatever's selected as primary, so a
  // writer can't pick "Drama" twice.
  const secondaryOptionsForSlot = useMemo(() => {
    return (slotIndex: number) =>
      LOCKED_GENRE_VOCAB.filter((g) => {
        if (g === genrePrimary) return false
        const otherSlot = genreSecondary[1 - slotIndex]
        if (otherSlot && g === otherSlot) return false
        return true
      })
  }, [genrePrimary, genreSecondary])

  const cardRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when opened via ?edit=1 so the writer lands on the card
  useEffect(() => {
    if (autoEdit && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [autoEdit])

  function resetLocalToInitial() {
    setTitle(initial.title)
    setLogline(initial.logline)
    setGenrePrimary(canonicalizeGenre(initial.genre_primary) ?? '')
    setGenreSecondary(
      initial.genre_secondary
        .map((g) => canonicalizeGenre(g))
        .filter((g): g is NonNullable<typeof g> => g !== null)
        .slice(0, 2)
    )
    setTone(initial.tone)
    setTags(initialTagsList)
    setTagDraft('')
    setTagError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    // Eval-fields edit body (title/logline/genre/tone). Empty strings clear
    // the edit server-side. Secondary genres write to `genre_secondary` (v5.4
    // canonical key); we also clear the legacy `genre_tags` key so any old
    // edit doesn't keep bleeding through after a save.
    const editBody: Record<string, any> = {
      title,
      logline,
      genre_primary: genrePrimary,
      tone,
      genre_secondary: genreSecondary.filter((t) => t.trim().length > 0).slice(0, 2),
      genre_tags: [],
    }

    // Tags persist to a different endpoint (/api/scripts/[id]/tags) — only
    // PATCH if they actually changed. Compare normalized lists so order +
    // casing don't trigger a no-op write.
    const cleanedTags = dedupeTags(tags)
    const tagsChanged =
      cleanedTags.length !== initialTagsList.length ||
      cleanedTags.some((t, i) => t !== initialTagsList[i])

    try {
      // Run both writes in parallel; either failing surfaces an error and
      // keeps the writer in the editor so they can retry.
      const [editRes, tagsRes] = await Promise.all([
        fetch(`/api/evaluations/${evaluationId}/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editBody),
        }),
        tagsChanged
          ? fetch(`/api/scripts/${encodeURIComponent(submissionId)}/tags`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tags: cleanedTags }),
            })
          : Promise.resolve(null),
      ])

      if (!editRes.ok) {
        const j = await editRes.json().catch(() => ({}))
        setError(j?.error ?? `Save failed (${editRes.status})`)
        setSaving(false)
        return
      }
      if (tagsRes && !tagsRes.ok) {
        const j = await tagsRes.json().catch(() => ({}))
        setError(j?.error ?? `Tags save failed (${tagsRes.status})`)
        setSaving(false)
        return
      }

      setEditing(false)
      setSaving(false)
      // Let the server re-render with the new display values
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
      setSaving(false)
    }
  }

  async function revert() {
    if (!confirm('Revert to the original generated title, genre, tone, and headline?')) return
    setReverting(true)
    setError(null)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revert: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `Revert failed (${res.status})`)
        setReverting(false)
        return
      }
      setEditing(false)
      setReverting(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Revert failed')
      setReverting(false)
    }
  }

  const wordCount = loglineWordCount(logline)
  const overCap = wordCount > LOGLINE_WORD_CAP

  // ── Display mode ──────────────────────────────────────────────
  if (!editing) {
    return (
      <div ref={cardRef} className="relative">
        {/* Top-right action row: extra slotted actions (e.g. Download) on
            the left, Edit on the right. Wrapped together in one absolute
            container so they stay paired across viewports. */}
        {(isOwner || headerActionsLeft) && (
          <div className="absolute right-0 top-0 z-20 flex items-center gap-1.5 sm:gap-2">
            {headerActionsLeft}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  resetLocalToInitial()
                  setEditing(true)
                  setError(null)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] sm:text-[13px] text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)] transition-colors"
                aria-label="Edit title, genre, tone, and headline"
                title="Edit title, genre, tone, and headline"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}
          </div>
        )}

        {/* Title gets extra right-padding on mobile so the Download + Edit
            row above doesn't crash into it. Desktop has more room so a
            tighter pad is fine. */}
        <h1 className="text-[28px] sm:text-[44px] font-semibold text-[var(--gem-gray-50)] tracking-tight leading-[1.1] mb-2 sm:mb-4 pt-12 sm:pt-0 sm:pr-44">
          {initial.title}
        </h1>

        {/* Author byline — read-only, shown whenever the profile has a name.
            Full profile UI lands later; this is just to get the writer's name
            on the report for producers and reps viewing the page. */}
        {authorName && authorName.trim().length > 0 && (
          <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-400)] -mt-1 mb-3 sm:-mt-2 sm:mb-5 m-0">
            By <span className="text-[var(--gem-gray-200)]">{authorName}</span>
          </p>
        )}

        {/* Tier badge intentionally removed (2026-04-23). The qualification
            banner above the report carries the primary status signal; on the
            Industry/Discover page, presence on the page IS the signal — so
            doubling up with a "GEM Select" pill here was redundant noise and
            reintroduced score-anxiety framing. */}

<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 sm:gap-x-3 sm:gap-y-2 text-[13px] sm:text-[15px] text-[var(--gem-gray-300)] mb-3 sm:mb-4">
          {initial.format && <span>{initial.format}</span>}
          {initial.genre_primary && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span>{initial.genre_primary}</span>
            </>
          )}
          {initial.genre_secondary?.map((t, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-[13px] text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)]"
            >
              {t}
            </span>
          ))}
          {initial.tone && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span className="italic text-[var(--gem-gray-400)]">{initial.tone}</span>
            </>
          )}
          {postedAt && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span className="text-[var(--gem-gray-500)]">
                Posted{' '}
                {new Date(postedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </>
          )}
        </div>

        {/* Freeform tags row — read-only chips in display mode. Editing
            happens inside the edit form (Tags field) so it lives next to
            title/genre/tone/headline rather than as a separate sub-panel.
            Distinct visual treatment from genre pills (filled, lowercase,
            smaller) so a producer scanning the card can tell at a glance
            what's a controlled-vocab classifier vs a writer-supplied tag. */}
        {initialTagsList.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-5 sm:mb-10">
            {initialTagsList.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="px-2.5 py-1 rounded-full text-[12px] sm:text-[12.5px] font-medium"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--gem-gray-800)',
                  color: 'var(--gem-gray-300)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <div className="mb-5 sm:mb-10" />
        )}

        {initial.logline && (
          <div
            className="relative rounded-2xl p-5 sm:p-10 mb-6 sm:mb-12"
            style={{
              background: 'linear-gradient(135deg, rgba(200,164,92,0.10), transparent 70%)',
              border: '1px solid rgba(200,164,92,0.25)',
            }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-5 bottom-5 sm:top-7 sm:bottom-7 rounded-r"
              style={{ width: 4, background: 'var(--gem-gold)' }}
            />
            <div
              className="text-[12px] sm:text-[14px] uppercase tracking-[0.22em] font-bold mb-2.5 sm:mb-4"
              style={{ color: 'var(--gem-gold)' }}
            >
              Headline
            </div>
            <p className="text-[19px] sm:text-[30px] text-[var(--gem-gray-50)] leading-[1.35] font-medium m-0">
              {initial.logline}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Edit mode ─────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className="rounded-2xl p-6 sm:p-8 mb-12 border border-[var(--gem-gray-700)]"
      style={{ background: 'rgba(255,255,255,0.015)' }}
    >
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--gem-gray-800)]">
        <div className="text-[13px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gold)]">
          Editing
        </div>
        <div className="flex items-center gap-2">
          {hasEdits && (
            <button
              type="button"
              onClick={revert}
              disabled={saving || reverting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-[var(--gem-gray-400)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)] disabled:opacity-50 transition-colors"
              title="Discard all edits and restore generated values"
            >
              {reverting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Revert all
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              resetLocalToInitial()
              setEditing(false)
              setError(null)
            }}
            disabled={saving || reverting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-[var(--gem-gray-400)] border border-[var(--gem-gray-700)] hover:text-[var(--gem-white)] disabled:opacity-50 transition-colors"
          >
            <X size={13} />
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || reverting || title.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium bg-[var(--gem-gold)] text-[var(--gem-black)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save
          </button>
        </div>
      </div>

      {/* Title */}
      <label className="block mb-5">
        <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
          Title
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
          className="w-full text-[28px] sm:text-[32px] font-semibold text-[var(--gem-gray-50)] bg-transparent border-b border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none pb-2"
          placeholder="Your script title"
        />
      </label>

      {/* Genre (primary) + Tone row.
          Genre primary is now a locked-vocab dropdown — see LOCKED_GENRE_VOCAB.
          Tone stays a free-text input but with a 1-2-word hint and a tighter
          maxLength to keep it from drifting into tag territory. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <label className="block">
          <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
            Genre (primary)
          </span>
          <select
            value={genrePrimary}
            onChange={(e) => {
              const v = e.target.value
              setGenrePrimary(v)
              // If the new primary collides with an existing secondary slot,
              // clear that slot so we never duplicate a value.
              setGenreSecondary((prev) => prev.filter((g) => g !== v))
            }}
            className="w-full text-[15px] text-[var(--gem-gray-100)] bg-transparent border border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none rounded-md px-3 py-2"
          >
            <option value="">Select a genre…</option>
            {LOCKED_GENRE_VOCAB.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
            Tone
          </span>
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value.slice(0, 40))}
            maxLength={40}
            className="w-full text-[15px] text-[var(--gem-gray-100)] bg-transparent border border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none rounded-md px-3 py-2"
            placeholder="1-2 words — gritty, elevated, campy"
          />
          <span className="block text-[11px] text-[var(--gem-gray-500)] mt-1">
            One short stylistic word (or two). Anything longer belongs in the prose sections.
          </span>
        </label>
      </div>

      {/* Genre (secondary) — up to 2, picked from the same locked vocab.
          Each slot omits the value already chosen in the primary slot and the
          other secondary slot, so a writer can't pick the same genre twice. */}
      <div className="mb-5">
        <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
          Genre (secondary, up to 2)
        </span>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => {
            const value = genreSecondary[i] ?? ''
            const options = secondaryOptionsForSlot(i)
            return (
              <select
                key={i}
                value={value}
                onChange={(e) => {
                  const next = [...genreSecondary]
                  const v = e.target.value
                  if (v === '') {
                    next.splice(i, 1) // collapse the slot when cleared
                  } else {
                    next[i] = v
                  }
                  setGenreSecondary(next.slice(0, 2))
                }}
                className="w-full text-[14px] text-[var(--gem-gray-100)] bg-transparent border border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none rounded-md px-3 py-2"
              >
                <option value="">{i === 0 ? 'Optional secondary' : 'Optional third'}</option>
                {options.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )
          })}
        </div>
        <span className="block text-[11px] text-[var(--gem-gray-500)] mt-2">
          Pick up to two more genres from the same list — leave blank if the script lives in one lane.
        </span>
      </div>

      {/* Tags — freeform descriptors stored on script_submissions.tags.
          Persist on Save (parallel with the eval-fields edit). */}
      <div className="mb-5">
        <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
          Tags
        </span>
        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 rounded-md px-3 py-2 border border-[var(--gem-gray-700)]"
          style={{ background: 'rgba(255,255,255,0.015)' }}
        >
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-[12.5px] font-medium"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--gem-gray-800)',
                color: 'var(--gem-gray-200)',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full transition-colors hover:bg-[var(--gem-gray-800)] hover:text-[var(--gem-gray-50)]"
                style={{ color: 'var(--gem-gray-500)' }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          {!tagsAtCap && (
            <span className="inline-flex items-center gap-1 flex-1 min-w-[160px]">
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => {
                  setTagDraft(e.target.value)
                  if (tagError) setTagError(null)
                }}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Add tags — press Enter after each' : 'Add another'}
                maxLength={MAX_TAG_LEN}
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[var(--gem-gray-100)] placeholder:text-[var(--gem-gray-500)] py-1 px-1"
                aria-label="Add a tag"
              />
              {tagDraft.trim() && (
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                  style={{ background: 'var(--gem-gold)', color: 'var(--gem-black)' }}
                >
                  Add
                </button>
              )}
            </span>
          )}
        </div>
        <span className="block text-[11px] text-[var(--gem-gray-500)] mt-1">
          Short, hyphenated descriptors (e.g. <span className="text-[var(--gem-gray-400)]">female-lead, single-location, character-driven</span>). Press Enter to add.
          {tagsAtCap && ` Max ${MAX_TAGS} — remove one to add another.`}
        </span>
        {tagError && (
          <p className="text-[12px] text-red-400 mt-1.5 m-0">{tagError}</p>
        )}
      </div>

      {/* Headline (stored as edited_fields.logline / positioning_hook) */}
      <label className="block">
        <span className="flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
          <span>Headline</span>
          <span
            className={overCap ? 'text-[var(--gem-warning)]' : 'text-[var(--gem-gray-500)]'}
            style={{ textTransform: 'none', letterSpacing: 0 }}
          >
            {wordCount} words · {LOGLINE_WORD_CAP} recommended
          </span>
        </span>
        <textarea
          value={logline}
          onChange={(e) => setLogline(e.target.value)}
          rows={3}
          className="w-full text-[18px] text-[var(--gem-gray-50)] leading-[1.5] bg-transparent border border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none rounded-md px-4 py-3 resize-vertical"
          placeholder="The one sentence a manager would paste into an email to a producer."
        />
        {overCap && (
          <p className="text-[12px] text-[var(--gem-warning)] mt-2">
            Over the {LOGLINE_WORD_CAP}-word guideline — shorter headlines tend to land harder, but you can save it as is.
          </p>
        )}
      </label>

      {/* Format is intentionally NOT editable — it drives scoring and was
          declared at submission. Display it read-only for context. */}
      {initial.format && (
        <div className="mt-6 pt-4 border-t border-[var(--gem-gray-800)] text-[13px] text-[var(--gem-gray-500)]">
          Format: <span className="text-[var(--gem-gray-300)]">{initial.format}</span>
          <span className="ml-2 text-[var(--gem-gray-600)]">
            (locked — format is declared at submission and drives scoring)
          </span>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-red-400 mt-5">
          {error}
        </p>
      )}
    </div>
  )
}
