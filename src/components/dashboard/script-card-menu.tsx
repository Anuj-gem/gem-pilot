'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ScriptCardMenuProps {
  scriptId: string
  evaluationId: string | null
  onDelete?: (id: string) => void
}

export function ScriptCardMenu({ scriptId, evaluationId, onDelete }: ScriptCardMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleDelete() {
    setOpen(false)
    if (onDelete) {
      onDelete(scriptId)
    } else {
      await fetch(`/api/scripts/${scriptId}/hide`, { method: 'DELETE' })
      router.refresh()
    }
  }

  function handleEdit() {
    setOpen(false)
    if (evaluationId) {
      router.push(`/report/${evaluationId}`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-0 bg-transparent hover:bg-gray-100 transition-colors"
        style={{ color: '#9ca3af' }}
        aria-label="Script options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 py-1 rounded-lg shadow-lg"
          style={{ background: '#ffffff', border: '1px solid #e5e7eb', minWidth: 120 }}
        >
          {evaluationId && (
            <button
              onClick={handleEdit}
              className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-gray-50 transition-colors cursor-pointer border-0 bg-transparent"
              style={{ color: '#374151' }}
            >
              Edit
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-gray-50 transition-colors cursor-pointer border-0 bg-transparent"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
