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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 m-0 mb-2">Write a response</p>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Share your thoughts, questions, or next steps..."
        className="w-full rounded-xl bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-purple-200"
        style={{ border: '1.5px solid #e5e7eb' }}
        rows={3}
      />
      <button
        onClick={handleSubmit}
        disabled={submitting || !reply.trim()}
        className="mt-2 inline-flex items-center text-[13px] font-bold text-white disabled:opacity-50 px-4 py-2 rounded-lg transition-all hover:brightness-110"
        style={{ background: '#7c3aed' }}
      >
        {submitting ? 'Sending...' : 'Send response'}
      </button>
    </section>
  )
}
