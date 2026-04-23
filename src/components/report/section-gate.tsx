'use client'
// SectionGate — wraps a single report section and enforces per-section
// privacy. Owner/admin always sees the content. Non-owners see it only if
// the section is marked public. If not, SectionGate returns null — the
// section is HIDDEN (not blurred).
//
// Owner additionally gets a small privacy pill rendered at the top of the
// section (click to toggle public ⇄ private). Clicking fires a PATCH and
// optimistically re-renders.

import { useState, useTransition } from 'react'
import { Eye, Lock } from 'lucide-react'
import {
  isSectionVisible,
  resolveVisibility,
  type ReportPrivacy,
  type SectionKey,
} from '@/lib/report-privacy'

interface Props {
  section: SectionKey
  privacy: ReportPrivacy | null | undefined
  isOwnerOrAdmin: boolean
  submissionId?: string
  /** Hide the inline privacy pill (owner still sees the content; used for
   *  sections that already have their own privacy treatment, like the top
   *  card which surfaces the pill alongside the edit button). */
  hideOwnerPill?: boolean
  children: React.ReactNode
  /** Optional callback after the privacy state changes (lets a parent
   *  refresh derived state — e.g. the PrivacyPanel's public count). */
  onPrivacyChange?: (next: ReportPrivacy) => void
}

export function SectionGate({
  section,
  privacy,
  isOwnerOrAdmin,
  submissionId,
  hideOwnerPill,
  children,
  onPrivacyChange,
}: Props) {
  const [localPrivacy, setLocalPrivacy] = useState<ReportPrivacy | null | undefined>(privacy)
  const [pending, startTransition] = useTransition()

  const visible = isSectionVisible({
    privacy: localPrivacy,
    section,
    isOwnerOrAdmin,
  })

  if (!visible) return null

  const currentVis = resolveVisibility(localPrivacy, section)

  const toggle = () => {
    if (!submissionId) return
    const next: ReportPrivacy = {
      version: 1,
      sections: {
        ...(localPrivacy?.sections ?? {}),
        [section]: currentVis === 'public' ? 'private' : 'public',
      },
    }
    setLocalPrivacy(next)
    startTransition(async () => {
      try {
        await fetch(`/api/scripts/${submissionId}/privacy`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacy: next }),
        })
        onPrivacyChange?.(next)
      } catch {
        // Revert on failure. Rare; UI will re-sync on next render.
        setLocalPrivacy(localPrivacy)
      }
    })
  }

  return (
    <div className="relative">
      {isOwnerOrAdmin && !hideOwnerPill && submissionId && (
        <button
          onClick={toggle}
          disabled={pending}
          className={`absolute right-0 top-0 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold transition-colors ${
            currentVis === 'public'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
              : 'text-[var(--gem-gray-500)] bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] hover:text-[var(--gem-gray-300)]'
          } ${pending ? 'opacity-60 cursor-wait' : ''}`}
          title={`Click to make ${currentVis === 'public' ? 'private' : 'public'}`}
        >
          {currentVis === 'public' ? <Eye size={10} /> : <Lock size={10} />}
          {currentVis === 'public' ? 'Public' : 'Private'}
        </button>
      )}
      {children}
    </div>
  )
}
