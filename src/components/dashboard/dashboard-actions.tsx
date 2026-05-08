'use client'

// DashboardActions — persistent "New script" + "New portfolio review" row.
// Always visible. Disabled states with explanation when ineligible.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Sparkles } from 'lucide-react'

export function DashboardActions({
  canRequestReview,
  disabledReason,
}: {
  canRequestReview: boolean
  disabledReason: string | null // e.g. "Submit a new script first" or "Review in progress"
}) {
  const router = useRouter()
  const [creatingReview, setCreatingReview] = useState(false)

  function openUploadModal() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  async function handleNewReview() {
    if (!canRequestReview || creatingReview) return
    setCreatingReview(true)
    try {
      const res = await fetch('/api/consideration/create-draft', { method: 'POST' })
      const data = await res.json()
      if (data.consideration_id) {
        router.push(`/review/c/${data.consideration_id}`)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setCreatingReview(false)
    }
  }

  return (
    <div className="flex items-stretch gap-2.5">
      {/* New script — always active */}
      <button
        onClick={openUploadModal}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
      >
        <FileText size={15} className="text-gray-400" />
        New script
      </button>

      {/* New portfolio review — disabled when ineligible */}
      <button
        onClick={handleNewReview}
        disabled={!canRequestReview || creatingReview}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl text-[13px] font-bold transition-colors ${
          canRequestReview
            ? 'text-white cursor-pointer hover:opacity-90'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
        style={canRequestReview ? { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' } : undefined}
      >
        <span className="flex items-center gap-2">
          <Sparkles size={15} className={canRequestReview ? 'text-white/80' : 'text-gray-300'} />
          {creatingReview ? 'Creating…' : 'New portfolio review'}
        </span>
        {!canRequestReview && disabledReason && (
          <span className="text-[11px] font-normal text-gray-400">{disabledReason}</span>
        )}
      </button>
    </div>
  )
}
