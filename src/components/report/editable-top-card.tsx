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

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Check, X, RotateCcw, Loader2 } from 'lucide-react'
import { LOGLINE_WORD_CAP, loglineWordCount, type TopCardDisplay } from '@/lib/edited-fields'

interface Props {
  evaluationId: string
  initial: TopCardDisplay
  isOwner: boolean
  hasEdits: boolean
  postedAt: string | null
}

export function EditableTopCard({ evaluationId, initial, isOwner, hasEdits, postedAt }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoEdit = isOwner && searchParams?.get('edit') === '1'

  const [editing, setEditing] = useState<boolean>(autoEdit)
  const [saving, setSaving] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable state — seeded from what's currently being rendered
  const [title, setTitle] = useState(initial.title)
  const [logline, setLogline] = useState(initial.logline)
  const [genrePrimary, setGenrePrimary] = useState(initial.genre_primary)
  const [genreTags, setGenreTags] = useState<string[]>(initial.genre_tags.slice(0, 2))
  const [tone, setTone] = useState(initial.tone)

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
    setGenrePrimary(initial.genre_primary)
    setGenreTags(initial.genre_tags.slice(0, 2))
    setTone(initial.tone)
  }

  async function save() {
    setSaving(true)
    setError(null)
    // We send each field's desired final value. Empty string clears the edit
    // server-side, which is the right behavior when the writer blanks a field.
    const body: Record<string, any> = {
      title,
      logline,
      genre_primary: genrePrimary,
      tone,
      genre_tags: genreTags.filter((t) => t.trim().length > 0).slice(0, 2),
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
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              resetLocalToInitial()
              setEditing(true)
              setError(null)
            }}
            className="absolute right-0 top-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)] transition-colors"
            aria-label="Edit title, genre, tone, and headline"
            title="Edit title, genre, tone, and headline"
          >
            <Pencil size={13} />
            Edit
          </button>
        )}

        <h1 className="text-[36px] sm:text-[44px] font-semibold text-[var(--gem-gray-50)] tracking-tight leading-[1.1] mb-4 pr-24">
          {initial.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-[var(--gem-gray-300)] mb-10">
          {initial.format && <span>{initial.format}</span>}
          {initial.genre_primary && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span>{initial.genre_primary}</span>
            </>
          )}
          {initial.genre_tags?.map((t, i) => (
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

        {initial.logline && (
          <div
            className="relative rounded-2xl p-8 sm:p-10 mb-12"
            style={{
              background: 'linear-gradient(135deg, rgba(200,164,92,0.10), transparent 70%)',
              border: '1px solid rgba(200,164,92,0.25)',
            }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-7 bottom-7 rounded-r"
              style={{ width: 5, background: 'var(--gem-gold)' }}
            />
            <div
              className="text-[14px] uppercase tracking-[0.22em] font-bold mb-4"
              style={{ color: 'var(--gem-gold)' }}
            >
              Headline
            </div>
            <p className="text-[26px] sm:text-[30px] text-[var(--gem-gray-50)] leading-[1.3] font-medium m-0">
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
            disabled={saving || reverting || overCap || title.trim().length === 0}
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

      {/* Genre + Tone row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <label className="block">
          <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
            Genre (primary)
          </span>
          <input
            type="text"
            value={genrePrimary}
            onChange={(e) => setGenrePrimary(e.target.value.slice(0, 100))}
            className="w-full text-[15px] text-[var(--gem-gray-100)] bg-transparent border border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none rounded-md px-3 py-2"
            placeholder="e.g. Thriller"
          />
        </label>
        <label className="block">
          <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
            Tone
          </span>
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value.slice(0, 100))}
            className="w-full text-[15px] text-[var(--gem-gray-100)] bg-transparent border border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none rounded-md px-3 py-2"
            placeholder="e.g. grounded, heightened, satirical"
          />
        </label>
      </div>

      {/* Genre tags (up to 2) */}
      <div className="mb-5">
        <span className="block text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
          Secondary tags (up to 2)
        </span>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <input
              key={i}
              type="text"
              value={genreTags[i] ?? ''}
              onChange={(e) => {
                const next = [...genreTags]
                next[i] = e.target.value.slice(0, 50)
                setGenreTags(next)
              }}
              className="w-full text-[14px] text-[var(--gem-gray-100)] bg-transparent border border-[var(--gem-gray-700)] focus:border-[var(--gem-gold)] focus:outline-none rounded-md px-3 py-2"
              placeholder={i === 0 ? 'e.g. neo-noir' : 'e.g. character study'}
            />
          ))}
        </div>
      </div>

      {/* Headline (stored as edited_fields.logline / positioning_hook) */}
      <label className="block">
        <span className="flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] mb-2">
          <span>Headline</span>
          <span
            className={overCap ? 'text-red-400' : 'text-[var(--gem-gray-500)]'}
            style={{ textTransform: 'none', letterSpacing: 0 }}
          >
            {wordCount}/{LOGLINE_WORD_CAP} words
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
          <p className="text-[12px] text-red-400 mt-2">
            Headline is longer than the {LOGLINE_WORD_CAP}-word cap. Trim it before saving.
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
