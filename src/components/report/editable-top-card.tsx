'use client'

// Owner-editable top card on the report page — INLINE EDIT MODE.
//
// In display mode, renders title + author + logline + collapsible
// categories exactly as before.
//
// In edit mode (triggered by OwnerActionsMenu → gem:edit-top-card
// custom event), the same layout stays in place but each editable
// field becomes an inline input. Title → text input, logline → textarea,
// genre → dropdown, tone → text input, tags → chip editor.
//
// Format, author info, and score are NOT editable and stay locked.
//
// The save/cancel bar lives in StickySaveBar (fixed bottom). This
// component just toggles its fields between display and edit mode.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ChevronDown, X } from 'lucide-react'
import { useEditContextOptional } from './edit-context'
import {
  LOGLINE_WORD_CAP,
  LOCKED_GENRE_VOCAB,
  canonicalizeGenre,
  loglineWordCount,
  type TopCardDisplay,
} from '@/lib/edited-fields'

interface Props {
  evaluationId: string
  submissionId: string
  initial: TopCardDisplay
  isOwner: boolean
  hasEdits: boolean
  postedAt: string | null
  headerActionsLeft?: React.ReactNode
  authorName?: string | null
  authorHandle?: string | null
  authorAvatar?: string | null
  authorHeadline?: string | null
  commercialScore?: number | null
  scoreShownToIndustry?: boolean
  isProSubscriber?: boolean
}

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

export function EditableTopCard({
  evaluationId,
  submissionId,
  initial,
  isOwner,
  hasEdits,
  postedAt,
  authorName,
  authorHandle,
  authorAvatar,
  authorHeadline,
  commercialScore,
  scoreShownToIndustry = true,
  isProSubscriber = true,
  headerActionsLeft,
}: Props) {
  const editCtx = useEditContextOptional()
  const isEditing = editCtx?.isEditing ?? false

  let searchParams: ReturnType<typeof useSearchParams> | null = null
  try { searchParams = useSearchParams() } catch { /* suspended */ }
  const autoEdit = isOwner && searchParams?.get('edit') === '1'

  const cardRef = useRef<HTMLDivElement>(null)

  // Tag draft state (local to this component, not in context)
  const [tagDraft, setTagDraft] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)

  // Auto-edit via ?edit=1
  useEffect(() => {
    if (autoEdit && editCtx && !editCtx.isEditing) {
      editCtx.startEditing()
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [autoEdit, editCtx])

  // External "Edit" trigger (fallback for dashboard usage where
  // OwnerActionsMenu is outside the EditProvider tree)
  useEffect(() => {
    if (!isOwner || !editCtx) return
    const handler = () => {
      editCtx.startEditing()
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    window.addEventListener('gem:edit-top-card', handler)
    return () => window.removeEventListener('gem:edit-top-card', handler)
  }, [isOwner, editCtx])

  // Secondary genre options — exclude primary and other slot
  const secondaryOptionsForSlot = useMemo(() => {
    if (!editCtx) return () => LOCKED_GENRE_VOCAB as unknown as string[]
    return (slotIndex: number) =>
      (LOCKED_GENRE_VOCAB as readonly string[]).filter((g) => {
        if (g === editCtx.genrePrimary) return false
        const otherSlot = editCtx.genreSecondary[1 - slotIndex]
        if (otherSlot && g === otherSlot) return false
        return true
      })
  }, [editCtx?.genrePrimary, editCtx?.genreSecondary])

  function handleRemoveTag(tag: string) {
    editCtx?.setTags(editCtx.tags.filter((t) => t !== tag))
    setTagError(null)
  }

  function handleAddTag() {
    if (!editCtx) return
    const norm = normalizeTag(tagDraft)
    if (!norm) {
      setTagError('Tag must be letters, numbers, or hyphens.')
      return
    }
    if (editCtx.tags.includes(norm)) {
      setTagError('That tag is already on this script.')
      return
    }
    if (editCtx.tags.length >= MAX_TAGS) {
      setTagError(`Max ${MAX_TAGS} tags per script.`)
      return
    }
    editCtx.setTags([...editCtx.tags, norm])
    setTagDraft('')
    setTagError(null)
  }

  // Values to display — either from edit context (when editing) or initial
  const displayTitle = isEditing && editCtx ? editCtx.title : initial.title
  const displayLogline = isEditing && editCtx ? editCtx.logline : initial.logline
  const displayGenrePrimary = isEditing && editCtx ? editCtx.genrePrimary : initial.genre_primary
  const displayGenreSecondary = isEditing && editCtx ? editCtx.genreSecondary : initial.genre_secondary
  const displayTone = isEditing && editCtx ? editCtx.tone : initial.tone
  const displayTags = isEditing && editCtx ? editCtx.tags : (initial.tags ?? [])

  // Classification pills for display
  const classificationPills: { label: string; variant: 'format' | 'genre' | 'secondary' }[] = []
  if (initial.format) classificationPills.push({ label: initial.format, variant: 'format' })
  if (displayGenrePrimary) classificationPills.push({ label: displayGenrePrimary, variant: 'genre' })
  for (const g of displayGenreSecondary?.filter(Boolean) ?? []) {
    classificationPills.push({ label: g, variant: 'secondary' })
  }
  const initialTagsList = (initial.tags ?? []).filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
  const hasCategories = classificationPills.length > 0 || displayTone?.trim() || displayTags.length > 0 || postedAt

  // Author initials
  const authorInitials = (authorName || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  // Inline edit styling — shared border style for editable fields
  const editBorder = isEditing
    ? { borderBottom: '1px solid rgba(124,77,237,0.4)', paddingBottom: 2 }
    : {}

  const wordCount = editCtx ? loglineWordCount(editCtx.logline) : 0
  const overCap = wordCount > LOGLINE_WORD_CAP

  return (
    <div ref={cardRef} className="relative">
      {/* 1. Title + score badge */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3">
        {isEditing && editCtx ? (
          <input
            type="text"
            value={editCtx.title}
            onChange={(e) => editCtx.setTitle(e.target.value.slice(0, 200))}
            className="flex-1 min-w-0 text-[26px] sm:text-[40px] font-bold text-[var(--gem-gray-50)] tracking-tight leading-[1.1] m-0 bg-transparent outline-none border-b-2 border-purple-500/40 focus:border-purple-400 transition-colors"
            placeholder="Your script title"
          />
        ) : (
          <h1
            className="text-[26px] sm:text-[40px] font-bold text-[var(--gem-gray-50)] tracking-tight leading-[1.1] m-0 flex-1 min-w-0"
          >
            {displayTitle}
          </h1>
        )}
        {typeof commercialScore === 'number' && !Number.isNaN(commercialScore) && (
          <span
            data-pdf-section="score"
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

      {/* 2. Compact author card — NOT editable */}
      {authorName && (
        <div className="mb-3">
          {authorHandle ? (
            <Link
              href={`/w/${authorHandle}`}
              className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <CompactAvatar url={authorAvatar} initials={authorInitials} />
              <div className="min-w-0">
                <span className="text-[14px] font-semibold text-[var(--gem-gray-100)] leading-tight">
                  {authorName}
                </span>
                {authorHeadline && (
                  <span className="block text-[12px] text-[var(--gem-gray-400)] leading-snug truncate max-w-[280px]">
                    {authorHeadline}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div className="inline-flex items-center gap-2.5">
              <CompactAvatar url={authorAvatar} initials={authorInitials} />
              <div className="min-w-0">
                <span className="text-[14px] font-semibold text-[var(--gem-gray-100)] leading-tight">
                  {authorName}
                </span>
                {authorHeadline && (
                  <span className="block text-[12px] text-[var(--gem-gray-400)] leading-snug truncate max-w-[280px]">
                    {authorHeadline}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Logline / Headline */}
      {isEditing && editCtx ? (
        <div className="mb-4">
          <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
            Headline
          </span>
          <textarea
            value={editCtx.logline}
            onChange={(e) => editCtx.setLogline(e.target.value.slice(0, 500))}
            rows={2}
            className="w-full text-[16px] sm:text-[20px] text-[var(--gem-gray-200)] leading-[1.45] font-medium m-0 max-w-[56ch] bg-transparent outline-none border-b-2 border-purple-500/40 focus:border-purple-400 transition-colors resize-none"
            placeholder="A one-line hook for your script"
          />
          <span className={`text-[11px] mt-0.5 block ${overCap ? 'text-amber-400' : 'text-[var(--gem-gray-500)]'}`}>
            {wordCount} / {LOGLINE_WORD_CAP} words
          </span>
        </div>
      ) : (
        displayLogline && (
          <p
            className="text-[16px] sm:text-[20px] text-[var(--gem-gray-200)] leading-[1.45] font-medium m-0 mb-4 max-w-[56ch]"
          >
            {displayLogline}
          </p>
        )
      )}

      {/* 4. Categories — always open when editing, collapsible when not */}
      {isEditing && editCtx ? (
        <div className="space-y-4 mb-4">
          {/* Genre + Tone row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
                Genre
              </span>
              <select
                value={editCtx.genrePrimary}
                onChange={(e) => {
                  const v = e.target.value
                  editCtx.setGenrePrimary(v)
                  editCtx.setGenreSecondary(editCtx.genreSecondary.filter((g) => g !== v))
                }}
                className="w-full text-[14px] text-[var(--gem-gray-100)] bg-transparent border border-purple-500/30 focus:border-purple-400 focus:outline-none rounded-md px-2.5 py-1.5"
              >
                <option value="">Select…</option>
                {LOCKED_GENRE_VOCAB.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            {[0, 1].map((i) => {
              const value = editCtx.genreSecondary[i] ?? ''
              const options = secondaryOptionsForSlot(i)
              return (
                <div key={i}>
                  <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
                    {i === 0 ? 'Secondary' : 'Third'}
                  </span>
                  <select
                    value={value}
                    onChange={(e) => {
                      const next = [...editCtx.genreSecondary]
                      const v = e.target.value
                      if (v === '') {
                        next.splice(i, 1)
                      } else {
                        next[i] = v
                      }
                      editCtx.setGenreSecondary(next.slice(0, 2))
                    }}
                    className="w-full text-[14px] text-[var(--gem-gray-100)] bg-transparent border border-purple-500/30 focus:border-purple-400 focus:outline-none rounded-md px-2.5 py-1.5"
                  >
                    <option value="">Optional</option>
                    {options.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          {/* Tone */}
          <div>
            <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
              Tone
            </span>
            <input
              type="text"
              value={editCtx.tone}
              onChange={(e) => editCtx.setTone(e.target.value.slice(0, 40))}
              maxLength={40}
              className="w-full max-w-[300px] text-[14px] text-[var(--gem-gray-100)] bg-transparent border-b-2 border-purple-500/40 focus:border-purple-400 focus:outline-none pb-1"
              placeholder="gritty, elevated, campy"
            />
          </div>
          {/* Format — locked */}
          {initial.format && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)]">
                Format
              </span>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold opacity-60"
                style={{
                  background: 'rgba(124,77,237,0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(124,77,237,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {initial.format}
              </span>
              <span className="text-[11px] text-[var(--gem-gray-500)] italic">locked</span>
            </div>
          )}
          {/* Tags — inline chip editor */}
          <div>
            <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
              Tags
            </span>
            <div
              className="flex flex-wrap items-center gap-1.5 rounded-md px-2.5 py-2 border border-purple-500/30"
              style={{ background: 'rgba(255,255,255,0.015)' }}
            >
              {editCtx.tags.map((tag, i) => (
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
              {editCtx.tags.length < MAX_TAGS && (
                <input
                  type="text"
                  value={tagDraft}
                  onChange={(e) => {
                    setTagDraft(e.target.value)
                    if (tagError) setTagError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
                  }}
                  placeholder={editCtx.tags.length === 0 ? 'Add tags — press Enter' : 'Add another'}
                  maxLength={MAX_TAG_LEN}
                  className="flex-1 min-w-[140px] bg-transparent outline-none text-[13px] text-[var(--gem-gray-100)] placeholder:text-[var(--gem-gray-500)] py-1 px-1"
                />
              )}
            </div>
            {tagError && (
              <span className="text-[11px] text-red-400 mt-1 block">{tagError}</span>
            )}
          </div>
        </div>
      ) : (
        hasCategories && (
          <details className="group mb-4">
            <summary
              className="inline-flex items-center gap-1.5 cursor-pointer list-none text-[13px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)] transition-colors select-none [&::-webkit-details-marker]:hidden"
            >
              View categories
              <ChevronDown
                size={14}
                className="transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="mt-3 space-y-3">
              {(classificationPills.length > 0 || displayTone?.trim() || postedAt) && (
                <div className="flex flex-wrap items-center gap-2">
                  {classificationPills.map((pill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold"
                      style={
                        pill.variant === 'format'
                          ? {
                              background: 'rgba(124,77,237,0.15)',
                              color: '#c4b5fd',
                              border: '1px solid rgba(124,77,237,0.25)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }
                          : pill.variant === 'genre'
                            ? {
                                background: 'rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.75)',
                                border: '1px solid rgba(255,255,255,0.12)',
                              }
                            : {
                                background: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.50)',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }
                      }
                    >
                      {pill.label}
                    </span>
                  ))}
                  {displayTone?.trim() && (
                    <span className="text-[12px] italic text-[var(--gem-gray-300)]">
                      {displayTone}
                    </span>
                  )}
                  {postedAt && (
                    <>
                      <span className="text-[var(--gem-gray-500)]">·</span>
                      <span className="text-[12px] text-[var(--gem-gray-400)]">
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
              )}
              {displayTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {displayTags.map((tag, i) => (
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
          </details>
        )
      )}
    </div>
  )
}

// ── ScoreBadge — small inline badge ─────────────────────────────────
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
  const [toggling, setToggling] = useState(false)

  async function toggleVisibility() {
    if (!isProSubscriber) {
      window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
      return
    }
    setToggling(true)
    try {
      await fetch(`/api/scripts/${encodeURIComponent(submissionId)}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_score: !shownToIndustry }),
      })
      window.location.reload()
    } catch {
      setToggling(false)
    }
  }

  const bg = score >= 80
    ? 'rgba(34,197,94,0.15)'
    : score >= 60
      ? 'rgba(234,179,8,0.15)'
      : 'rgba(239,68,68,0.15)'
  const border = score >= 80
    ? 'rgba(34,197,94,0.3)'
    : score >= 60
      ? 'rgba(234,179,8,0.3)'
      : 'rgba(239,68,68,0.3)'
  const color = score >= 80
    ? '#4ade80'
    : score >= 60
      ? '#facc15'
      : '#f87171'

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[16px] sm:text-[18px] font-bold tabular-nums"
        style={{ background: bg, border: `1px solid ${border}`, color }}
      >
        {Math.round(score)}
      </span>
      {isOwner && (
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={toggling}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-[rgba(255,255,255,0.08)] transition-colors disabled:opacity-50"
          title={shownToIndustry ? 'Score visible to industry' : 'Score hidden from industry'}
        >
          {shownToIndustry ? (
            <Eye size={14} className="text-[var(--gem-gray-400)]" />
          ) : (
            <EyeOff size={14} className="text-[var(--gem-gray-500)]" />
          )}
        </button>
      )}
    </div>
  )
}

// ── CompactAvatar ───────────────────────────────────────────────────
function CompactAvatar({ url, initials }: { url?: string | null; initials: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="w-8 h-8 rounded-full object-cover shrink-0"
    />
  ) : (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold text-[var(--gem-gray-300)]"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      {initials || '?'}
    </span>
  )
}
