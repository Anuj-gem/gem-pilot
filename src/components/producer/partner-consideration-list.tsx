'use client'

// PartnerConsiderationList — client wrapper for the producer consideration page.
// Handles: collapsible sections, sort controls, passes enriched data to cards.

import { useState, useMemo } from 'react'
import { ConsiderationReviewCard } from './consideration-review-card'

type Script = { title: string; score: number | null; evaluationId: string | null; format: string | null }
type Event = { id: string; event_type: string; message: string | null; new_stage: string | null; created_at: string }
type PastReview = { id: string; submittedAt: string; feedback: string | null; nextSteps: string | null }

export type ConsiderationItem = {
  id: string
  writerId: string
  writerName: string
  writerHandle: string | null
  isPro: boolean
  submittedAt: string
  scripts: Script[]
  status: string
  reviewStage: string
  feedback: string | null
  nextSteps: string | null
  aiFeedback: string | null
  aiNextSteps: string | null
  events: Event[]
  reviewNumber: number
  pastReviews: PastReview[]
  avgScore: number | null
}

type SortKey = 'date' | 'score' | 'review_num'
type SortDir = 'asc' | 'desc'

export function PartnerConsiderationList({ items }: { items: ConsiderationItem[] }) {
  const [pendingOpen, setPendingOpen] = useState(true)
  const [reviewedOpen, setReviewedOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const pending = useMemo(() => items.filter(c => c.reviewStage !== 'complete'), [items])
  const reviewed = useMemo(() => items.filter(c => c.reviewStage === 'complete'), [items])

  function handleSortClick(key: SortKey) {
    if (sortBy === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  function sortItems(list: ConsiderationItem[]): ConsiderationItem[] {
    const sorted = [...list]
    const dir = sortDir === 'desc' ? 1 : -1
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => dir * (new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()))
        break
      case 'score':
        sorted.sort((a, b) => dir * ((b.avgScore ?? 0) - (a.avgScore ?? 0)))
        break
      case 'review_num':
        sorted.sort((a, b) => dir * (b.reviewNumber - a.reviewNumber))
        break
    }
    return sorted
  }

  const sortedPending = useMemo(() => sortItems(pending), [pending, sortBy, sortDir])
  const sortedReviewed = useMemo(() => sortItems(reviewed), [reviewed, sortBy, sortDir])

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'score', label: 'Avg score' },
    { key: 'review_num', label: 'Review #' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
              Writers in consideration
            </h1>
            <p className="text-[13px] text-gray-400 mt-1 m-0">
              {pending.length} active · {reviewed.length} complete
            </p>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[11px] text-gray-400 font-medium mr-1">Sort:</span>
          {sortOptions.map(opt => {
            const active = sortBy === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => handleSortClick(opt.key)}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors inline-flex items-center gap-0.5"
                style={{
                  background: active ? '#7c3aed15' : 'transparent',
                  borderColor: active ? '#7c3aed' : '#e5e7eb',
                  color: active ? '#7c3aed' : '#9ca3af',
                }}
              >
                {opt.label}
                {active && (
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className={`transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Active section — collapsible */}
      <SectionHeader
        title={`Active (${pending.length})`}
        open={pendingOpen}
        onToggle={() => setPendingOpen(!pendingOpen)}
      />
      {pendingOpen && (
        sortedPending.length === 0 ? (
          <div className="rounded-b-xl border border-t-0 border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-[13.5px] text-gray-400 m-0">No writers pending review.</p>
          </div>
        ) : (
          <div className="rounded-b-xl bg-white border border-t-0 border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {sortedPending.map(c => (
              <ConsiderationReviewCard
                key={c.id}
                considerationId={c.id}
                writerName={c.writerName}
                writerHandle={c.writerHandle}
                isPro={c.isPro}
                submittedAt={c.submittedAt}
                scripts={c.scripts}
                status={c.status}
                reviewStage={c.reviewStage}
                feedback={c.feedback}
                nextSteps={c.nextSteps}
                aiFeedback={c.aiFeedback}
                aiNextSteps={c.aiNextSteps}
                events={c.events}
                reviewNumber={c.reviewNumber}
                pastReviews={c.pastReviews}
              />
            ))}
          </div>
        )
      )}

      {/* Completed section — collapsible, collapsed by default */}
      {reviewed.length > 0 && (
        <div className="mt-4">
          <SectionHeader
            title={`Complete (${reviewed.length})`}
            open={reviewedOpen}
            onToggle={() => setReviewedOpen(!reviewedOpen)}
          />
          {reviewedOpen && (
            <div className="rounded-b-xl bg-white border border-t-0 border-gray-200 divide-y divide-gray-100 overflow-hidden opacity-75">
              {sortedReviewed.map(c => (
                <ConsiderationReviewCard
                  key={c.id}
                  considerationId={c.id}
                  writerName={c.writerName}
                  writerHandle={c.writerHandle}
                  isPro={c.isPro}
                  submittedAt={c.submittedAt}
                  scripts={c.scripts}
                  status={c.status}
                  reviewStage={c.reviewStage}
                  feedback={c.feedback}
                  nextSteps={c.nextSteps}
                  aiFeedback={c.aiFeedback}
                  aiNextSteps={c.aiNextSteps}
                  events={c.events}
                  reviewNumber={c.reviewNumber}
                  pastReviews={c.pastReviews}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl text-left hover:bg-gray-100 transition-colors"
      style={{ borderBottomLeftRadius: open ? 0 : '0.75rem', borderBottomRightRadius: open ? 0 : '0.75rem' }}
    >
      <span className="text-[13px] font-bold text-gray-600">{title}</span>
      <svg
        width="14" height="14" viewBox="0 0 16 16" fill="none"
        className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}
