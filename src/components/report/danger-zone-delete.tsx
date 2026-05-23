'use client'

// Danger zone at the bottom of the report page. Red-accented "Delete
// this script permanently" with a confirm sheet. Keeps destructive
// actions visually separated and deprioritized.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'

interface Props {
  submissionId: string
}

export function DangerZoneDelete({ submissionId }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/hide`, {
        method: 'POST',
      })
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
        return
      }
    } catch {
      /* fall through */
    } finally {
      setRemoving(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div className="gem-no-print mt-16 mb-8 rounded-xl border border-red-500/20 px-6 py-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-red-400">
            Danger Zone
          </span>
        </div>
        <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-4 leading-relaxed">
          Permanently remove this script from your account. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-400/50 transition-colors"
        >
          <Trash2 size={14} />
          Delete this script
        </button>
      </div>

      <PrivacyConfirmSheet
        open={confirmOpen}
        title="Remove this script?"
        body="It will be hidden from your dashboard and from any industry partners who matched it. You can&rsquo;t undo this."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        tone="danger"
        busy={removing}
        onConfirm={handleRemove}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}
