'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function WithdrawButton({ submissionRowId }: { submissionRowId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  async function handleWithdraw() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    const { error } = await supabase
      .from('opportunity_submissions')
      .delete()
      .eq('id', submissionRowId)
    if (!error) {
      router.refresh()
    }
    setLoading(false)
    setConfirming(false)
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={handleWithdraw}
          disabled={loading}
          className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={handleWithdraw}
      className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
    >
      Withdraw
    </button>
  )
}
