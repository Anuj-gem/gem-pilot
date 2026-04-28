'use client'

// DownloadPdfModal — owner-only modal for printing the report as a PDF.
//
// Anuj 2026-04-28: replaces the broken /api/evaluations/[id]/download-pdf
// flow with a client-side print path. The owner picks which sections to
// include (5 toggles, all on by default), hits Download, and the browser
// opens its native print dialog with the selected sections only — they
// pick "Save as PDF" from there.
//
// How the section gating works:
//   1. Each section on the report page is wrapped in a marker element
//      with data-pdf-section="<key>" (added on the page itself).
//   2. When the user hits Download here, we add a <style> tag to the
//      document head with @media print rules that hide every section
//      whose key wasn't toggled on.
//   3. We also force-hide chrome (nav, privacy pills, action menu, etc.)
//      by toggling .gem-no-print on the relevant elements via a class
//      we add to <body>.
//   4. window.print() fires, the user picks Save as PDF, and we tear
//      down the style tag once the print dialog closes.
//
// Mounting: the report page mounts a single <DownloadPdfModalHost />
// at the page level. The OwnerActionsMenu fires a `gem:open-download-pdf`
// custom event on click; the host listens and pops the modal. This keeps
// the menu component decoupled from the modal's state.

import { useEffect, useState } from 'react'
import { Download, FileText, Loader2, X } from 'lucide-react'

interface SectionToggle {
  key: 'score' | 'whats_working' | 'cast' | 'packaging' | 'project_complexity'
  label: string
  hint: string
  /** Comma-separated list of CSS data-pdf-section values that this toggle
   *  hides when off. Most are 1:1; some (like Cast) cover multiple under-
   *  the-hood section keys. */
  selectors: string[]
}

const SECTIONS: SectionToggle[] = [
  {
    key: 'score',
    label: 'Score badge',
    hint: 'Your commercial-potential score on the cover.',
    selectors: ['score'],
  },
  {
    key: 'whats_working',
    label: 'Why this is a hit',
    hint: 'The strongest commercial notes.',
    selectors: ['whats_working'],
  },
  {
    key: 'cast',
    label: 'Cast',
    hint: 'Lead and supporting characters.',
    selectors: ['cast'],
  },
  {
    key: 'packaging',
    label: 'Packaging',
    hint: 'Audience, budget tier, IP potential.',
    selectors: ['packaging'],
  },
  {
    key: 'project_complexity',
    label: 'Project Complexity',
    hint: 'Production and cast complexity cards.',
    selectors: ['project_complexity'],
  },
]

interface HostProps {
  /** Auto-open the modal once on mount. The report page passes `true`
   *  when the URL has `?download=1`, so the dashboard's "Download PDF"
   *  menu item can navigate here and pop the modal automatically. */
  autoOpen?: boolean
}

export function DownloadPdfModalHost({ autoOpen = false }: HostProps) {
  const [open, setOpen] = useState(autoOpen)

  // Listen for the global event from the OwnerActionsMenu.
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('gem:open-download-pdf', handler)
    return () => window.removeEventListener('gem:open-download-pdf', handler)
  }, [])

  return (
    <DownloadPdfModal open={open} onClose={() => setOpen(false)} />
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
}

function DownloadPdfModal({ open, onClose }: ModalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    SECTIONS.reduce(
      (acc, s) => {
        acc[s.key] = true
        return acc
      },
      {} as Record<string, boolean>
    )
  )
  const [printing, setPrinting] = useState(false)

  // Lock body scroll while open + Escape closes.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function toggle(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleDownload() {
    setPrinting(true)
    try {
      // Build the @media print CSS that hides excluded sections + page
      // chrome. We append a single <style> tag to <head> and remove it
      // once the print dialog closes (whether the user saved or cancelled).
      const excludedSelectors: string[] = []
      for (const s of SECTIONS) {
        if (!selected[s.key]) {
          for (const sel of s.selectors) {
            excludedSelectors.push(`[data-pdf-section="${sel}"]`)
          }
        }
      }

      const style = document.createElement('style')
      style.id = 'gem-pdf-print-style'
      style.innerHTML = `
        @media print {
          .gem-no-print { display: none !important; }
          ${excludedSelectors.length > 0 ? `${excludedSelectors.join(', ')} { display: none !important; }` : ''}
          @page { margin: 16mm 14mm; }
          body { background: #fff !important; }
        }
      `
      document.head.appendChild(style)

      // Add a class to the body that page chrome targets to hide itself
      // (nav, privacy controls, owner actions menu, status pill, etc.).
      document.body.classList.add('gem-pdf-printing')

      // Defer the print call to next tick so the style tag is in the DOM.
      await new Promise((r) => setTimeout(r, 50))

      window.print()

      // The print dialog is modal in most browsers; print() returns once
      // it closes. Clean up.
      document.body.classList.remove('gem-pdf-printing')
      const styleEl = document.getElementById('gem-pdf-print-style')
      if (styleEl) styleEl.remove()

      onClose()
    } finally {
      setPrinting(false)
    }
  }

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="gem-no-print fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md sm:w-[min(92vw,460px)] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90vh]"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div
          aria-hidden
          className="sm:hidden w-10 h-1 rounded-full mx-auto mt-2.5 mb-1"
          style={{ background: 'var(--gem-gray-700)' }}
        />
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="inline-flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: 36,
                height: 36,
                background: 'rgba(124,58,237,0.10)',
                color: 'var(--gem-accent)',
              }}
            >
              <FileText size={18} />
            </span>
            <div className="min-w-0">
              <h2
                id="pdf-modal-title"
                className="text-[16px] sm:text-[17px] font-bold text-[var(--gem-gray-50)] tracking-tight m-0 leading-tight"
              >
                Download PDF
              </h2>
              <p className="text-[12.5px] text-[var(--gem-gray-400)] m-0 mt-1 leading-snug">
                Pick what to include, then choose &ldquo;Save as PDF&rdquo;
                from the print dialog.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-3">
          {SECTIONS.map((s, i) => (
            <ToggleRow
              key={s.key}
              label={s.label}
              hint={s.hint}
              checked={!!selected[s.key]}
              onTap={() => toggle(s.key)}
              isLast={i === SECTIONS.length - 1}
            />
          ))}
        </div>

        <div className="px-5 sm:px-6 pt-3 pb-4 border-t border-[var(--gem-gray-800)]">
          <button
            type="button"
            onClick={handleDownload}
            disabled={printing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-white px-4 py-3 text-[14px] disabled:opacity-60"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
            }}
          >
            {printing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} strokeWidth={2.25} />
            )}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onTap,
  isLast,
}: {
  label: string
  hint: string
  checked: boolean
  onTap: () => void
  isLast: boolean
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`w-full flex items-start gap-3 py-3 text-left transition-colors hover:bg-[var(--gem-gray-900)] -mx-2 px-2 rounded-lg ${
        isLast ? '' : 'border-b border-[var(--gem-gray-800)]'
      }`}
    >
      <span
        aria-hidden
        className="mt-0.5 inline-flex items-center justify-center rounded-md shrink-0"
        style={{
          width: 18,
          height: 18,
          border: `1.5px solid ${checked ? 'var(--gem-accent)' : 'var(--gem-gray-600)'}`,
          background: checked ? 'var(--gem-accent)' : '#fff',
        }}
      >
        {checked && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 5.5L4.5 8L9 3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
          {label}
        </p>
        <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
          {hint}
        </p>
      </div>
    </button>
  )
}
