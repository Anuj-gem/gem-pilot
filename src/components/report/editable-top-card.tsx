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

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Check, X, RotateCcw, Loader2, Plus } from 'lucide-react'
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
  /** Whether this eval's commercial score clears the GEM Select bar (≥75).
   *  Drives the gold badge shown next to the title in display mode. The
   *  designation itself is already public (it's the only tier surfaced on
   *  Discover), so this badge is safe to render for any viewer. */
  isGemSelect?: boolean
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

export function EditableTopCard({ evaluationId, submissionId, initial, isOwner, hasEdits, postedAt, authorName, isGemSelect, headerActionsLeft }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoEdit = isOwner && searchParams?.get('edit') === '1'

  const [editing, setEditing] = useState<boolean>(autoEdit)
  const [saving, setSaving] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tags state — independent of the bundled "Save" flow because tags persist
  // to a different endpoint (/api/scripts/[id]/tags) and writers expect chip
  // edits to feel immediate. Add/remove are optimistic with rollback on
  // failure. Source of truth is `script_submissions.tags`, refetched on
  // router.refresh() after each successful change.
  const [tags, setTags] = useState<string[]>(() => dedupeTags(initial.tags ?? []))
  const [tagDraft, setTagDraft] = useState('')
  const [tagAdding, setTagAdding] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)
  const [tagPending, startTagTransition] = useTransition()
  const tagInputRef = useRef<HTMLInputElement | null>(null)

  // Re-seed local tags whenever the server-rendered initial.tags shifts
  // (e.g. another tab edited them, or router.refresh just landed). Without
  // this the optimistic state can drift from the persisted value.
  useEffect(() => {
    setTags(dedupeTags(initial.tags ?? []))
  }, [initial.tags])

  async function persistTags(next: string[], rollback: string[]) {
    setTagError(null)
    try {
      const res = await fetch(
        `/api/scripts/${encodeURIComponent(submissionId)}/tags`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: next }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTags(rollback)
        setTagError(json?.error || 'Could not save tags.')
        return
      }
      const serverTags: string[] = Array.isArray(json?.tags) ? json.tags : next
      setTags(serverTags)
      // Refresh server data so dashboards / discover pick up the new tags.
      startTagTransition(() => router.refresh())
    } catch (err) {
      setTags(rollback)
      setTagError(err instanceof Error ? err.message : 'Could not save tags.')
    }
  }

  function handleRemoveTag(tag: string) {
    if (!isOwner) return
    const rollback = tags
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    persistTags(next, rollback)
  }

  function handleAddTag() {
    if (!isOwner) return
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
    const rollback = tags
    const next = [...tags, norm]
    setTags(next)
    setTagDraft('')
    persistTags(next, rollback)
  }

  function openTagAdd() {
    setTagAdding(true)
    setTagError(null)
    // Defer focus to the next paint so the input has mounted.
    requestAnimationFrame(() => tagInputRef.current?.focus())
  }

  function closeTagAdd() {
    setTagAdding(false)
    setTagDraft('')
    setTagError(null)
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeTagAdd()
    }
  }

  const tagsAtCap = tags.length >= MAX_TAGS

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
  }

  async function save() {
    setSaving(true)
    setError(null)
    // We send each field's desired final value. Empty string clears the edit
    // server-side, which is the right behavior when the writer blanks a field.
    // Secondary genres write to `genre_secondary` (v5.4 canonical key); we
    // also clear the legacy `genre_tags` key so any old edit doesn't keep
    // bleeding through after a save.
    const body: Record<string, any> = {
      title,
      logline,
      genre_primary: genrePrimary,
      tone,
      genre_secondary: genreSecondary.filter((t) => t.trim().length > 0).slice(0, 2),
      genre_tags: [],
    }
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `Save failed (${res.status})`)
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

        {/* Freeform tags row — `script_submissions.tags`. Distinct visual
            treatment from genre pills (filled, lowercase, smaller) so a
            producer scanning the card can tell at a glance what's a
            controlled-vocab classifier vs a writer-supplied descriptor.
            Owners get inline edit affordances (X to remove, "+ Add tag"
            pill at the end); non-owners see plain read-only chips. */}
        {(tags.length > 0 || isOwner) && (
          <div className="mb-5 sm:mb-10">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {tags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full pl-2.5 py-1 text-[12px] sm:text-[12.5px] font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--gem-gray-800)',
                    color: 'var(--gem-gray-300)',
                    paddingRight: isOwner ? 4 : 10,
                  }}
                >
                  {tag}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full transition-colors hover:bg-[var(--gem-gray-800)] hover:text-[var(--gem-gray-50)]"
                      style={{ color: 'var(--gem-gray-500)' }}
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  )}
                </span>
              ))}

              {isOwner && !tagAdding && !tagsAtCap && (
                <button
                  type="button"
                  onClick={openTagAdd}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] sm:text-[12.5px] font-medium transition-colors hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)]"
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--gem-gray-700)',
                    color: 'var(--gem-gray-400)',
                  }}
                  aria-label="Add a tag"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  Add tag
                </button>
              )}

              {isOwner && tagAdding && (
                <span
                  className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px dashed var(--gem-gray-600)',
                  }}
                >
                  <Plus size={12} className="text-[var(--gem-gray-400)] shrink-0" />
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagDraft}
                    onChange={(e) => {
                      setTagDraft(e.target.value)
                      if (tagError) setTagError(null)
                    }}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      // Close the add-pill if the writer clicked away without
                      // entering anything; preserves the "Add tag" affordance.
                      if (!tagDraft.trim()) closeTagAdd()
                    }}
                    placeholder="add tag"
                    maxLength={MAX_TAG_LEN}
                    className="bg-transparent outline-none text-[12px] sm:text-[12.5px] text-[var(--gem-gray-100)] placeholder:text-[var(--gem-gray-500)] py-1 px-0 w-[100px] sm:w-[120px]"
                    aria-label="New tag"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault() /* keep input focus during click */}
                    onClick={handleAddTag}
                    disabled={!tagDraft.trim()}
                    className="text-[11px] font-semibold rounded-full px-2 py-0.5 transition-all disabled:opacity-40"
                    style={{
                      background: 'var(--gem-gold)',
                      color: 'var(--gem-black)',
                    }}
                  >
                    Add
                  </button>
                </span>
              )}

              {isOwner && tagPending && (
                <Loader2
                  size={12}
                  className="animate-spin text-[var(--gem-gray-500)]"
                />
              )}
            </div>

            {isOwner && tagError && (
              <p className="text-[12px] text-red-400 mt-1.5 m-0">{tagError}</p>
            )}
            {isOwner && tagsAtCap && (
              <p className="text-[12px] text-[var(--gem-gray-500)] italic mt-1.5 m-0">
                You&apos;ve reached the {MAX_TAGS}-tag limit. Remove one to add another.
              </p>
            )}
          </div>
        )}
        {tags.length === 0 && !isOwner && (
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
