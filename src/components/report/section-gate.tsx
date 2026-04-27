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
}: Props) {
  const [localPrivacy, setLocalPrivacy] = useState<ReportPrivacy | null | undefined>(privacy)
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

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
          {currentVis === 'public' ? 'Visible' : 'Private'}
        </button>
      )}
      {children}
      <PrivacyConfirmSheet
        open={confirmOpen}
        title={
          nextVis === 'private'
            ? `Make "${sectionLabel}" private?`
            : `Make "${sectionLabel}" public?`
        }
        body={
          nextVis === 'private'
            ? 'Industry partners won\u2019t see this section. You can flip it back anytime.'
            : 'Industry partners will see this section. You can flip it back anytime.'
        }
        confirmLabel={nextVis === 'private' ? 'Make private' : 'Make public'}
        tone={nextVis === 'private' ? 'primary' : 'success'}
        busy={pending}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
