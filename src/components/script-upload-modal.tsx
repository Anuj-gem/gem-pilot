'use client'

// ScriptUploadModal — centered modal overlay wrapping InlineScriptUpload.
// Triggered globally via: window.dispatchEvent(new Event('gem:open-script-upload-modal'))
// Closes on backdrop click, Escape, or after successful upload.
//
// Usage gating: if guestEvalsUsed >= 2, intercepts the open and fires
// gem:open-upgrade-modal instead, so the user sees the paywall.

import { useEffect, useState } from 'react'
import { InlineScriptUpload } from '@/components/inline-script-upload'

const FREE_EVAL_LIMIT = 2

interface Props {
  redirectTo?: string
  /** Number of total submissions for guest user (undefined = no gate) */
  guestEvalsUsed?: number
}

export function ScriptUploadModal({ redirectTo, guestEvalsUsed }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleOpen() {
      // Gate: if guest user has hit eval limit, show upgrade modal instead
      if (guestEvalsUsed !== undefined && guestEvalsUsed >= FREE_EVAL_LIMIT) {
        window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal', {
          detail: { contextMessage: "You've used your 2 free evaluations. Become a member for unlimited access." },
        }))
        return
      }
      setOpen(true)
    }
    window.addEventListener('gem:open-script-upload-modal', handleOpen)
    return () => window.removeEventListener('gem:open-script-upload-modal', handleOpen)
  }, [guestEvalsUsed])

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
        <InlineScriptUpload startOpen onClose={() => setOpen(false)} redirectTo={redirectTo} />
      </div>
    </div>
  )
}
