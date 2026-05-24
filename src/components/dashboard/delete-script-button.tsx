'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteScriptButton({ scriptId, title, evaluationId }: { scriptId: string; title: string; evaluationId?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen) }}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-8 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          {evaluationId && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); router.push(`/report/${evaluationId}?edit=true`) }}
              className="block w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors border-0 bg-transparent cursor-pointer"
            >
              Edit details
            </button>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setConfirmDelete(true) }}
            className="block w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}

      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }}>
            <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <p className="text-[15px] font-semibold text-gray-900 m-0 mb-2">Delete this script?</p>
              <p className="text-[13px] text-gray-500 m-0 mb-4">
                This will permanently delete &ldquo;{title}&rdquo; and its evaluation. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }}
                  className="px-3 py-2 text-[13px] font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDeleting(true)
                    await fetch(`/api/scripts/${scriptId}/hide`, { method: 'DELETE' })
                    setConfirmDelete(false)
                    setDeleting(false)
                    router.refresh()
                  }}
                  className="px-3 py-2 text-[13px] font-semibold text-white rounded-lg transition-colors border-0 cursor-pointer disabled:opacity-50"
                  style={{ background: '#dc2626' }}
                >
                  {deleting ? 'Deleting...' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
