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
import { Pencil, Check, X, RotateCcw, Loader2, Eye, EyeOff } from 'lucide-react'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'
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
   *  or the profile has no name set, in which case the line is omitted. */
  authorName?: string | null
  /** Writer's @handle (from profiles.handle). When present, the byline
   *  becomes a link to /w/{handle} so anyone can jump to the writer's
   *  profile from the report. */
  authorHandle?: string | null
  /** Commercial score (0-100). Surfaced as a small color-coded badge inline
   *  with the title. Null/undefined hides the badge entirely. */
  commercialScore?: number | null
  /** Whether the score is currently visible to industry partners (i.e.
   *  privacy.show_score !== false). Owner-only — drives the eye-toggle UI
   *  on the score badge. Non-owners ignore this; their visibility is
   *  decided by the parent (which passes commercialScore=null when hidden). */
  scoreShownToIndustry?: boolean
  /** Whether the OWNER has an active Pro subscription. The score-eye
   *  toggle is Pro-only — for free writers the icon opens the same
   *  small upgrade prompt the per-section pills use. Anuj 2026-04-28. */
  isProSubscriber?: boolean
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

export function EditableTopCard({ evaluationId, submissionId, initial, isOwner, hasEdits, postedAt, authorName, authorHandle, commercialScore, scoreShownToIndustry = true, isProSubscriber = true, headerActionsLeft }: Props) {
  const router = useRouter()
  // useSearchParams can suspend without a Suspense boundary in Next 14+,
  // which delays event-listener registration and causes the "blink but
  // doesn't open" bug for some users. Fallback to null if it throws.
  let searchParams: ReturnType<typeof useSearchParams> | null = null
  try { searchParams = useSearchParams() } catch { /* suspended — ignore */ }
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

  // External "Edit" trigger — fired by the OwnerActionsMenu's Edit item.
  // Lets the menu live outside this component while still flipping the
  // card into edit mode + scrolling it into view.
  useEffect(() => {
    if (!isOwner) return
    const handler = () => {
      resetLocalToInitial()
      setEditing(true)
      setError(null)
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    window.addEventListener('gem:edit-top-card', handler)
    return () => window.removeEventListener('gem:edit-top-card', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner])

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
        {/* Selznick-4 v4 (mobile-first):
            Reading order: optional small action row → TITLE + score badge →
            byline → tiny metadata line (format only) → HEADLINE as clean
            editorial prose (no left rule, no box, no label) → "Show tags"
            collapsed expander. Everything sized for narrow screens first;
            desktop just has more breathing room. */}

        {/* Inline Edit + Download buttons removed (Selznick-4 v4): owner
            actions now live in the "···" menu rendered by the report page,
            outside this component. The headerActionsLeft slot is no longer
            used; left in props for back-compat with non-owner callers. */}

        {/* Title row — title + inline score badge. On mobile the badge sits
            right of the title and shrinks to a compact pill. Title is sized
            mobile-first so it doesn't overflow narrow screens. */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-1.5 sm:mb-2">
          <h1
            className="text-[26px] sm:text-[40px] font-bold text-[var(--gem-gray-50)] tracking-tight leading-[1.1] m-0 flex-1 min-w-0"
          >
            {initial.title}
          </h1>
          {typeof commercialScore === 'number' && !Number.isNaN(commercialScore) && (
            <span
              data-pdf-section="score"
              // If the writer has hidden the score from industry, don't
              // bake it into the PDF either — the PDF is the artifact
              // they'd share, so respect the same posture. Anuj
              // 2026-04-28.
              className={!scoreShownToIndustry ? 'gem-no-print' : undefined}
            >
              <ScoreBadge
                score={commercialScore}
                isOwner={isOwner}
                shownToIndustry={scoreShownToIndustry}
                submissionId={submissionId}
                isProSubscriber={isProSubscriber}
              />
            </span>
          )}
        </div>

        {/* Author byline + format on one line for compactness on mobile.
            Format is the only metadata in the primary view; genre/tone/posted
            move into the (collapsed) Tags expander to keep the cover quiet. */}
        {/* Format line removed — format + genre now rendered as prominent
            pills by the parent (report page hero). Keeping the edit-mode
            format display below for context. */}

        {/* HEADLINE as clean editorial prose — no rule, no box, no label.
            Just a generously-sized paragraph in the column. This is the
            screenshot-able moment. */}
        {initial.logline && (
          <p
            className="text-[20px] sm:text-[28px] text-[var(--gem-gray-50)] leading-[1.35] font-semibold tracking-[-0.005em] m-0 mb-6 sm:mb-8"
          >
            {initial.logline}
          </p>
        )}

        {/* Tone + posted date now rendered by the parent (report page hero)
            in the classification pill row. Kept in edit mode below. */}

        {/* Tags — always visible */}
        {initialTagsList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6 sm:mb-8">
            {initialTagsList.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium"
                style={{
                  color: 'var(--gem-gray-300)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {tag}
              </span>
            ))}
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

// ─── Helpers (Selznick-4 v4) ───────────────────────────────────────

/** Color-coded score badge inline with the title. Three tiers: green ≥75,
 *  amber 50-74, gray <50. For owners, a tiny eye toggle next to the badge
 *  shows whether industry partners can see the score; tap → quick confirm
 *  to flip. */
function ScoreBadge({
  score,
  isOwner,
  shownToIndustry,
  submissionId,
  isProSubscriber,
}: {
  score: number
  isOwner: boolean
  shownToIndustry: boolean
  submissionId: string
  isProSubscriber: boolean
}) {
  // Owner-with-score-hidden state: render the badge muted (grey, no tier
  // color) with a diagonal strikethrough across the number + a "Hidden"
  // eyebrow. Makes it visually unmissable that industry can't see it
  // anymore, while the writer still sees what GEM scored them.
  const isHiddenForOwner = isOwner && !shownToIndustry

  // Anuj 2026-04-28: score badge stays one palette regardless of score
  // — the score is the score, the writer doesn't need it dressed up.
  // Background is a very light tint of the GEM purple so it ties to
  // brand instead of reading as a dead gray chip. Hidden state grays
  // out so the writer sees when industry partners can't see it.
  const palette = isHiddenForOwner
    ? {
        bg: 'var(--gem-gray-900)',
        fg: 'var(--gem-gray-400)',
        border: 'var(--gem-gray-700)',
      }
    : {
        bg: 'rgba(124,58,237,0.08)',
        fg: 'var(--gem-gray-50)',
        border: 'rgba(124,58,237,0.25)',
      }
  const display = score.toFixed(0)
  return (
    <div className="shrink-0 flex items-center gap-1.5">
      <div
        className="flex flex-col items-center justify-center rounded-lg tabular-nums relative"
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          minWidth: 56,
          padding: '6px 10px',
          opacity: isHiddenForOwner ? 0.7 : 1,
        }}
        aria-label={
          isHiddenForOwner
            ? `GEM Score ${display}, hidden from industry partners`
            : `GEM Score ${display}`
        }
      >
        <span
          className="hidden sm:block text-[9.5px] uppercase tracking-[0.16em] font-bold leading-none mb-1"
          style={{ color: palette.fg, opacity: 0.85 }}
        >
          {isHiddenForOwner ? 'Hidden' : 'Score'}
        </span>
        <span
          className="font-bold leading-none"
          style={{ color: palette.fg, fontSize: 22 }}
        >
          {display}
        </span>
      </div>
      {isOwner && (
        <span className="gem-no-print">
          <ScoreEyeToggle
            shownToIndustry={shownToIndustry}
            submissionId={submissionId}
            isProSubscriber={isProSubscriber}
          />
        </span>
      )}
    </div>
  )
}

/** Tiny eye/eye-off button next to the score badge. Tap → confirm sheet →
 *  flips privacy.show_score. Owner-only. Survives router refresh because
 *  parent re-renders with the new privacy state. */
function ScoreEyeToggle({
  shownToIndustry,
  submissionId,
  isProSubscriber,
}: {
  shownToIndustry: boolean
  submissionId: string
  isProSubscriber: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [proPromptOpen, setProPromptOpen] = useState(false)
  const [proBusy, setProBusy] = useState(false)
  const [proError, setProError] = useState('')
  const [busy, setBusy] = useState(false)
  const [localShown, setLocalShown] = useState(shownToIndustry)
  useEffect(() => {
    setLocalShown(shownToIndustry)
  }, [shownToIndustry])

  // Listen for sibling-driven privacy changes so the icon stays in sync
  // when other components save show_score (rare but possible).
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ privacy?: { show_score?: boolean } }>
      if (ce.detail?.privacy && typeof ce.detail.privacy.show_score === 'boolean') {
        setLocalShown(ce.detail.privacy.show_score)
      }
    }
    window.addEventListener('gem:report-state-changed', handler)
    return () => window.removeEventListener('gem:report-state-changed', handler)
  }, [])

  const next = !localShown

  async function handleConfirm() {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/scripts/${encodeURIComponent(submissionId)}/privacy`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ show_score: next }),
        }
      )
      if (res.ok) {
        setLocalShown(next)
        window.dispatchEvent(
          new CustomEvent('gem:report-state-changed', {
            detail: { privacy: { show_score: next } },
          })
        )
        router.refresh()
      }
    } catch {
      /* swallow — UI state stays as-is on failure */
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isProSubscriber) {
            setProPromptOpen(true)
            return
          }
          setOpen(true)
        }}
        aria-label={
          localShown
            ? 'Score is visible to industry partners — tap to hide'
            : 'Score is hidden from industry partners — tap to show'
        }
        title={
          localShown
            ? 'Score visible to industry partners. Tap to hide.'
            : 'Score hidden from industry partners. Tap to show.'
        }
        className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors hover:bg-[var(--gem-gray-800)]"
        style={{
          color: localShown
            ? 'var(--gem-gray-400)'
            : 'var(--gem-gray-500)',
        }}
      >
        {localShown ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <PrivacyConfirmSheet
        open={open}
        title={
          next
            ? 'Show your score to industry partners?'
            : 'Hide your score from industry partners?'
        }
        body={
          next
            ? 'Your score will appear at the top of your report for any industry partner viewing it.'
            : 'Your score will be hidden — industry partners will read the report on its own merit. You\u2019ll still see it.'
        }
        confirmLabel={next ? 'Show score' : 'Hide score'}
        tone={next ? 'success' : 'primary'}
        busy={busy}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />

      {proPromptOpen && (
        <div
          onClick={() => setProPromptOpen(false)}
          className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-sm rounded-2xl shadow-xl p-5 sm:p-6"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span
                className="inline-block px-1.5 py-[2px] rounded text-[9.5px] font-bold uppercase tracking-wider text-white"
                style={{ background: 'var(--gem-accent)' }}
              >
                Pro
              </span>
              <button
                type="button"
                onClick={() => setProPromptOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 w-7 h-7 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
              >
                ×
              </button>
            </div>
            <h3 className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
              Become a Member
            </h3>
            <p className="text-[13.5px] text-[var(--gem-gray-300)] m-0 mt-1.5 leading-snug">
              Hide specific sections and publish to industry partners — Pro only.
            </p>
            {proError && (
              <p className="text-[12px] text-red-600 m-0 mt-3">{proError}</p>
            )}
            <button
              type="button"
              disabled={proBusy}
              onClick={async () => {
                setProBusy(true)
                setProError('')
                try {
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
                  window.location.href = data.url
                } catch (err: unknown) {
                  setProError(err instanceof Error ? err.message : 'Something went wrong')
                  setProBusy(false)
                }
              }}
              className="w-full mt-4 py-2.5 rounded-lg font-semibold text-white text-[14px] disabled:opacity-60 transition-opacity hover:opacity-95"
              style={{ background: 'var(--gem-accent)' }}
            >
              {proBusy ? 'Redirecting…' : 'Upgrade — $20/mo'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

