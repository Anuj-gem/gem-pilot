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
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pencil,
  Download,
  RefreshCw,
  Trash2,
  Activity,
} from 'lucide-react'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'
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
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  // Avoid unused param warnings for `evaluationId` and `title` — they're
  // still in the public API surface for future callers (e.g. a server-
  // side PDF endpoint we may bring back).
  void evaluationId
  void title
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function triggerEdit() {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('gem:edit-top-card'))
  }

  function triggerDownload() {
    setOpen(false)
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

  const reviseHref = declaredFormat
    ? `/submit?format=${encodeURIComponent(declaredFormat)}`
    : '/submit'

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Writer actions"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)] transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 rounded-xl bg-white py-1 min-w-[200px]"
          style={{
            border: '1px solid var(--gem-gray-700)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          }}
          role="menu"
        >
          {activity !== undefined && (
            <>
              <MenuItem
                icon={<Activity size={14} />}
                onClick={() => {
                  setOpen(false)
                  setActivityOpen(true)
                }}
              >
                Industry activity
              </MenuItem>
              <div className="my-1 border-t border-[var(--gem-gray-700)]" />
            </>
          )}
          {editHref ? (
            <MenuLink
              icon={<Pencil size={14} />}
              href={editHref}
              onClick={() => setOpen(false)}
            >
              Edit title, headline, tags
            </MenuLink>
          ) : (
            <MenuItem icon={<Pencil size={14} />} onClick={triggerEdit}>
              Edit title, headline, tags
            </MenuItem>
          )}
          {downloadHref ? (
            <MenuLink
              icon={<Download size={14} />}
              href={downloadHref}
              onClick={() => setOpen(false)}
            >
              Download PDF
            </MenuLink>
          ) : (
            <MenuItem
              icon={<Download size={14} />}
              onClick={triggerDownload}
            >
              Download PDF
            </MenuItem>
          )}
          <MenuLink
            icon={<RefreshCw size={14} />}
            href={reviseHref}
            onClick={() => setOpen(false)}
          >
            Submit a revision
          </MenuLink>
          <div className="my-1 border-t border-[var(--gem-gray-700)]" />
          <MenuItem
            icon={<Trash2 size={14} />}
            onClick={() => {
              setOpen(false)
              setRemoveConfirm(true)
            }}
            danger
          >
            Remove this script
          </MenuItem>
        </div>
      )}

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
    </div>
  )
}

function MenuItem({
  icon,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] hover:bg-[var(--gem-gray-900)] disabled:opacity-50 transition-colors"
      style={{
        color: danger ? '#dc2626' : 'var(--gem-gray-100)',
      }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{children}</span>
    </button>
  )
}

function MenuLink({
  icon,
  href,
  onClick,
  children,
}: {
  icon: React.ReactNode
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] text-[var(--gem-gray-100)] hover:bg-[var(--gem-gray-900)] transition-colors"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{children}</span>
    </Link>
  )
}
