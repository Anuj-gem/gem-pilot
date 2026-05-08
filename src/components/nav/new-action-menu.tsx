'use client'

// NewActionMenu — "+ New" dropdown in the nav bar.
// Two options: "New script" (opens upload modal) and "Portfolio review" (links or shows ineligible).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Sparkles } from 'lucide-react'

function openUploadModal() {
  window.dispatchEvent(new Event('gem:open-script-upload-modal'))
}

export function NewActionMenu({
  canRequestConsideration,
}: {
  canRequestConsideration: boolean
}) {
  const [open, setOpen] = useState(false)
  const [creatingReview, setCreatingReview] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white text-gray-900 hover:bg-gray-100 transition-colors font-semibold"
      >
        <Plus size={14} />
        New
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[220px] rounded-xl bg-white z-[60] overflow-hidden py-1"
          style={{
            border: '1px solid #E5E7EB',
            boxShadow: '0 18px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <button
            onClick={() => {
              setOpen(false)
              openUploadModal()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <FileText size={15} className="text-gray-400 shrink-0" />
            <div>
              <span className="font-semibold">New script</span>
              <span className="block text-[11px] text-gray-400 mt-0.5">Upload and evaluate a PDF</span>
            </div>
          </button>

          <div className="border-t border-gray-100 my-0.5" />

          {canRequestConsideration ? (
            <button
              onClick={async () => {
                setOpen(false)
                if (creatingReview) return
                setCreatingReview(true)
                try {
                  const res = await fetch('/api/consideration/create-draft', { method: 'POST' })
                  const data = await res.json()
                  if (data.consideration_id) {
                    router.push(`/review/c/${data.consideration_id}`)
                  }
                } finally {
                  setCreatingReview(false)
                }
              }}
              disabled={creatingReview}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <Sparkles size={15} className="text-purple-500 shrink-0" />
              <div>
                <span className="font-semibold">{creatingReview ? 'Creating…' : 'Portfolio review'}</span>
                <span className="block text-[11px] text-gray-400 mt-0.5">Submit scripts for review</span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-400 cursor-not-allowed">
              <Sparkles size={15} className="text-gray-300 shrink-0" />
              <div>
                <span className="font-medium">Portfolio review</span>
                <span className="block text-[11px] text-gray-300 mt-0.5">Not eligible right now</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
