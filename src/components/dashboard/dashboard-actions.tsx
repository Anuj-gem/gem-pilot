'use client'

// DashboardActions — "New script" button row.

import { FileText } from 'lucide-react'

export function DashboardActions() {
  function openUploadModal() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <div className="flex items-stretch gap-2.5">
      <button
        onClick={openUploadModal}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
      >
        <FileText size={15} className="text-gray-400" />
        New script
      </button>
    </div>
  )
}
