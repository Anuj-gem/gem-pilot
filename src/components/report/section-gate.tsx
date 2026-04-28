'use client'
// SectionGate — wraps a single report section and enforces per-section
// privacy. Owner/admin always sees the content. Non-owners see it only if
// the section is marked public. If not, SectionGate returns null — the
// section is HIDDEN (not blurred).
//
// Selznick-4 v4 (2026-04-27): the publish/unpublish concept is gone for
// new posts (everything's public from the moment it's scored). Owners get a
// small Public/Private pill on each section; tap → quick yes/no confirm
// sheet → flip. No big modal, no publish gate.

import { useEffect, useState, useTransition } from 'react'
import { Eye, Lock } from 'lucide-react'
import {
  isSectionVisible,
  resolveVisibility,
  SECTION_META,
  type ReportPrivacy,
  type SectionKey,
} from '@/lib/report-privacy'
import { PrivacyConfirmSheet } from './privacy-confirm-sheet'

interface Props {
  section: SectionKey
  privacy: ReportPrivacy | null | undefined
  isOwnerOrAdmin: boolean
  submissionId?: string
  /** Legacy prop kept for back-compat — no longer used for gating; the
   *  publish concept has been retired. Owners can flip sections directly. */
  isPublic?: boolean
  /** Hide the inline privacy pill (owner still sees the content). */
  hideOwnerPill?: boolean
  /** Override the pill position — defaults to absolute top-right. */
  pillClassName?: string
  children: React.ReactNode
  /** Optional callback after the privacy state changes. */
  onPrivacyChange?: (next: ReportPrivacy) => void
  /** Per-section privacy is Pro-only (Anuj 2026-04-28). When false, the
   *  pill renders as a "Pro" badge and tapping it opens the small
   *  upgrade prompt instead of letting the writer flip the section. */
  isProSubscriber?: boolean
}

export function SectionGate({
  section,
  privacy,
  isOwnerOrAdmin,
  submissionId,
  hideOwnerPill,
  pillClassName,
  children,
  onPrivacyChange,
  isProSubscriber = true,
}: Props) {
  const [localPrivacy, setLocalPrivacy] = useState<ReportPrivacy | null | undefined>(privacy)
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [proPromptOpen, setProPromptOpen] = useState(false)

  // Sync local state when the parent passes a new `privacy` prop (happens
  // after router.refresh(), or on re-navigation).
  useEffect(() => {
    setLocalPrivacy(privacy)
  }, [privacy])

  // Any component on the page can dispatch 'gem:report-state-changed' after
  // a save. SectionGate listens so its pill flips to the new state instantly.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ privacy?: ReportPrivacy }>
      const detail = ce.detail
      if (!detail) return
      if (detail.privacy) setLocalPrivacy(detail.privacy)
    }
    window.addEventListener('gem:report-state-changed', handler)
    return () => window.removeEventListener('gem:report-state-changed', handler)
  }, [])

  const visible = isSectionVisible({
    privacy: localPrivacy,
    section,
    isOwnerOrAdmin,
  })

  if (!visible) return null

  const currentVis = resolveVisibility(localPrivacy, section)
  const nextVis: 'public' | 'private' = currentVis === 'public' ? 'private' : 'public'
  const sectionLabel = SECTION_META[section]?.label || 'this section'

  const savePrivacy = (next: ReportPrivacy) => {
    setLocalPrivacy(next)
    startTransition(async () => {
      try {
        await fetch(`/api/scripts/${submissionId}/privacy`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacy: next }),
        })
        // Let sibling components (other SectionGates, the status line) sync.
        window.dispatchEvent(
          new CustomEvent('gem:report-state-changed', {
            detail: { privacy: next },
          })
        )
        onPrivacyChange?.(next)
      } catch {
        setLocalPrivacy(localPrivacy)
      }
    })
  }

  const handleConfirm = () => {
    if (!submissionId) {
      setConfirmOpen(false)
      return
    }
    const next: ReportPrivacy = {
      version: 1,
      sections: {
        ...(localPrivacy?.sections ?? {}),
        [section]: nextVis,
      },
      ...(localPrivacy?.show_score !== undefined
        ? { show_score: localPrivacy.show_score }
        : {}),
    }
    savePrivacy(next)
    setConfirmOpen(false)
  }

  const defaultPillPosition = 'absolute right-0 top-0'
  const pillPositioning = pillClassName ?? defaultPillPosition

  return (
    <div className="relative">
      {isOwnerOrAdmin && !hideOwnerPill && submissionId && (
        isProSubscriber ? (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            className={`${pillPositioning} z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold transition-colors ${
              currentVis === 'public'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                : 'text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)] hover:text-[var(--gem-gray-300)]'
            } ${pending ? 'opacity-60 cursor-wait' : ''}`}
            title={`Tap to make ${sectionLabel} ${nextVis}`}
          >
            {currentVis === 'public' ? <Eye size={10} /> : <Lock size={10} />}
            {currentVis === 'public' ? 'Visible' : 'Hidden'}
          </button>
        ) : (
          <button
            onClick={() => setProPromptOpen(true)}
            className={`${pillPositioning} z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold text-white transition-opacity hover:opacity-90`}
            style={{ background: 'var(--gem-accent)' }}
            title="Per-section privacy is a Pro feature"
            aria-label={`Per-section privacy for ${sectionLabel} — Pro`}
          >
            Pro
          </button>
        )
      )}
      {children}
      <PrivacyConfirmSheet
        open={confirmOpen}
        title={
          nextVis === 'private'
            ? `Hide "${sectionLabel}"?`
            : `Show "${sectionLabel}"?`
        }
        body={
          nextVis === 'private'
            ? 'Industry partners won\u2019t see this section. You can flip it back anytime.'
            : 'Industry partners will see this section. You can flip it back anytime.'
        }
        confirmLabel={nextVis === 'private' ? 'Hide section' : 'Show section'}
        tone={nextVis === 'private' ? 'primary' : 'success'}
        busy={pending}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />

      <SectionUpgradePrompt
        open={proPromptOpen}
        onClose={() => setProPromptOpen(false)}
      />
    </div>
  )
}

// Small contextual upgrade prompt \u2014 shown when a free writer taps the
// inline "Pro" pill on a report section. Mirrors the prompt inside the
// dashboard privacy panel so the upgrade message is consistent across
// every Pro-gated affordance. Anuj 2026-04-28.
function SectionUpgradePrompt({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe() {
    setBusy(true)
    setError('')
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
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  if (!open) return null
  return (
    <div
      onClick={onClose}
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
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 w-7 h-7 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
          >
            \u00d7
          </button>
        </div>
        <h3 className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
          Upgrade to Pro
        </h3>
        <p className="text-[13.5px] text-[var(--gem-gray-300)] m-0 mt-1.5 leading-snug">
          Hide specific sections and publish to industry partners \u2014 Pro only.
        </p>
        {error && (
          <p className="text-[12px] text-red-600 m-0 mt-3">{error}</p>
        )}
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={busy}
          className="w-full mt-4 py-2.5 rounded-lg font-semibold text-white text-[14px] disabled:opacity-60 transition-opacity hover:opacity-95"
          style={{ background: 'var(--gem-accent)' }}
        >
          {busy ? 'Redirecting\u2026' : 'Upgrade \u2014 $20/mo'}
        </button>
      </div>
    </div>
  )
}
