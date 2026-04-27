'use client'

// Writer-facing tags editor — collapsible per-script panel that hangs above
// the Industry Activity sub-section on the dashboard. Renders the script's
// tags as small chips with an inline "x" to remove and a "+ Add tag" input
// at the end. Edits POST to /api/scripts/[id]/tags via PATCH and re-render
// optimistically; failures roll back to the last-known-good list.
//
// Tags are stored on `script_submissions.tags` (text[]). The route
// canonicalizes tag values server-side (lowercase, hyphens), so we don't
// have to do it perfectly here — but we do mirror the canonicalization for
// the optimistic chip preview so the UI doesn't flicker on save.
//
// Renaming = remove + re-add (no in-place edit). Tag count caps at 25,
// matching the API.

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ChevronDown, X, Loader2, Plus } from 'lucide-react'

interface ScriptTagsEditorProps {
  submissionId: string
  initialTags: string[]
}

const MAX_TAGS = 25
const MAX_TAG_LEN = 30

// Mirror server normalizer — keeps optimistic UI honest.
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

export function ScriptTagsEditor({
  submissionId,
  initialTags,
}: ScriptTagsEditorProps) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>(() => dedupe(initialTags))
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const headerCount = tags.length

  // Tag count info for the "Add tag" affordance.
  const remaining = Math.max(0, MAX_TAGS - tags.length)
  const isFull = remaining === 0

  async function persist(next: string[], rollback: string[]) {
    setError(null)
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
        setError(json?.error || 'Could not save tags.')
        return
      }
      const serverTags: string[] = Array.isArray(json?.tags) ? json.tags : next
      setTags(serverTags)
      // Refresh server data so the producer side picks up the new tags
      // on next read. router.refresh re-runs the server component.
      startTransition(() => router.refresh())
    } catch (err) {
      setTags(rollback)
      setError(
        err instanceof Error ? err.message : 'Could not save tags.'
      )
    }
  }

  function handleRemove(tag: string) {
    const rollback = tags
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    persist(next, rollback)
  }

  function handleAdd() {
    const norm = normalizeTag(draft)
    if (!norm) {
      setError('Tag must be letters, numbers, or hyphens.')
      return
    }
    if (tags.includes(norm)) {
      setError('That tag is already on this script.')
      return
    }
    if (tags.length >= MAX_TAGS) {
      setError(`Max ${MAX_TAGS} tags per script.`)
      return
    }
    const rollback = tags
    const next = [...tags, norm]
    setTags(next)
    setDraft('')
    persist(next, rollback)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div
      className="border-t"
      style={{
        borderColor: 'var(--gem-gray-700)',
        background: 'var(--gem-gray-900)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-6 sm:px-8 py-3.5 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-200)]">
          Tags
        </span>
        <span className="text-[12.5px] text-[var(--gem-gray-400)] font-medium">
          {headerCount === 0 ? 'none yet' : `${headerCount}`}
        </span>
        {pending && (
          <Loader2
            size={12}
            className="animate-spin text-[var(--gem-gray-400)]"
          />
        )}
        <ChevronDown
          size={16}
          className="ml-auto text-[var(--gem-gray-400)] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div className="px-6 sm:px-8 pb-5 pt-1">
          <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mb-3 leading-snug">
            Tags help producers find your script in their lane. Add or remove
            anytime.
          </p>

          <div className="flex flex-wrap gap-1.5 items-center">
            {tags.map((tag) => (
              <TagChip key={tag} tag={tag} onRemove={() => handleRemove(tag)} />
            ))}

            {/* Inline add input — sized to feel like the chips around it */}
            {!isFull && (
              <div
                className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5"
                style={{
                  background: '#fff',
                  border: '1px dashed var(--gem-gray-600)',
                }}
              >
                <Plus
                  size={12}
                  className="text-[var(--gem-gray-400)] shrink-0"
                />
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    if (error) setError(null)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="add tag"
                  maxLength={MAX_TAG_LEN}
                  className="bg-transparent outline-none text-[12px] text-[var(--gem-gray-100)] placeholder:text-[var(--gem-gray-500)] py-1 px-0 w-[90px] sm:w-[110px]"
                  aria-label="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!draft.trim()}
                  className="text-[11px] font-semibold rounded-full px-2 py-0.5 transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--gem-accent)',
                    color: '#fff',
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-[12px] text-red-600 mt-2 m-0">{error}</p>
          )}
          {isFull && (
            <p className="text-[12px] text-[var(--gem-gray-500)] italic mt-2 m-0">
              You&apos;ve reached the {MAX_TAGS}-tag limit. Remove one to add
              another.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TagChip({
  tag,
  onRemove,
}: {
  tag: string
  onRemove: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-[12px] font-medium"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        color: 'var(--gem-gray-200)',
      }}
    >
      {tag}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove tag ${tag}`}
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full transition-colors hover:bg-[var(--gem-gray-800)] hover:text-[var(--gem-gray-50)]"
        style={{ color: 'var(--gem-gray-500)' }}
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </span>
  )
}

function dedupe(tags: string[]): string[] {
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
