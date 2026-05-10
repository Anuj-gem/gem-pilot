'use client'

// NewActionMenu — "New script" button in the nav bar.
// Opens the upload modal directly (no dropdown needed).

import { Plus } from 'lucide-react'

export function NewActionMenu() {
  function openUploadModal() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <button
      onClick={openUploadModal}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white hover:brightness-110 transition-all font-semibold"
      style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
    >
      <Plus size={14} />
      New script
    </button>
  )
}
