'use client'

// Replaces the old "Revise" button on dashboard rows. Remove is a soft-hide:
// the submission and evaluation stay in the database, but the card disappears
// from the writer's dashboard and (if it was public) from Discover. Writers
// who want the script back have to reach out — there's no restore UI.
//
// Free-eval gating is unaffected: a hidden script still counts toward the
// one-free rule, so free users can't hide-and-resubmit for another free eval.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

interface Props {
  submissionId: string
  title: string
}

export function RemoveButton({ submissionId, title }: Props) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  async function onClick() {
    const ok = confirm(
      `Remove "${title}" from your dashboard?\n\n` +
        `This also removes it from Discover if it's live there. ` +
        `The evaluation itself is preserved — if you need it back later, ` +
        `reach out and we can restore it. It still counts as your free evaluation.`
    )
    if (!ok) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/hide`, {
        method: 'POST',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json?.error ?? `Failed to remove (${res.status}).`)
        setRemoving(false)
        return
      }
      router.refresh()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to remove.')
      setRemoving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={removing}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-red-400 hover:border-red-400/60 disabled:opacity-50 transition-colors"
      title={`Remove "${title}" from your dashboard`}
    >
      {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      Remove
    </button>
  )
}
