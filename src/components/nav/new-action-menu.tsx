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
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white text-gray-900 hover:bg-gray-100 transition-colors font-semibold"
    >
      <Plus size={14} />
      New script
    </button>
  )
}
