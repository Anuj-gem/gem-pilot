'use client'

// PrivacyConfirmSheet — small one-tap confirm for privacy/visibility flips.
//
// Replaces the giant publish modal for per-section toggles + score
// visibility. Renders as a bottom sheet on mobile and a centered card on
// desktop, both with big tap targets.
//
// Caller controls open/close via `open` prop; closes itself on backdrop tap
// or Escape key. `onConfirm` is fired only when the user explicitly hits
// Yes — Cancel and backdrop dismiss are no-ops.

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  /** Optional supporting line under the title. */
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Visual treatment for the confirm button. 'primary' = violet (default
   *  GEM accent), 'danger' = red, 'success' = green. */
  tone?: 'primary' | 'danger' | 'success'
  onConfirm: () => void
  onClose: () => void
  /** Optional disabled state — caller can lock the buttons while a save
   *  is in flight. */
  busy?: boolean
}

export function PrivacyConfirmSheet({
  open,
  title,
  body,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onClose,
  busy = false,
}: Props) {
  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll when open so iOS doesn't bounce behind the sheet.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const confirmBg =
    tone === 'danger'
      ? '#dc2626'
      : tone === 'success'
        ? '#059669'
        : 'var(--gem-accent)'

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-confirm-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-sm sm:w-[min(92vw,420px)] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {/* Drag-handle visual on mobile (purely decorative). */}
        <div
          aria-hidden
          className="sm:hidden w-10 h-1 rounded-full mx-auto mt-2.5 mb-1"
          style={{ background: 'var(--gem-gray-700)' }}
        />

        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
          <h2
            id="privacy-confirm-title"
            className="text-[17px] sm:text-[18px] font-bold text-[var(--gem-gray-50)] tracking-tight leading-snug m-0 flex-1"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
          >
            <X size={16} />
          </button>
        </div>

        {body && (
          <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.55] m-0 px-5 sm:px-6 mt-2">
            {body}
          </p>
        )}

        <div className="flex items-center gap-2 px-5 sm:px-6 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 sm:flex-initial px-4 py-3 sm:py-2.5 rounded-lg text-[14px] sm:text-[13.5px] font-semibold text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)] hover:text-[var(--gem-gray-100)] disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 sm:flex-initial px-4 py-3 sm:py-2.5 rounded-lg text-[14px] sm:text-[13.5px] font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: confirmBg }}
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
