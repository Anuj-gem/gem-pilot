'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FailedScriptCardProps {
  scriptId: string
  title: string
  format: string | null
  createdAt: string
}

const placeholderGradient = 'linear-gradient(135deg, #7c3aed, #6d28d9)'

export function FailedScriptCard({ scriptId, title, format, createdAt }: FailedScriptCardProps) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const busy = retrying || deleting

  const fmtDate = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/scripts/${scriptId}/retry`, { method: 'POST' })
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/scripts/${scriptId}/hide`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div
      className={`px-3 py-2.5 ${busy ? 'opacity-50 pointer-events-none' : ''}`}
      style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start gap-2.5">
        {/* Warning icon */}
        <div
          className="w-[40px] h-[50px] shrink-0 rounded flex items-center justify-center"
          style={{ background: placeholderGradient }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
            <text x="10" y="14.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">!</text>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold m-0 truncate" style={{ color: '#111827' }}>{title}</p>
          <p className="text-[11px] font-bold m-0 mt-0.5" style={{ color: '#6b7280' }}>
            {[format, fmtDate].filter(Boolean).join(' · ')}
          </p>
          <p className="text-[12px] m-0 mt-1.5" style={{ color: '#6b7280' }}>
            Sorry about that — something went wrong during evaluation.
          </p>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between mt-2" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
        <button
          onClick={handleRetry}
          disabled={busy}
          className="text-[12px] font-semibold transition-colors cursor-pointer border-0 bg-transparent p-0"
          style={{ color: '#7c3aed' }}
        >
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-[12px] font-semibold transition-colors cursor-pointer border-0 bg-transparent p-0"
          style={{ color: '#ef4444' }}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
