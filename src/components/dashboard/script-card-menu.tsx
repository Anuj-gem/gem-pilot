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
        className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-0 bg-transparent text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Script options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 py-1 rounded-lg shadow-lg"
          style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.12)', minWidth: 120 }}
        >
          {evaluationId && (
            <button
              onClick={handleEdit}
              className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-red-400 hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
