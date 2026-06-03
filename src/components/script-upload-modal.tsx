'use client'

// ScriptUploadModal — centered modal overlay wrapping InlineScriptUpload.
// Triggered globally via: window.dispatchEvent(new Event('gem:open-script-upload-modal'))
// Closes on backdrop click, Escape, or after successful upload.

import { useEffect, useState } from 'react'
import { InlineScriptUpload } from '@/components/inline-script-upload'

interface Props {
  redirectTo?: string
}

export function ScriptUploadModal({ redirectTo }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleOpen() {
      setOpen(true)
    }
    window.addEventListener('gem:open-script-upload-modal', handleOpen)
    return () => window.removeEventListener('gem:open-script-upload-modal', handleOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-150">
        <InlineScriptUpload startOpen dark onClose={() => setOpen(false)} redirectTo={redirectTo} />
      </div>
    </div>
  )
}
