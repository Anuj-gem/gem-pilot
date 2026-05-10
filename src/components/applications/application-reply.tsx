'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ApplicationReply({ applicationId }: { applicationId: string }) {
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!reply.trim()) return
    setSubmitting(true)

    const res = await fetch('/api/consideration/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consideration_id: applicationId,
        writer_response: reply.trim(),
      }),
    })

    if (res.ok) {
      router.refresh()
    }
    setSubmitting(false)
  }

  return (
    <section>
      <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1.5">Reply to feedback</h2>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Let us know your thoughts, questions, or next steps..."
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
        rows={3}
      />
      <button
        onClick={handleSubmit}
        disabled={submitting || !reply.trim()}
        className="mt-2 inline-flex items-center text-[13px] font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
      >
        {submitting ? 'Sending...' : 'Send reply'}
      </button>
    </section>
  )
}
