'use client'

// ReportModal — centered report-in-iframe modal that overlays the
// dashboard. Used by the intercepting parallel route at
//   /dashboard/@modal/(..)report/[id]/page.tsx
//
// Behavior:
//   - URL is /report/[id] while modal is open (parallel route handles this).
//   - Esc closes via router.back() (returns to /dashboard).
//   - Click on the dim backdrop closes.
//   - Close (X) button closes.
//   - Iframe loads the report page with ?embedded=1 so the report's own
//     Nav/footer don't double up on the dashboard chrome.
//   - Mobile: modal goes full-screen.
//
// Anuj 2026-04-30 v0.7.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ExternalLink, Link2, Check } from 'lucide-react'

interface Props {
  reportId: string
}

export function ReportModal({ reportId }: Props) {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Lock background scroll while modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Esc closes the modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [router])

  const close = () => router.back()

  const copyShareLink = async () => {
    try {
      const url = `${window.location.origin}/report/${reportId}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — silent fail */
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-stretch sm:items-start justify-center sm:py-8 px-0 sm:px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="relative w-full sm:max-w-4xl bg-white sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal chrome — Close + Open in new tab + Copy link */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 hover:bg-white text-gray-800 text-[11.5px] font-semibold px-3 py-1.5 shadow-md border border-gray-200"
            title="Copy shareable link"
          >
            {copied ? <Check size={13} className="text-green-600" /> : <Link2 size={13} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <a
            href={`/report/${reportId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/95 hover:bg-white text-gray-700 shadow-md border border-gray-200"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/95 hover:bg-white text-gray-700 shadow-md border border-gray-200"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Loading skeleton — sits behind iframe until it fires onLoad. */}
        {!loaded && (
          <div className="absolute inset-0 z-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
              <p className="text-[12px] text-gray-500">Loading report…</p>
            </div>
          </div>
        )}

        {/* The report itself — loaded with ?embedded=1 so it strips its
            own Nav and the SiteFooter for clean modal chrome. */}
        <iframe
          src={`/report/${reportId}?embedded=1`}
          onLoad={() => setLoaded(true)}
          className="w-full flex-1 border-0 bg-white"
          style={{ minHeight: '100vh', height: 'calc(100vh - 64px)' }}
          title="Report"
        />
      </div>
    </div>
  )
}
