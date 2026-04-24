'use client'
// SectionGate — wraps a single report section and enforces per-section
// privacy. Owner/admin always sees the content. Non-owners see it only if
// the section is marked public. If not, SectionGate returns null — the
// section is HIDDEN (not blurred).
//
// Owner additionally gets a small privacy pill at the top of each section.
// Click behavior depends on the report's published state:
//
//   - NOT published yet → clicking ANY pill opens the publish modal (via
//     the 'gem:open-publish-modal' event). The modal is the only way to
//     flip sections public + publish, which also funnels free writers to
//     the Pro upgrade via a single clear CTA.
//   - Already published → toggling private→public shows a confirm prompt
//     ("This will appear on the Discover Portal"). Toggling public→private
//     saves immediately (safer direction, no confirm needed).

import { useEffect, useState, useTransition } from 'react'
import { Eye, Lock } from 'lucide-react'
import {
  isSectionVisible,
  resolveVisibility,
  SECTION_META,
  type ReportPrivacy,
  type SectionKey,
} from '@/lib/report-privacy'

interface Props {
  section: SectionKey
  privacy: ReportPrivacy | null | undefined
  isOwnerOrAdmin: boolean
  submissionId?: string
  /** Whether the report is currently published to Discover. Used to gate
   *  the toggle behavior: unpublished → always open publish modal;
   *  published → confirm before making a section public. */
  isPublic?: boolean
  /** Hide the inline privacy pill (owner still sees the content). */
  hideOwnerPill?: boolean
  /** Override the pill position — defaults to absolute top-right, but the
   *  headline section passes a different position to avoid colliding with
   *  the EditableTopCard's edit button. */
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
  isPublic = false,
  hideOwnerPill,
  pillClassName,
  children,
  onPrivacyChange,
}: Props) {
  const [localPrivacy, setLocalPrivacy] = useState<ReportPrivacy | null | undefined>(privacy)
  const [localIsPublic, setLocalIsPublic] = useState<boolean>(isPublic)
  const [pending, startTransition] = useTransition()

  // Sync local state when the parent passes a new `privacy` prop (happens
  // after router.refresh() post-publish, or on re-navigation).
  useEffect(() => { setLocalPrivacy(privacy) }, [privacy])
  useEffect(() => { setLocalIsPublic(isPublic) }, [isPublic])

  // Any component on the page can dispatch 'gem:report-state-changed' after
  // a save (publish, unpublish, privacy tweak). SectionGate listens so its
  // pill flips to the new state instantly — no navigation required.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ isPublic?: boolean; privacy?: ReportPrivacy }>
      const detail = ce.detail
      if (!detail) return
      if (detail.privacy) setLocalPrivacy(detail.privacy)
      if (typeof detail.isPublic === 'boolean') setLocalIsPublic(detail.isPublic)
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

  const savePrivacy = (next: ReportPrivacy) => {
    setLocalPrivacy(next)
    startTransition(async () => {
      try {
        await fetch(`/api/scripts/${submissionId}/privacy`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacy: next }),
        })
        // Let sibling components (other SectionGates, the banner) sync.
        window.dispatchEvent(new CustomEvent('gem:report-state-changed', {
          detail: { privacy: next },
        }))
        onPrivacyChange?.(next)
      } catch {
        setLocalPrivacy(localPrivacy)
      }
    })
  }

  const handlePillClick = () => {
    if (!submissionId) return
    const nextVis = currentVis === 'public' ? 'private' : 'public'

    // Unpublished report — any toggle attempt routes through the publish
    // modal. The modal is where the writer makes their bulk choice + hits
    // the real Publish CTA (which also fires the paywall for free writers).
    if (!localIsPublic) {
      window.dispatchEvent(new CustomEvent('gem:open-publish-modal'))
      return
    }

    // Published report — going private → public requires confirmation so
    // writers don't accidentally expose a section on Discover.
    if (nextVis === 'public') {
      const label = SECTION_META[section]?.label || 'this section'
      const confirmed = typeof window !== 'undefined' && window.confirm(
        `Make "${label}" visible on the Discover Portal? Visitors will see it immediately.`
      )
      if (!confirmed) return
    }

    const next: ReportPrivacy = {
      version: 1,
      sections: {
        ...(localPrivacy?.sections ?? {}),
        [section]: nextVis,
      },
    }
    savePrivacy(next)
  }

  const defaultPillPosition = 'absolute right-0 top-0'
  const pillPositioning = pillClassName ?? defaultPillPosition

  return (
    <div className="relative">
      {isOwnerOrAdmin && !hideOwnerPill && submissionId && (
        <button
          onClick={handlePillClick}
          disabled={pending}
          className={`${pillPositioning} z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold transition-colors ${
            currentVis === 'public'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
              : 'text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)] hover:text-[var(--gem-gray-300)]'
          } ${pending ? 'opacity-60 cursor-wait' : ''}`}
          title={!localIsPublic
            ? 'Publish to choose what visitors see'
            : `Click to make ${currentVis === 'public' ? 'private' : 'public'}`}
        >
          {currentVis === 'public' ? <Eye size={10} /> : <Lock size={10} />}
          {currentVis === 'public' ? 'Public' : 'Private'}
        </button>
      )}
      {children}
    </div>
  )
}
