// ReviewModeBanner — top-of-report bar in reviewer mode.
// Shows opportunity title, annotation count, and "Complete review" button
// that opens the closing comment prompt.

'use client'

import { useState } from 'react'
import { useAnnotations } from './annotation-layer'
import { useRouter } from 'next/navigation'

interface ReviewModeBannerProps {
  submissionRowId: string
  opportunityTitle: string
  existingFeedback: string | null
}

export function ReviewModeBanner({ submissionRowId, opportunityTitle, existingFeedback }: ReviewModeBannerProps) {
  const { annotations } = useAnnotations()
  const [showComplete, setShowComplete] = useState(false)
  const [closingComment, setClosingComment] = useState(existingFeedback ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleComplete() {
    if (!closingComment.trim()) return
    setSaving(true)
    const res = await fetch('/api/opportunities/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: submissionRowId,
        status: 'reviewed',
        feedback: closingComment.trim(),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setDone(true)
      setTimeout(() => router.push('/producer/opportunities'), 1500)
    }
  }

  if (done) {
    return (
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
        <p className="text-[14px] font-semibold text-emerald-700 m-0">Review complete. Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-purple-400 m-0">
            Reviewing submission for
          </p>
          <p className="text-[15px] font-semibold text-purple-900 m-0 mt-0.5">
            {opportunityTitle}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[12px] text-purple-400">
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowComplete(!showComplete)}
            className="text-[13px] font-semibold text-white px-4 py-2 rounded-lg transition-colors"
            style={{ background: '#534AB7' }}
          >
            {showComplete ? 'Hide' : 'Complete review'}
          </button>
        </div>
      </div>

      {showComplete && (
        <div className="px-5 py-4 border-t border-purple-200 bg-white">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-[0.06em] m-0 mb-2">
            What we&apos;re looking for next
          </p>
          <p className="text-[12px] text-gray-400 m-0 mb-3">
            Required. What would make this resubmittable, or let them know honestly if this isn&apos;t the right fit.
          </p>
          <textarea
            value={closingComment}
            onChange={e => setClosingComment(e.target.value)}
            placeholder="e.g., Fix the Act 2 pacing and resubmit — the voice is there..."
            rows={4}
            className="w-full text-[13px] text-gray-700 leading-[1.55] border border-gray-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleComplete}
              disabled={saving || !closingComment.trim()}
              className="text-[13px] font-semibold text-white px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: '#534AB7' }}
            >
              {saving ? 'Sending...' : 'Send review'}
            </button>
            {!closingComment.trim() && (
              <span className="text-[12px] text-amber-600">A closing comment is required</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
