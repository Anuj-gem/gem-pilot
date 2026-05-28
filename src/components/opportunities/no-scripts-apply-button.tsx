'use client'

// NoScriptsApplyButton — shown on opportunity detail when the user has
// zero scripts. Clicking opens a dialog explaining they need to upload
// first. OK opens the upload modal, Cancel dismisses.

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

export function NoScriptsApplyButton() {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-[14px] font-medium text-white border-0 cursor-pointer transition-all hover:brightness-110"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', textDecoration: 'none' }}
      >
        Apply now <ArrowRight size={14} />
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDialog(false) }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative rounded-xl p-6 max-w-sm mx-4 text-center animate-in fade-in zoom-in-95 duration-150"
            style={{ background: '#2b1a55' }}
          >
            <p className="text-[15px] font-semibold text-white m-0 mb-2">Upload a script to apply</p>
            <p className="text-[13px] text-white/60 m-0 mb-5">
              You don't have any scripts on your GEM account. Upload one to apply for this opportunity.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-white/60 hover:text-white border border-white/15 bg-transparent cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDialog(false)
                  window.dispatchEvent(new Event('gem:open-script-upload-modal'))
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white border-0 cursor-pointer transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                Upload script
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
