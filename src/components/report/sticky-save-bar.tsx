'use client'

// Sticky save/cancel bar that appears at the bottom of the viewport
// when inline editing is active. Slides up on mount, slides down on
// unmount (via CSS animation).

import { Loader2, Check, X } from 'lucide-react'
import { useEditContext } from './edit-context'

export function StickySaveBar() {
  const { isEditing, saving, save, cancelEditing, error } = useEditContext()

  if (!isEditing) return null

  return (
    <>
      <style>{`
        @keyframes slideUpBar {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sticky-save-bar {
          animation: slideUpBar 0.25s ease-out;
        }
      `}</style>
      <div
        className="sticky-save-bar fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{
          background: 'rgba(20, 16, 40, 0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[13px] font-medium text-[var(--gem-gold)]">
              Editing mode
            </span>
            {error && (
              <span className="text-[12px] text-red-400 truncate max-w-[300px]">
                {error}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)] hover:text-white disabled:opacity-50 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-semibold bg-[var(--gem-gold)] text-[var(--gem-black)] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
