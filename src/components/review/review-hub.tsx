'use client'

// ReviewHub — the portfolio review experience.
// Profile at top, then active review status, scripts in review (one list), past reviews.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const STAGES = [
  {
    key: 'draft',
    label: 'Draft',
    color: '#6b7280',
    description: 'Your portfolio review is in draft. Add your best scripts and submit when ready.',
  },
  {
    key: 'pending',
    label: 'Pending',
    color: '#d97706',
    description: 'Your portfolio has been submitted. Our team will begin reviewing shortly.',
  },
  {
    key: 'initial_review',
    label: 'Initial review',
    color: '#7c3aed',
    description: "The GEM team is doing a detailed review of your portfolio to match it against opportunities in our network.",
  },
  {
    key: 'advanced_review',
    label: 'Advanced review',
    color: '#2563eb',
    description: "Your work stood out. We're reviewing alongside our partners to find the right fit.",
  },
  {
    key: 'partner_match',
    label: 'Partner match',
    color: '#059669',
    description: "We've identified a partner match. Details incoming.",
  },
  {
    key: 'complete',
    label: 'Complete',
    color: '#16a34a',
    description: 'Your review is complete. Check your feedback below.',
  },
] as const

type EventRow = { id: string; event_type: string; message: string | null; new_stage: string | null; created_at: string }

type Script = {
  id: string; title: string; format: string | null
  score: number | null; evaluationId: string | null
  headline: string | null; tags: string[]
  createdAt: string; inReview: boolean
}

type PastReview = {
  id: string; review_stage: string; submitted_at: string; reviewed_at: string | null
  feedback: string | null; next_steps: string | null; scriptCount: number
  events: EventRow[]
}

// Lock icon
function LockIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Three-dot menu
function ScriptMenu({ scriptId, onRemove }: { scriptId: string; onRemove: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3.5" r="1" fill="#9ca3af" />
          <circle cx="8" cy="8" r="1" fill="#9ca3af" />
          <circle cx="8" cy="12.5" r="1" fill="#9ca3af" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(scriptId); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
          >
            Remove from review
          </button>
        </div>
      )}
    </div>
  )
}

// Genre tags to display (first 3 meaningful ones)
function getDisplayTags(tags: string[]): string[] {
  const skip = new Set(['male-lead', 'female-lead', 'ensemble', 'contemporary', 'period', 'feature-anchored', 'series-anchored'])
  return tags.filter(t => !skip.has(t)).slice(0, 3)
}

export function ReviewHub({
  profile,
  isPro,
  scripts,
  activeReview,
  pastReviews,
}: {
  profile: {
    fullName: string | null
    handle: string | null
    bio: string | null
    avatarUrl: string | null
    headline: string | null
  }
  isPro: boolean
  scripts: Script[]
  activeReview: {
    id: string; reviewStage: string; submittedAt: string
    feedback: string | null; nextSteps: string | null
    events: EventRow[]
  } | null
  pastReviews: PastReview[]
}) {
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  const currentStage = activeReview
    ? STAGES.find(s => s.key === activeReview.reviewStage) || STAGES[0]
    : null
  const currentStageIdx = activeReview
    ? STAGES.findIndex(s => s.key === activeReview.reviewStage)
    : -1

  // Locked = initial_review or beyond
  const isLocked = activeReview
    ? ['initial_review', 'advanced_review', 'partner_match', 'complete'].includes(activeReview.reviewStage)
    : false

  const isDraft = activeReview?.reviewStage === 'draft'

  const profileComplete = !!(profile.fullName && profile.bio)

  const reviewScripts = scripts.filter(s => s.inReview && !removedIds.has(s.id))

  async function handleRemoveScript(scriptId: string) {
    // Optimistic removal
    setRemovedIds(prev => new Set([...prev, scriptId]))
    // TODO: API call to remove from consideration_scripts
  }

  return (
    <>
      {/* Page header */}
      <div>
        <h1
          className="text-[22px] font-bold text-gray-900 m-0 mb-1"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Portfolio review
        </h1>
        <p className="text-[13px] text-gray-400 m-0">
          Submit your best work. Our team reviews every portfolio personally.
        </p>
      </div>

      {/* ── PROFILE CARD (always at top) ──────────────── */}
      <div className="rounded-xl bg-white border border-gray-200 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-gray-500 m-0">Your profile</p>
          <Link href="/profile" className="text-[12px] font-medium text-purple-600 hover:text-purple-800">
            Edit profile
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-3">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100 shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gray-100 border-[1.5px] border-dashed border-gray-300 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-gray-900 m-0 truncate">
              {profile.fullName || 'Your name'}
            </p>
            {profile.handle && (
              <p className="text-[12px] text-gray-400 m-0 mt-0.5">@{profile.handle}</p>
            )}
          </div>
        </div>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400 w-10 shrink-0">Bio</span>
            {profile.bio ? (
              <span className="text-[12px] text-gray-600 truncate">{profile.bio.slice(0, 80)}{profile.bio.length > 80 ? '…' : ''}</span>
            ) : (
              <span className="text-[12px] text-gray-300 italic">[no bio]</span>
            )}
          </div>
        </div>
        {!profileComplete && (
          <p className="text-[12px] text-gray-500 m-0 leading-snug">
            A complete profile helps our team make better decisions. Add your bio and credits so reviewers see the full picture.
          </p>
        )}
      </div>

      {/* ── COMPLETED REVIEW ─────────────────────────── */}
      {activeReview && activeReview.reviewStage === 'complete' && (
        <>
          {/* Prominent completion banner */}
          <div className="rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#059669" strokeWidth="1.5" />
                <path d="M6.5 10.5l2 2 5-5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[15px] font-bold text-emerald-800 m-0">Review complete</p>
            </div>
            <p className="text-[13px] text-emerald-700 m-0 leading-snug">
              Your portfolio review is finished. See the feedback and suggested next steps below.
            </p>
          </div>

          {/* Overall assessment */}
          {activeReview.feedback && (
            <div className="rounded-xl bg-white border border-gray-200 px-5 py-4">
              <p className="text-[12px] font-bold text-purple-600 uppercase tracking-[0.04em] m-0 mb-2">
                Overall assessment
              </p>
              <p className="text-[13.5px] text-gray-700 leading-[1.6] m-0 whitespace-pre-line">
                {activeReview.feedback}
              </p>
            </div>
          )}

          {/* Suggested next steps — distinct card */}
          {activeReview.nextSteps && (
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              <div className="px-5 py-4" style={{ borderLeft: '4px solid #7c3aed' }}>
                <p className="text-[12px] font-bold text-purple-600 uppercase tracking-[0.04em] m-0 mb-2">
                  Suggested next steps
                </p>
                <p className="text-[13.5px] text-gray-700 leading-[1.6] m-0 whitespace-pre-line">
                  {activeReview.nextSteps}
                </p>
              </div>
            </div>
          )}

          {/* New review note */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3">
            <p className="text-[13px] text-gray-500 m-0">
              When you upload new work, you can{' '}
              <Link href="/submit" className="text-purple-600 hover:text-purple-800 font-medium">
                start a new review
              </Link>.
            </p>
          </div>

          {/* Activity timeline — status changes only */}
          {(() => {
            const statusEvents = activeReview.events.filter(ev => ev.event_type === 'status_change')
            if (statusEvents.length === 0) return null
            return (
              <div className="rounded-xl bg-white border border-gray-200 px-5 py-4">
                <p className="text-[12px] font-semibold text-gray-500 m-0 mb-2">Activity</p>
                <div className="space-y-2">
                  {statusEvents.map(ev => (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full" style={{ background: '#7c3aed' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-gray-600 m-0 leading-snug">
                          {ev.message || 'Status updated'}
                        </p>
                        <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                          {fmtDateTime(ev.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ── IN-PROGRESS REVIEW STATUS ─────────────────── */}
      {activeReview && currentStage && activeReview.reviewStage !== 'complete' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4">

            {/* Stage badge + lock */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: `${currentStage.color}15`,
                  color: currentStage.color,
                }}
              >
                {currentStage.label}
              </span>
              {isLocked && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <LockIcon className="text-gray-400" />
                  Locked
                </span>
              )}
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-0.5 mb-4">
              {STAGES.filter(s => s.key !== 'complete').map((s, i) => {
                const filled = i <= currentStageIdx
                const isCurrent = s.key === activeReview.reviewStage
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className="w-full h-[3px] rounded-full transition-colors"
                      style={{
                        background: filled ? currentStage.color : '#e5e7eb',
                      }}
                    />
                    <span
                      className="text-[10px] leading-none transition-colors"
                      style={{
                        color: isCurrent ? currentStage.color : filled ? '#6b7280' : '#d1d5db',
                        fontWeight: isCurrent ? 700 : 500,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Stage description */}
            <p className="text-[13px] text-gray-500 m-0 mb-4 leading-snug">
              {currentStage.description}
            </p>

            {/* Event timeline */}
            {activeReview.events.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[12px] font-semibold text-gray-500 m-0 mb-2">Activity</p>
                <div className="space-y-2">
                  {activeReview.events.map(ev => (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <div
                        className="shrink-0 mt-1.5 w-2 h-2 rounded-full"
                        style={{
                          background: ev.event_type === 'status_change' ? '#7c3aed'
                            : ev.event_type === 'feedback' ? '#059669'
                            : '#6b7280',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-gray-600 m-0 leading-snug">
                          {ev.event_type === 'feedback'
                            ? 'Feedback received from GEM'
                            : ev.message || 'Status updated'}
                        </p>
                        <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                          {fmtDateTime(ev.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NO ACTIVE REVIEW CTA ──────────────────────── */}
      {!activeReview && (
        <div className="rounded-xl bg-purple-50 border border-purple-200 px-5 py-5 text-center">
          <p className="text-[15px] font-bold text-gray-900 m-0 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Ready for your next review?
          </p>
          <p className="text-[13px] text-gray-500 m-0 mb-4">
            Select your best scripts and submit for a personal portfolio review.
          </p>
          <Link
            href="/consideration/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors"
          >
            Submit for review
          </Link>
        </div>
      )}

      {/* ── SCRIPTS IN REVIEW (single unified list) ───── */}
      {activeReview && (
        <section>
          <header className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-gray-900 m-0">Scripts in this review</h2>
              {isLocked ? (
                <LockIcon className="text-gray-300" />
              ) : (
                <Link
                  href="/consideration/submit"
                  className="text-[12px] font-semibold text-purple-600 hover:text-purple-800"
                >
                  Edit
                </Link>
              )}
            </div>
            <Link
              href="/submit"
              className="flex items-center gap-1 text-[12px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Upload script
            </Link>
          </header>

          {reviewScripts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-[13px] text-gray-400 m-0 mb-3">No scripts in this review yet.</p>
              {isDraft && (
                <Link
                  href="/consideration/submit"
                  className="text-[13px] font-bold text-purple-600 hover:text-purple-800"
                >
                  Add scripts to your portfolio
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {reviewScripts.map(s => (
                <div key={s.id} className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[14px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>
                          {s.title}
                        </p>
                        {s.format && (
                          <span className="text-[12px] text-gray-400 shrink-0">{s.format}</span>
                        )}
                      </div>

                      {/* Headline */}
                      {s.headline && (
                        <p className="text-[12px] text-gray-500 m-0 mt-1 leading-snug line-clamp-2">
                          {s.headline}
                        </p>
                      )}

                      {/* Tags */}
                      {s.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {getDisplayTags(s.tags).map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded"
                            >
                              {tag.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right side: score + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {s.score != null && (
                        <div className="text-right">
                          <span className="text-[12px] font-bold" style={{ color: s.score >= 75 ? '#7c3aed' : '#6b7280' }}>
                            {Math.round(s.score)}
                          </span>
                          <span className="text-[10px] text-gray-300 ml-0.5">/100</span>
                        </div>
                      )}
                      {s.evaluationId && (
                        <Link
                          href={`/report/${s.evaluationId}`}
                          className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 whitespace-nowrap"
                        >
                          View report
                        </Link>
                      )}
                      {isDraft && (
                        <ScriptMenu scriptId={s.id} onRemove={handleRemoveScript} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Draft actions */}
          {isDraft && (
            <div className="flex items-center gap-3 mt-3">
              <Link
                href="/consideration/submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors"
              >
                Submit for review
              </Link>
              <Link
                href="/submit"
                className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                + Add new script
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── PAST REVIEWS ──────────────────────────────── */}
      {pastReviews.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold text-gray-900 m-0 mb-2.5">Past reviews</h2>
          <div className="space-y-3">
            {pastReviews.map(pr => (
              <PastReviewCard key={pr.id} review={pr} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function PastReviewCard({ review }: { review: PastReview }) {
  const [expanded, setExpanded] = useState(false)
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-[14px] font-bold text-gray-900 m-0">Portfolio review</p>
          <p className="text-[12px] text-gray-400 m-0 mt-0.5">
            Submitted {fmtDate(review.submitted_at)}
            {review.reviewed_at && ` · Reviewed ${fmtDate(review.reviewed_at)}`}
            {` · ${review.scriptCount} ${review.scriptCount === 1 ? 'script' : 'scripts'}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
            Complete
          </span>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-3">
          {review.feedback && (
            <p className="text-[13.5px] text-gray-700 leading-[1.6] m-0 mb-3 whitespace-pre-line">
              {review.feedback}
            </p>
          )}
          {review.next_steps && (
            <div className="pl-3 py-2.5 pr-3 rounded-r-lg mb-3" style={{
              background: '#f5f3ff',
              borderLeft: '3px solid #7c3aed',
            }}>
              <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-purple-600 m-0 mb-1">
                Suggested next steps
              </p>
              <p className="text-[13px] text-purple-900 leading-[1.5] m-0">
                {review.next_steps}
              </p>
            </div>
          )}
          {review.events.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[12px] font-semibold text-gray-400 m-0 mb-2">Activity</p>
              <div className="space-y-1.5">
                {review.events.slice(0, 5).map(ev => (
                  <div key={ev.id} className="flex items-center gap-2">
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span className="text-[12px] text-gray-500">{ev.message || 'Status updated'}</span>
                    <span className="text-[11px] text-gray-300 shrink-0">
                      {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
