'use client'

// OwnerActionsMenu — small "···" menu next to the title for owner-only
// actions on the report page. Holds Edit, Download, Submit revision,
// Remove. Replaces the previous row of inline pills above the top card.
//
// Edit fires a window event the EditableTopCard listens for. Download
// triggers the existing DownloadButton flow inline. Submit revision is a
// link to /submit. Remove fires a confirm sheet, then PATCHes the hide
// endpoint and bounces to the dashboard.

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil,
  Download,
  Trash2,
} from 'lucide-react'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'
import { ScriptPrivacySheet } from '@/components/report/script-privacy-sheet'
import {
  IndustryActivitySheet,
  type IndustryActivityRow,
} from '@/components/dashboard/industry-activity-button'

interface Props {
  submissionId: string
  evaluationId: string
  title: string
  declaredFormat: 'Feature film' | 'Series' | null
  isSubscribed: boolean
  /** Per-producer activity rows for this script. When provided, the menu
   *  exposes an "Industry activity" item that opens the same sheet the
   *  dashboard uses. */
  activity?: IndustryActivityRow[]
  /** When set, the Edit item navigates to this href instead of dispatching
   *  the in-page `gem:edit-top-card` event. Used on the dashboard, where
   *  the editable top card lives on a different page (the report). */
  editHref?: string
  /** When set, the Download PDF item navigates to this href instead of
   *  dispatching the in-page `gem:open-download-pdf` event. Used on the
   *  dashboard so the download modal lives on the report page (where the
   *  rendered report DOM is available). The href should include
   *  `?download=1` so the report page auto-opens the modal. */
  downloadHref?: string
  /** Per-script privacy state. When provided, the menu exposes a
   *  "Privacy settings" item that opens the privacy sheet (Published,
   *  Allow reviews, Allow industry access, Show GEM Score, Show all
   *  report sections). Anuj 2026-04-30 v0.10 → 2026-05-01 v0.12.4. */
  isPublic?: boolean
  allowReviews?: boolean
  allowIndustry?: boolean
  /** Optional — defaults to true. Drives the Show GEM Score toggle. */
  showScore?: boolean
  /** Optional — per-section visibility map for the "Show all sections"
   *  expander. Missing keys default to public. */
  reportSections?: Partial<Record<import('@/lib/report-privacy').SectionKey, import('@/lib/report-privacy').Visibility>>
}

export function OwnerActionsMenu({
  submissionId,
  evaluationId,
  title,
  declaredFormat,
  isSubscribed,
  activity,
  editHref,
  downloadHref,
  isPublic,
  allowReviews,
  allowIndustry,
  showScore,
  reportSections,
}: Props) {
  const router = useRouter()
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  // Avoid unused param warnings for `evaluationId` and `title` — they're
  // still in the public API surface for future callers (e.g. a server-
  // side PDF endpoint we may bring back).
  void evaluationId
  void title
  const wrapRef = useRef<HTMLDivElement>(null)

  function triggerEdit() {
    window.dispatchEvent(new CustomEvent('gem:edit-top-card'))
  }

  function triggerDownload() {
    if (!isSubscribed) {
      // Free writers — gate on subscription. Reuse the global upgrade
      // modal listener so the path matches every other Pro action.
      window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
      return
    }
    // Anuj 2026-04-28: download is now a client-side print path through
    // <DownloadPdfModalHost> on the report page. We dispatch a global
    // event; the host listens and pops the modal with the 5 toggles.
    // The dashboard variant of this menu sets `editHref` to
    // /report/[id]?download=1, which the host auto-opens.
    window.dispatchEvent(new CustomEvent('gem:open-download-pdf'))
  }

  async function confirmRemove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/hide`, {
        method: 'POST',
      })
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
        return
      }
    } catch {
      /* fall through */
    } finally {
      setRemoving(false)
      setRemoveConfirm(false)
    }
  }

  const baseBtnClass =
    'inline-flex items-center justify-center gap-1.5 h-8 rounded-full border transition-colors text-[12px] font-medium px-3'

  return (
    <div ref={wrapRef} className="relative inline-flex items-center gap-2">
      {/* Edit */}
      {editHref ? (
        <Link
          href={editHref}
          className={`${baseBtnClass} text-white border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/15`}
          title="Edit title, headline, tags"
        >
          <span className="text-[14px]" aria-hidden>&#9998;</span>
          <span className="hidden sm:inline">Edit</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={triggerEdit}
          className={`${baseBtnClass} text-white border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/15`}
          title="Edit title, headline, tags"
        >
          <span className="text-[14px]" aria-hidden>&#9998;</span>
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}

      {/* Download */}
      {downloadHref ? (
        <Link
          href={downloadHref}
          className={`${baseBtnClass} text-white border-[var(--gem-gray-600)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)]`}
          title="Download PDF"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Download</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={triggerDownload}
          className={`${baseBtnClass} text-white border-[var(--gem-gray-600)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)]`}
          title="Download PDF"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Download</span>
        </button>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => setRemoveConfirm(true)}
        className={`${baseBtnClass} text-white border-[var(--gem-gray-600)] hover:border-red-400 hover:text-red-400`}
        title="Remove this script"
      >
        <Trash2 size={14} />
        <span className="hidden sm:inline">Delete</span>
      </button>

      <PrivacyConfirmSheet
        open={removeConfirm}
        title="Remove this script?"
        body="It will be hidden from your dashboard and from any industry partners who matched it. You can&rsquo;t undo this."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        tone="danger"
        busy={removing}
        onConfirm={confirmRemove}
        onClose={() => setRemoveConfirm(false)}
      />

      {activity !== undefined && (
        <IndustryActivitySheet
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
          rows={activity}
        />
      )}

      {isPublic !== undefined && allowReviews !== undefined && allowIndustry !== undefined && (
        <ScriptPrivacySheet
          open={privacyOpen}
          onClose={() => setPrivacyOpen(false)}
          submissionId={submissionId}
          initialIsPublic={isPublic}
          initialAllowReviews={allowReviews}
          initialAllowIndustry={allowIndustry}
          initialShowScore={showScore}
          initialSections={reportSections}
        />
      )}
    </div>
  )
}

