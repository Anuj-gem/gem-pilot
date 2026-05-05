'use client'

// ReviewQueueSort — client wrapper that sorts the flat review list.
// Default: oldest first (fair queue). Toggle: by score (highest first).

import { useState } from 'react'
import { ProducerReviewCard, type ReviewItem } from './review-card'

type SortMode = 'date' | 'score'

export function ReviewQueueSort({ items }: { items: ReviewItem[] }) {
  const [sort, setSort] = useState<SortMode>('date')
  const [showReviewed, setShowReviewed] = useState(false)

  const pending = items.filter(i => i.status === 'pending')
  const reviewed = items.filter(i => i.status === 'reviewed')

  const sorted = [...pending].sort((a, b) => {
    if (sort === 'score') {
      return (b.score ?? 0) - (a.score ?? 0)
    }
    // date ascending — oldest first
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  })

  return (
    <>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-gray-400 mr-1">Sort by</span>
        <button
          onClick={() => setSort('date')}
          className={`text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors ${
            sort === 'date'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Oldest first
        </button>
        <button
          onClick={() => setSort('score')}
          className={`text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors ${
            sort === 'score'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Highest score
        </button>
      </div>

      {/* Pending submissions */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center">
          <p className="text-[14px] text-gray-400 m-0">No pending reviews.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {sorted.map(item => (
            <ProducerReviewCard key={item.submissionRowId} item={item} />
          ))}
        </div>
      )}

      {/* Reviewed (collapsed by default) */}
      {reviewed.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowReviewed(!showReviewed)}
            className="text-[12px] text-gray-400 hover:text-gray-600 font-medium"
          >
            {showReviewed ? 'Hide' : 'Show'} {reviewed.length} reviewed
          </button>
          {showReviewed && (
            <div className="mt-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 opacity-75">
              {reviewed.map(item => (
                <ProducerReviewCard key={item.submissionRowId} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
