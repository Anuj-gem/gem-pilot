'use client'

// OwnerActionsMenu — small "···" menu next to the title for owner-only
// actions on the report page. Holds Edit, Download, Submit revision,
// Remove. Replaces the previous row of inline pills above the top card.
//
// Edit fires a window event the EditableTopCard listens for. Download
// triggers the existing DownloadButton flow inline. Submit revision is a
// link to /submit. Remove fires a confirm sheet, then PATCHes the hide
// endpoint and bounces to the dashboard.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
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
  const [activityOpen, setActivityOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Avoid unused param warnings for `evaluationId` and `title` — they're
  // still in the public API surface for future callers (e.g. a server-
  // side PDF endpoint we may bring back).
  void evaluationId
  void title
  void editHref
  void downloadHref
  void isSubscribed
  const wrapRef = useRef<HTMLDivElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div ref={wrapRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-[rgba(0,0,0,0.06)]"
        style={{ color: '#78716C' }}
        title="More actions"
      >
        <MoreHorizontal size={18} />
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg py-1 z-50"
          style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          {/* Delete */}
          <button
            type="button"
            onClick={async () => {
              if (!confirm('Permanently delete this script? All history will be erased. This cannot be undone.')) return
              setDeleting(true)
              setMenuOpen(false)
              try {
                const res = await fetch(`/api/scripts/${submissionId}/hide`, { method: 'DELETE' })
                if (res.ok) {
                  router.push('/dashboard')
                  router.refresh()
                }
              } finally {
                setDeleting(false)
              }
            }}
            disabled={deleting}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[rgba(239,68,68,0.04)] border-0 bg-transparent text-left cursor-pointer disabled:opacity-50"
            style={{ color: '#991b1b' }}
          >
            <Trash2 size={14} style={{ color: '#991b1b' }} />
            {deleting ? 'Deleting...' : 'Delete script'}
          </button>

          {/* Only visible to you note */}
          <div className="px-3.5 py-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <p className="text-[11px] m-0" style={{ color: '#A8A29E' }}>Only visible to you</p>
          </div>
        </div>
      )}

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

