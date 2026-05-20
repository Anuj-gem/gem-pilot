'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AppData {
  id: string
  status: string
  review_stage: string
  submitted_at: string
  reviewed_at: string | null
  feedback: string | null
  feedback_tags: string[] | null
  next_steps_tags: string[] | null
  opportunity_id: string
  writer_pitch: string | null
  heat_earned: number
}

interface OppInfo {
  title: string
  slug: string
  isActive: boolean
}

interface ScriptInfo {
  title: string
  score: number | null
}

interface ApplicationsListProps {
  apps: AppData[]
  oppMap: Record<string, OppInfo>
  scriptsByApp: Record<string, ScriptInfo[]>
  stagesByApp: Record<string, string[]>
  totalHeat: number
  matchingScriptCounts?: Record<string, number>
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const TRACKER_STAGES = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_consideration', label: 'In consideration' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'partner_match', label: 'Partner match' },
]

function StageTracker({ reachedStages, isReviewed }: { reachedStages: Set<string>; isReviewed: boolean }) {
  return (
    <div className="flex items-start">
      {TRACKER_STAGES.map((s, i) => {
        const reached = reachedStages.has(s.key)
        const isSkipped = isReviewed && !reached

        let circle
        if (reached) {
          circle = (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#7c3aed' }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )
        } else if (isSkipped) {
          circle = (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#f3f4f6', border: '2px solid #d1d5db' }}>
              <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )
        } else {
          circle = (
            <div className="w-6 h-6 rounded-full" style={{ background: '#f3f4f6', border: '2px solid #d1d5db' }} />
          )
        }

        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-initial" style={i === TRACKER_STAGES.length - 1 ? { flex: '0 0 auto' } : undefined}>
            <div className="flex flex-col items-center" style={{ minWidth: 24 }}>
              {circle}
              <span
                className="text-[9px] mt-1 text-center whitespace-nowrap"
                style={{
                  color: reached ? '#7c3aed' : '#9ca3af',
                  fontWeight: reached ? 600 : 500,
                }}
              >
                {s.label}
              </span>
            </div>
            {i < TRACKER_STAGES.length - 1 && (
              <div
                className="h-0.5 flex-1 mx-0.5"
                style={{
                  background: reached && reachedStages.has(TRACKER_STAGES[i + 1]?.key) ? '#7c3aed' : '#e5e7eb',
                  marginTop: -10,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ApplicationsList({ apps, oppMap, scriptsByApp, stagesByApp, totalHeat, matchingScriptCounts }: ApplicationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {apps.map(app => {
        const opp = oppMap[app.opportunity_id]
        const scripts = scriptsByApp[app.id] || []
        const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
        const isExpanded = expandedId === app.id

        // Build reachedStages set from server data
        const reachedArr = stagesByApp[app.id] || ['pending']
        const reachedStages = new Set(reachedArr)

        // Status badge — "Pass" in amber for completed reviews, stage-colored for in-progress
        const stageMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
          in_consideration: { label: 'In consideration', bg: '#ede9fe', color: '#5b21b6' },
          shortlisted: { label: 'Shortlisted', bg: '#dbeafe', color: '#1e40af' },
          partner_match: { label: 'Partner match', bg: '#d1fae5', color: '#065f46' },
          complete: { label: 'Pass', bg: '#fef3c7', color: '#92400e' },
        }
        const stage = isReviewed ? 'complete' : (app.review_stage || 'pending')
        const s = stageMap[stage] || stageMap.pending

        const matchCount = matchingScriptCounts?.[app.opportunity_id] ?? 0
        const canReapply = opp?.isActive

        return (
          <div key={app.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Card header — click to expand */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : app.id)}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
                      {opp?.title || 'Opportunity'}
                    </p>
                    <span
                      className="text-[12px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {scripts.map((sc, i) => (
                      <span key={i} className="text-[12px] text-gray-500">
                        {sc.title}
                        {sc.score && <span className="text-[11px] font-semibold text-gray-400 ml-1">({Math.round(sc.score)})</span>}
                      </span>
                    ))}
                    <span className="text-[11px] text-gray-300">&middot;</span>
                    <span className="text-[11px] text-gray-400">{fmtDate(app.submitted_at)}</span>
                  </div>
                  {/* Collapsed state: show positive tags + heat */}
                  {!isExpanded && isReviewed && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {app.feedback_tags && app.feedback_tags.length > 0 && app.feedback_tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#ede9fe', color: '#7c3aed' }}
                        >
                          {tag}
                        </span>
                      ))}
                      {app.feedback_tags && app.feedback_tags.length > 3 && (
                        <span className="text-[11px] text-gray-400">+{app.feedback_tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isReviewed && app.heat_earned > 0 && (
                    <span className="text-[14px] font-bold" style={{ color: '#ea580c' }}>🔥 +{app.heat_earned}</span>
                  )}
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                {isReviewed ? (
                  <>
                    {/* Stage progression tracker */}
                    <div className="pb-3 border-b border-gray-100">
                      <StageTracker reachedStages={reachedStages} isReviewed={isReviewed} />
                    </div>

                    {/* Positive tags — what stood out */}
                    {app.feedback_tags && app.feedback_tags.length > 0 && (
                      <div>
                        <p className="text-[12px] font-semibold text-gray-500 m-0 mb-1.5">What stood out</p>
                        <div className="flex flex-wrap gap-1.5">
                          {app.feedback_tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pass reason tags */}
                    {app.next_steps_tags && app.next_steps_tags.length > 0 && (
                      <div>
                        <p className="text-[12px] font-semibold text-gray-500 m-0 mb-1.5">Why passing</p>
                        <div className="flex flex-wrap gap-1.5">
                          {app.next_steps_tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback note */}
                    {app.feedback && (
                      <div>
                        <p className="text-[12px] font-semibold text-gray-500 m-0 mb-1">Note</p>
                        <p className="text-[13px] text-gray-600 m-0 leading-relaxed">{app.feedback}</p>
                      </div>
                    )}

                    {/* Heat earned */}
                    {app.heat_earned > 0 ? (
                      <div className="rounded-lg px-3 py-2.5" style={{ background: '#fff7ed' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[16px] font-bold" style={{ color: '#ea580c' }}>🔥 +{app.heat_earned} heat earned</span>
                        </div>
                        <p className="text-[11px] text-gray-400 m-0 mt-1">
                          {[
                            app.feedback_tags && app.feedback_tags.length > 0 ? '+1 positive signals' : null,
                            reachedStages.has('shortlisted') ? '+2 shortlisted' : null,
                            reachedStages.has('partner_match') ? '+3 partner match' : null,
                          ].filter(Boolean).join(' + ') || 'from review'}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg px-3 py-2" style={{ background: '#f9fafb' }}>
                        <span className="text-[12px] text-gray-400">🔥 No heat earned on this application</span>
                      </div>
                    )}

                    {app.reviewed_at && (
                      <p className="text-[11px] text-gray-300 m-0">Reviewed {fmtDate(app.reviewed_at)}</p>
                    )}

                    {/* Reapply CTA */}
                    <div className="border-t border-gray-100 pt-3">
                      {canReapply ? (
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/opportunities/${opp.slug}`}
                            className="text-[13px] font-semibold transition-colors"
                            style={{ color: '#7c3aed' }}
                          >
                            Available to reapply →
                          </Link>
                          {matchCount > 0 && (
                            <span className="text-[12px] font-semibold" style={{ color: '#059669' }}>
                              {matchCount} {matchCount === 1 ? 'script' : 'scripts'} match
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[12px] text-gray-400 m-0">Unable to reapply — opportunity closed</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Stage progression tracker for in-progress too */}
                    <div className="pb-3 border-b border-gray-100">
                      <StageTracker reachedStages={reachedStages} isReviewed={false} />
                    </div>
                    <div className="text-center py-4">
                      <p className="text-[13px] text-gray-400 m-0">
                        Your application is under review. Feedback will appear here once it&apos;s been reviewed.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
