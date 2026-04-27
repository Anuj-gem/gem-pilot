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
  Loader2,
} from 'lucide-react'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'

interface Props {
  submissionId: string
  evaluationId: string
  title: string
  declaredFormat: 'Feature film' | 'Series' | null
  isSubscribed: boolean
}

export function OwnerActionsMenu({
  submissionId,
  evaluationId,
  title,
  declaredFormat,
  isSubscribed,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [downloading, setDownloading] = useState(false)
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

  async function triggerDownload() {
    setOpen(false)
    if (!isSubscribed) {
      // Free writers — DownloadButton's flow gates on subscription too;
      // mirror the same upgrade prompt by dispatching to the global
      // upgrade modal listener.
      window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
      return
    }
    setDownloading(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/download-pdf`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9]+/g, '-')}-GEM-report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      /* swallow — keep UI clean */
    } finally {
      setDownloading(false)
    }
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
          <MenuItem icon={<Pencil size={14} />} onClick={triggerEdit}>
            Edit title, headline, tags
          </MenuItem>
          <MenuItem
            icon={
              downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )
            }
            onClick={triggerDownload}
            disabled={downloading}
          >
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </MenuItem>
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
