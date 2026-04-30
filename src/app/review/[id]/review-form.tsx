'use client'

// ReviewForm — three-field peer Review composer.
// Used on /review/[id]. Submits via the submitReview server action which
// inserts (or updates) one row in public.peer_reviews.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitReview, deleteReview } from './actions'

interface ExistingReview {
  id: string
  score: number
  body: string
  suggestion: string | null
  created_at: string
  updated_at: string
}

interface Props {
  submissionId: string
  existing: ExistingReview | null
  reviewerName: string
}

export function ReviewForm({ submissionId, existing, reviewerName }: Props) {
  const router = useRouter()
  const [score, setScore] = useState<number>(existing?.score ?? 75)
  const [body, setBody] = useState<string>(existing?.body ?? '')
  const [suggestion, setSuggestion] = useState<string>(existing?.suggestion ?? '')
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const isEdit = !!existing

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!body.trim()) {
      setErr('Add a few sentences in the Review field.')
      return
    }
    startTransition(async () => {
      const res = await submitReview({
        submissionId,
        score: Math.round(score),
        body: body.trim(),
        suggestion: suggestion.trim() || null,
      })
      if (res.error) {
        setErr(res.error)
        return
      }
      setSavedAt(new Date().toLocaleTimeString())
      router.refresh()
    })
  }

  function handleDelete() {
    if (!existing) return
    if (!confirm('Delete this review?')) return
    startTransition(async () => {
      const res = await deleteReview({ reviewId: existing.id })
      if (res.error) {
        setErr(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1">
          Your review
        </p>
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Update your review' : 'Write a review'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Reviewing as <span className="font-semibold text-gray-700">{reviewerName}</span>.
          Your name and review will be visible on the script's report and on your
          reviewer profile.
        </p>
      </div>

      {/* Score */}
      <div className="mb-6">
        <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
          Score
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="flex-1 accent-purple-600"
          />
          <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-purple-50 border border-purple-200" style={{ minWidth: 64, padding: '6px 10px' }}>
            <span className="text-[9px] uppercase tracking-[0.14em] font-bold text-purple-700">Score</span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none mt-1">{score}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mb-5">
        <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
          Review
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Your honest take. What works, what doesn't, what stuck with you. Be specific."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] leading-relaxed text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Suggestion for next draft */}
      <div className="mb-6">
        <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
          Suggestion for next draft <span className="font-normal normal-case text-gray-400">(optional)</span>
        </label>
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          rows={3}
          placeholder="One concrete change you'd push for in the next draft."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] leading-relaxed text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : isEdit ? 'Update review' : 'Publish review'}
        </button>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          {savedAt && <span>Saved {savedAt}</span>}
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="text-red-600 hover:text-red-800 font-semibold"
            >
              Delete review
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
