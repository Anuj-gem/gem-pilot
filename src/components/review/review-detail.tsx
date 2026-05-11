'use client'

// ReviewDetail — detail page for a single portfolio review.
// Matches the v3 approved mockup: numbered title, profile card,
// status block with outcome, assessment, next steps, scripts.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScriptRowCard, type ScriptRowData } from '@/components/cards/script-row-card'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { useNewUploads } from '@/hooks/use-new-uploads'

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
    key: 'in_review',
    label: 'In review',
    color: '#7c3aed',
    description: "Your portfolio is being reviewed by our team. Our partner network will be in touch if there's a good fit for you.",
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
  genre: string | null; score: number | null; evaluationId: string | null
  createdAt: string
  matchingOpportunities?: { title: string; slug: string }[]
  isProcessing?: boolean
  isLocked?: boolean
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

export function ReviewDetail({
  reviewNumber,
  isTrial = false,
  review,
  profile,
  scripts,
  attachedScriptIds = [],
  events,
}: {
  reviewNumber: number
  isTrial?: boolean
  review: {
    id: string
    reviewStage: string
    submittedAt: string
    reviewedAt: string | null
    feedback: string | null
    nextSteps: string | null
  }
  profile: {
    fullName: string | null
    handle: string | null
    bio: string | null
    avatarUrl: string | null
    headline: string | null
  }
  scripts: Script[]
  attachedScriptIds?: string[]
  events: EventRow[]
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (attachedScriptIds.length > 0) {
      // Pending review: pre-check only attached scripts
      return new Set(attachedScriptIds.filter(id => {
        const s = scripts.find(sc => sc.id === id)
        return s && !s.isLocked
      }))
    }
    // Draft: check all eligible
    return new Set(scripts.filter(s => !s.isLocked).map(s => s.id))
  })
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  // Optimistic processing cards from new uploads
  const optimistic = useNewUploads(scripts.map(s => s.id))
  // Poll when ANY script is processing — either optimistic (new upload) or server-side
  const serverProcessing = scripts.some(s => s.isProcessing)
  const hasProcessing = optimistic.length > 0 || serverProcessing

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  const currentStage = STAGES.find(s => s.key === review.reviewStage) || STAGES[0]
  const currentStageIdx = STAGES.findIndex(s => s.key === review.reviewStage)

  const isLocked = ['in_review', 'partner_match', 'complete'].includes(review.reviewStage)
  const isDraft = review.reviewStage === 'draft'
  const isPending = review.reviewStage === 'pending'
  const isComplete = review.reviewStage === 'complete'

  const profileComplete = !!(profile.fullName && profile.bio)
  const reviewScripts = scripts

  function toggleScript(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmitForReview() {
    if (submitting) return
    const selected = [...selectedIds].filter(id => {
      const s = scripts.find(sc => sc.id === id)
      return s && !s.isLocked
    })
    if (selected.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/consideration/submit-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consideration_id: review.id,
          selected_script_ids: selected,
        }),
      })
      if (res.ok) {
        // Force full re-render so status change is visible immediately
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveEdit() {
    if (submitting) return
    const selected = [...selectedIds].filter(id => {
      const s = scripts.find(sc => sc.id === id)
      return s && !s.isLocked
    })
    if (selected.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/consideration/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script_ids: selected,
          carried_ids: [],
        }),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function openUploadModal() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <>
      {isTrial && <UpgradeModalListener />}
      <ProcessingPoller active={hasProcessing} />

      {/* Back link + page title */}
      <div className="mb-1">
        <Link href="/review" className="text-[12px] font-medium text-gray-400 hover:text-gray-600">
          &larr; All reviews
        </Link>
      </div>
      <div className="mb-4">
        <h1
          className="text-[22px] font-bold text-gray-900 m-0"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Portfolio review #{reviewNumber}
        </h1>
      </div>

      {/* Profile card */}
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
          </div>
        </div>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400 w-10 shrink-0">Bio</span>
            {profile.bio ? (
              <span className="text-[12px] text-gray-600 truncate">{profile.bio.slice(0, 80)}{profile.bio.length > 80 ? '…' : ''}</span>
            ) : (
              <Link href="/profile" className="text-[12px] text-purple-500 hover:text-purple-700 no-underline">Add your bio</Link>
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
      {isComplete && (
        <>
          {/* Status block */}
          <div className="rounded-xl bg-white border border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#059669" strokeWidth="1.5" />
                <path d="M6.5 10.5l2 2 5-5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[15px] font-bold text-emerald-800 m-0">Review complete</p>
            </div>
            <p className="text-[13px] text-gray-700 m-0 mb-2.5 leading-[1.6]">
              {"Our team reviewed your portfolio and compared it against active opportunities in our network. We weren't able to match you with a partner at this time, but we see real potential in your work. Please read the assessment and next steps below — we'd welcome a resubmission."}
            </p>
            <p className="text-[12px] text-gray-400 m-0">
              Submitted {fmtDate(review.submittedAt)}
              {review.reviewedAt && ` · Reviewed ${fmtDate(review.reviewedAt)}`}
              {` · ${reviewScripts.length} ${reviewScripts.length === 1 ? 'script' : 'scripts'}`}
            </p>
          </div>

          {/* Overall assessment */}
          {review.feedback && (
            <div className="rounded-xl bg-white border border-gray-200 px-5 py-4">
              <p className="text-[12px] font-bold text-purple-600 uppercase tracking-[0.04em] m-0 mb-2">
                Overall assessment
              </p>
              <p className="text-[14px] text-gray-700 leading-[1.65] m-0 whitespace-pre-line">
                {review.feedback}
              </p>
            </div>
          )}

          {/* Suggested next steps */}
          {review.nextSteps && (
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              <div className="px-5 py-4" style={{ borderLeft: '4px solid #7c3aed' }}>
                <p className="text-[12px] font-bold text-purple-600 uppercase tracking-[0.04em] m-0 mb-2">
                  Suggested next steps
                </p>
                <p className="text-[14px] text-gray-700 leading-[1.65] m-0 whitespace-pre-line">
                  {review.nextSteps}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── IN-PROGRESS REVIEW STATUS ─────────────────── */}
      {!isComplete && (
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
                const isCurrent = s.key === review.reviewStage
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
            {events.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[12px] font-semibold text-gray-500 m-0 mb-2">Activity</p>
                <div className="space-y-2">
                  {events.map(ev => (
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
            )}
          </div>
        </div>
      )}

      {/* ── SCRIPTS IN REVIEW ─────────────────────────── */}
      <section>
        <header className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-gray-900 m-0">Scripts in this review</h2>
            {isLocked && <LockIcon className="text-gray-300" />}
          </div>
          {isDraft && (
            <button
              onClick={openUploadModal}
              className="flex items-center gap-1 text-[12px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Upload script
            </button>
          )}
          {isPending && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 transition-colors border-0 bg-transparent cursor-pointer p-0"
            >
              Edit
            </button>
          )}
        </header>

        {/* Optimistic processing cards from new uploads */}
        {optimistic.length > 0 && (
          <div className="space-y-2 mb-2">
            {optimistic.map(s => (
              <ScriptRowCard key={s.id} script={s} />
            ))}
          </div>
        )}

        {/* ── DRAFT MODE: all eligible scripts with checkboxes ── */}
        {isDraft && (() => {
          const eligibleScripts = reviewScripts.filter(s => !s.isLocked)

          return eligibleScripts.length === 0 && optimistic.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-[14px] font-semibold text-gray-600 m-0 mb-1">No scripts eligible for review</p>
              <p className="text-[13px] text-gray-400 m-0 mb-3">Upload and evaluate new scripts to include them in this review.</p>
              <button
                onClick={openUploadModal}
                className="text-[13px] font-bold text-white px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 border-0 cursor-pointer transition-colors"
              >
                Upload a script
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-gray-400 m-0 mb-1">
                Only scripts not previously included in a portfolio review are shown.
              </p>
              {eligibleScripts.map(s => (
                <ScriptRowCard
                  key={s.id}
                  script={{ id: s.id, title: s.title, format: s.format, genre: s.genre, score: s.score, evaluationId: s.evaluationId, createdAt: s.createdAt, matchingOpportunities: s.matchingOpportunities, isProcessing: s.isProcessing }}
                  checkbox={!s.isProcessing}
                  checked={selectedIds.has(s.id)}
                  onToggle={toggleScript}
                />
              ))}
            </div>
          )
        })()}

        {/* ── PENDING MODE (not editing): show only attached scripts ── */}
        {isPending && !editing && (() => {
          const attachedSet = new Set(attachedScriptIds)
          const attachedScripts = reviewScripts.filter(s => attachedSet.has(s.id))

          return attachedScripts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-[14px] font-semibold text-gray-600 m-0 mb-1">No scripts attached</p>
              <p className="text-[13px] text-gray-400 m-0">Click Edit to add scripts to this review.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachedScripts.map(s => (
                <ScriptRowCard
                  key={s.id}
                  script={{ id: s.id, title: s.title, format: s.format, genre: s.genre, score: s.score, evaluationId: s.evaluationId, createdAt: s.createdAt, matchingOpportunities: s.matchingOpportunities }}
                />
              ))}
            </div>
          )
        })()}

        {/* ── PENDING MODE (editing): attached (checked) + eligible (unchecked) ── */}
        {isPending && editing && (() => {
          const attachedSet = new Set(attachedScriptIds)
          const attachedScripts = reviewScripts.filter(s => attachedSet.has(s.id) && !s.isLocked)
          const eligibleScripts = reviewScripts.filter(s => !attachedSet.has(s.id) && !s.isLocked)
          const lockedScripts = reviewScripts.filter(s => s.isLocked)

          return (
            <>
              {/* Attached scripts — pre-checked */}
              {attachedScripts.length > 0 && (
                <div className="space-y-2">
                  {attachedScripts.map(s => (
                    <ScriptRowCard
                      key={s.id}
                      script={{ id: s.id, title: s.title, format: s.format, genre: s.genre, score: s.score, evaluationId: s.evaluationId, createdAt: s.createdAt, matchingOpportunities: s.matchingOpportunities, isProcessing: s.isProcessing }}
                      checkbox={!s.isProcessing}
                      checked={selectedIds.has(s.id)}
                      onToggle={toggleScript}
                    />
                  ))}
                </div>
              )}

              {/* Eligible scripts — not yet attached */}
              {eligibleScripts.length > 0 && (
                <div className="mt-4">
                  <p className="text-[12px] font-semibold text-gray-500 m-0 mb-2">Eligible scripts</p>
                  <div className="space-y-2">
                    {eligibleScripts.map(s => (
                      <ScriptRowCard
                        key={s.id}
                        script={{ id: s.id, title: s.title, format: s.format, genre: s.genre, score: s.score, evaluationId: s.evaluationId, createdAt: s.createdAt, matchingOpportunities: s.matchingOpportunities, isProcessing: s.isProcessing }}
                        checkbox={!s.isProcessing}
                        checked={selectedIds.has(s.id)}
                        onToggle={toggleScript}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Locked scripts (free users) */}
              {lockedScripts.length > 0 && (
                <div className="mt-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
                    <p className="text-[13px] font-semibold text-gray-500 m-0 mb-1">Ineligible for this review</p>
                    <p className="text-[12px] text-gray-400 m-0 mb-3">
                      Free accounts can include one script per portfolio review. Upgrade to Pro to include all your scripts.
                    </p>
                    <div className="space-y-2 mb-3">
                      {lockedScripts.map(s => (
                        <ScriptRowCard key={s.id} script={{ id: s.id, title: s.title, format: s.format, genre: s.genre, score: s.score, evaluationId: s.evaluationId, createdAt: s.createdAt, matchingOpportunities: s.matchingOpportunities, status: s.status, isLocked: true }} />
                      ))}
                    </div>
                    <button
                      onClick={() => window.dispatchEvent(new Event('gem:open-upgrade-modal'))}
                      className="text-[12px] font-bold text-purple-600 hover:text-purple-800 transition-colors border-0 bg-transparent cursor-pointer p-0"
                    >
                      Upgrade to Pro →
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* ── LOCKED STAGES: show only attached, no edit ── */}
        {!isDraft && !isPending && (() => {
          return reviewScripts.length === 0 ? null : (
            <div className="space-y-2">
              {reviewScripts.map(s => (
                <ScriptRowCard
                  key={s.id}
                  script={{ id: s.id, title: s.title, format: s.format, genre: s.genre, score: s.score, evaluationId: s.evaluationId, createdAt: s.createdAt, matchingOpportunities: s.matchingOpportunities, status: s.status }}
                />
              ))}
            </div>
          )
        })()}

        {/* Ineligible scripts — draft mode only */}
        {isDraft && reviewScripts.some(s => s.isLocked) && (
          <div className="mt-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
              <p className="text-[13px] font-semibold text-gray-500 m-0 mb-1">Ineligible for this review</p>
              <p className="text-[12px] text-gray-400 m-0 mb-3">
                Free accounts can include one script per portfolio review. Upgrade to Pro to include all your scripts.
              </p>
              <div className="space-y-2 mb-3">
                {reviewScripts.filter(s => s.isLocked).map(s => (
                  <ScriptRowCard key={s.id} script={{ id: s.id, title: s.title, format: s.format, genre: s.genre, score: s.score, evaluationId: s.evaluationId, createdAt: s.createdAt, matchingOpportunities: s.matchingOpportunities, status: s.status, isLocked: true }} />
                ))}
              </div>
              <button
                onClick={() => window.dispatchEvent(new Event('gem:open-upgrade-modal'))}
                className="text-[12px] font-bold text-purple-600 hover:text-purple-800 transition-colors border-0 bg-transparent cursor-pointer p-0"
              >
                Upgrade to Pro →
              </button>
            </div>
          </div>
        )}

        {/* Draft actions */}
        {isDraft && (() => {
          const selectedCount = reviewScripts.filter(s => selectedIds.has(s.id) && !s.isLocked).length
          return (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleSubmitForReview}
                disabled={submitting || selectedCount === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {submitting
                  ? 'Submitting…'
                  : `Submit ${selectedCount} ${selectedCount === 1 ? 'script' : 'scripts'} for review`}
              </button>
              <button
                onClick={openUploadModal}
                className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                + Add new script
              </button>
            </div>
          )
        })()}

        {/* Edit mode actions (pending review) */}
        {isPending && editing && (() => {
          const selectedCount = reviewScripts.filter(s => selectedIds.has(s.id) && !s.isLocked).length
          return (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleSaveEdit}
                disabled={submitting || selectedCount === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-[13px] font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving…' : `Save changes (${selectedCount} ${selectedCount === 1 ? 'script' : 'scripts'})`}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setSelectedIds(new Set(attachedScriptIds.filter(id => {
                    const s = scripts.find(sc => sc.id === id)
                    return s && !s.isLocked
                  })))
                }}
                className="flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )
        })()}
      </section>

      {/* Quiet new review note (completed only) */}
      {isComplete && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3">
          <p className="text-[13px] text-gray-500 m-0">
            When you upload new work, you can start a new portfolio review from your dashboard.
          </p>
        </div>
      )}
    </>
  )
}
