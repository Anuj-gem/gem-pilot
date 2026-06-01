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
  backing_status: string | null
  backing_conditions: string[] | null
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
  totalHeat: number
  matchingScriptCounts?: Record<string, number>
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function ApplicationsList({ apps, oppMap, scriptsByApp, totalHeat, matchingScriptCounts }: ApplicationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {apps.map(app => {
        const opp = oppMap[app.opportunity_id]
        const scripts = scriptsByApp[app.id] || []
        const isReviewed = app.status === 'reviewed' || app.review_stage === 'complete'
        const isExpanded = expandedId === app.id

        // Status badge — backing_status-aware
        let s = { label: 'In consideration', bg: '#ede9fe', color: '#5b21b6' }
        if (isReviewed) {
          if (app.backing_status === 'following') {
            s = { label: 'Following', bg: '#ede9fe', color: '#5b21b6' }
          } else if (app.backing_status === 'attached') {
            s = { label: 'Backed', bg: '#d1fae5', color: '#065f46' }
          } else {
            s = { label: 'Pass', bg: '#fef3c7', color: '#92400e' }
          }
        }

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

                    {/* Gap-closing tags (following) */}
                    {app.backing_status === 'following' && app.backing_conditions && app.backing_conditions.length > 0 && (
                      <div>
                        <p className="text-[12px] font-semibold text-gray-500 m-0 mb-1.5">What they want to see</p>
                        <div className="flex flex-wrap gap-1.5">
                          {app.backing_conditions.map(tag => (
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
                        <p className="text-[12px] font-semibold text-gray-500 m-0 mb-1.5">{app.backing_status === 'following' ? 'Areas to improve' : 'Why passing'}</p>
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
                    {app.heat_earned > 0 && (
                      <div className="rounded-lg px-3 py-2.5" style={{ background: '#fff7ed' }}>
                        <span className="text-[16px] font-bold" style={{ color: '#ea580c' }}>🔥 +{app.heat_earned} heat earned</span>
                      </div>
                    )}

                    {app.reviewed_at && (
                      <p className="text-[11px] text-gray-300 m-0">Reviewed {fmtDate(app.reviewed_at)}</p>
                    )}

                    {/* View full + Reapply CTA */}
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <Link
                        href={`/applications/${app.id}`}
                        className="block text-[13px] font-semibold transition-colors"
                        style={{ color: '#7c3aed' }}
                      >
                        View full application →
                      </Link>
                      {canReapply ? (
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/opportunities/${opp.slug}`}
                            className="text-[13px] font-semibold transition-colors text-gray-500 hover:text-gray-700"
                          >
                            Reapply →
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
                    <div className="text-center py-4">
                      <p className="text-[13px] text-gray-600 m-0">
                        Your application is under review. Feedback will appear here once it&apos;s been reviewed.
                      </p>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <Link
                        href={`/applications/${app.id}`}
                        className="text-[13px] font-semibold transition-colors"
                        style={{ color: '#7c3aed' }}
                      >
                        View full application →
                      </Link>
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
