'use client'

// Small download button on the report top card. Click → dropdown menu with
// two options: Pitch Only and Full Report. For free writers, the menu still
// shows both options but tags them with "Pro" — clicking either downloads
// the unblurred-only "teaser" PDF (mirrors what they see on screen) and
// surfaces a tiny upgrade nudge at the bottom of the menu.
//
// Only rendered for owners (or admin). Visitors don't see it.
import { useEffect, useRef, useState } from 'react'
import { Download, Sparkles, FileText, Files } from 'lucide-react'

interface Props {
  evaluationId: string
  isSubscribed: boolean
}

export function DownloadButton({ evaluationId, isSubscribed }: Props) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState<'pitch' | 'full' | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const triggerDownload = async (type: 'pitch' | 'full') => {
    if (downloading) return
    setDownloading(type)
    try {
      // Anchor-based download — lets the browser handle the file save dialog
      // properly (vs fetch+blob which can fail in some mobile browsers).
      const url = `/api/scripts/${evaluationId}/download?type=${type}`
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      // Brief delay so the spinner shows long enough to register
      setTimeout(() => {
        setDownloading(null)
        setOpen(false)
      }, 600)
    }
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Download report"
        title="Download report as PDF"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] hover:border-[var(--gem-gray-500)] transition-colors"
      >
        <Download size={13} />
        Download
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-30 rounded-xl overflow-hidden"
          style={{
            background: '#fff',
            border: '1px solid var(--gem-gray-700)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
            minWidth: 240,
          }}
        >
          <MenuItem
            icon={<FileText size={14} />}
            label="Pitch Only"
            hint="Title, headline, what's working, characters, package angles."
            badge={!isSubscribed ? 'Pro' : undefined}
            loading={downloading === 'pitch'}
            onClick={() => triggerDownload('pitch')}
          />
          <div style={{ borderTop: '1px solid var(--gem-gray-800)' }} />
          <MenuItem
            icon={<Files size={14} />}
            label="Full Report"
            hint="Everything — pitch, dev priorities, narrative breakdown, production planning."
            badge={!isSubscribed ? 'Pro' : undefined}
            loading={downloading === 'full'}
            onClick={() => triggerDownload('full')}
          />
          {!isSubscribed && (
            <div
              className="px-4 py-3 flex items-center gap-2 text-[11.5px]"
              style={{
                background: 'rgba(124,58,237,0.06)',
                borderTop: '1px solid var(--gem-gray-800)',
                color: 'var(--gem-gray-400)',
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--gem-accent)' }} />
              <span>
                Free downloads include only what you can already see. Upgrade for the full PDFs.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  hint,
  badge,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  badge?: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[var(--gem-gray-900)] disabled:opacity-60"
      role="menuitem"
    >
      <span
        className="flex-shrink-0 w-7 h-7 rounded-md grid place-items-center mt-0.5"
        style={{ background: 'var(--gem-gray-800)', color: 'var(--gem-gray-200)' }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold text-[var(--gem-gray-50)] leading-tight">
            {loading ? 'Preparing PDF…' : label}
          </span>
          {badge && (
            <span
              className="text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded"
              style={{
                color: 'var(--gem-accent)',
                background: 'rgba(124,58,237,0.10)',
                border: '1px solid rgba(124,58,237,0.28)',
                letterSpacing: '0.10em',
              }}
            >
              {badge}
            </span>
          )}
        </span>
        <span className="block text-[11.5px] text-[var(--gem-gray-400)] mt-0.5 leading-snug">
          {hint}
        </span>
      </span>
    </button>
  )
}
