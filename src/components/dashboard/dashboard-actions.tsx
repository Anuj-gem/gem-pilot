'use client'

// DashboardActions — persistent "New script" + "New portfolio review" row.
// Always visible. Disabled states with explanation when ineligible.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Sparkles } from 'lucide-react'

export function DashboardActions() {
  const router = useRouter()
  const [creatingReview, setCreatingReview] = useState(false)

  function openUploadModal() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  async function handleNewReview() {
    if (creatingReview) return
    setCreatingReview(true)
    try {
      const res = await fetch('/api/consideration/create-draft', { method: 'POST' })
      const data = await res.json()
      if (data.consideration_id) {
        router.push(`/review/c/${data.consideration_id}`)
      } else {
        setCreatingReview(false)
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

      {/* New portfolio review — always active */}
      <button
        onClick={handleNewReview}
        disabled={creatingReview}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white cursor-pointer hover:opacity-90 transition-colors"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
      >
        <Sparkles size={15} className="text-white/80" />
        {creatingReview ? 'Creating…' : 'New portfolio review'}
      </button>
    </div>
  )
}
