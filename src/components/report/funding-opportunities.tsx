'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface MatchingOpp {
  id: string
  title: string
  slug: string
  subtitle: string | null
  funding_amount: number
  deadline: string | null
}

interface ConsiderationResult {
  opportunity_id: string
  backing_status: string | null  // 'following' | 'attached' | null
  backing_amount: number | null
  review_stage: string | null    // 'pending' | 'in_review' | 'complete'
  outcome: string | null         // 'pass' | 'follow' | 'back'
  feedback: string | null
  feedback_tags: string[] | null
}

interface Props {
  matchingOpps: MatchingOpp[]
  considerationResults: ConsiderationResult[]
  submissionId: string
  isOwner: boolean
  budgetTotal?: number
  securedAmount?: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`
  return `$${n.toLocaleString()}`
}

export function FundingOpportunities({ matchingOpps, considerationResults, submissionId, isOwner, budgetTotal = 0, securedAmount = 0 }: Props) {
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null)

  // Build a map from opportunity_id to consideration result
  const resultMap = new Map<string, ConsiderationResult>()
  for (const r of considerationResults) {
    resultMap.set(r.opportunity_id, r)
  }

  // Categorize opportunities
  const applied = matchingOpps.filter(o => resultMap.has(o.id))
  const available = matchingOpps.filter(o => !resultMap.has(o.id))

  // Funding math
  const totalAvailable = matchingOpps.reduce((s, o) => s + (o.funding_amount || 0), 0)
  const backed = applied.filter(o => {
    const r = resultMap.get(o.id)
    return r?.backing_status === 'attached' || r?.outcome === 'back'
  })
  const following = applied.filter(o => {
    const r = resultMap.get(o.id)
    return r?.backing_status === 'following' || r?.outcome === 'follow'
  })
  const passed = applied.filter(o => {
    const r = resultMap.get(o.id)
    return r?.outcome === 'pass'
  })
  const pending = applied.filter(o => {
    const r = resultMap.get(o.id)
    return !r?.outcome || r.outcome === ''
  })

  const backedAmount = backed.reduce((s, o) => {
    const r = resultMap.get(o.id)
    return s + (r?.backing_amount || o.funding_amount || 0)
  }, 0)
  const followingAmount = following.reduce((s, o) => s + (o.funding_amount || 0), 0)
  const passedAmount = passed.reduce((s, o) => s + (o.funding_amount || 0), 0)
  const availableAmount = available.reduce((s, o) => s + (o.funding_amount || 0), 0)

  if (matchingOpps.length === 0) return null

  function getStatusBadge(oppId: string) {
    const r = resultMap.get(oppId)
    if (!r) return null

    if (r.backing_status === 'attached' || r.outcome === 'back') {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: '#ecfdf5', color: '#15803d', border: '1px solid #6ee7b7' }}>Backed</span>
    }
    if (r.backing_status === 'following' || r.outcome === 'follow') {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: '#EEEDFE', color: '#534AB7' }}>Following</span>
    }
    if (r.outcome === 'pass') {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: '#fef2f2', color: '#991b1b' }}>Passed</span>
    }
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: '#fffbeb', color: '#92400e' }}>Pending</span>
  }

  const consideringTotal = followingAmount + pending.reduce((s, o) => s + (o.funding_amount || 0), 0)
  const totalFunded = securedAmount + consideringTotal
  const progressPct = budgetTotal > 0 ? Math.min(100, Math.round((securedAmount / budgetTotal) * 100)) : 0
  const consideringPct = budgetTotal > 0 ? Math.min(100 - progressPct, Math.round((consideringTotal / budgetTotal) * 100)) : 0

  return (
    <div className="bg-white rounded-2xl p-5 px-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-600 font-medium m-0">Funding available</h3>
          <p className="text-[12px] m-0 mt-1" style={{ color: '#534AB7' }}>Directly from GEM financial partners</p>
        </div>
        <span className="text-[14px] font-semibold shrink-0" style={{ color: '#534AB7' }}>{fmt(totalAvailable)} total</span>
      </div>

      {/* Progress bar */}
      {budgetTotal > 0 && (
        <div className="mb-4 mt-3">
          <div className="flex justify-between text-[11px] mb-1.5" style={{ color: '#78716C' }}>
            <span>Funding progress</span>
            <span>{fmt(securedAmount + consideringTotal)} of {fmt(budgetTotal)}</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#f0edf9', position: 'relative' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(progressPct, progressPct > 0 ? 1 : 0)}%`, background: '#0F6E56', position: 'absolute', left: 0, top: 0 }}
            />
            <div
              className="h-full"
              style={{ width: `${consideringPct}%`, background: '#534AB7', opacity: 0.4, position: 'absolute', left: `${progressPct}%`, top: 0 }}
            />
          </div>
          <div className="flex gap-4 mt-1.5 text-[11px]">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#0F6E56' }} /><span style={{ color: '#78716C' }}>Secured</span></span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#534AB7', opacity: 0.5 }} /><span style={{ color: '#78716C' }}>Considering</span></span>
          </div>
        </div>
      )}

      {/* Applied opportunities (with results) */}
      {applied.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-600 mb-2">Applied</p>
          <div className="flex flex-col gap-2">
            {applied.map(opp => {
              const r = resultMap.get(opp.id)
              const isExpanded = expandedOpp === opp.id
              return (
                <div key={opp.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
                    onClick={() => setExpandedOpp(isExpanded ? null : opp.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-medium text-gray-900 truncate">{opp.title}</span>
                        {getStatusBadge(opp.id)}
                      </div>
                      {opp.subtitle && (
                        <p className="text-[12px] m-0 mt-0.5 truncate" style={{ color: '#78716C' }}>{opp.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[14px] font-semibold shrink-0" style={{ color: '#534AB7' }}>{fmt(opp.funding_amount)}</span>
                    {r?.feedback || r?.feedback_tags?.length ? (
                      isExpanded ? <ChevronUp size={14} style={{ color: '#78716C' }} /> : <ChevronDown size={14} style={{ color: '#78716C' }} />
                    ) : null}
                  </div>
                  {/* Expanded feedback */}
                  {isExpanded && r && (r.feedback || r.feedback_tags?.length) && (
                    <div className="ml-4 mt-1 px-4 py-3 rounded-lg" style={{ background: '#fafaf9', border: '1px solid #e7e5e4' }}>
                      {r.feedback_tags && r.feedback_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {r.feedback_tags.map((tag, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#EEEDFE', color: '#534AB7' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                      {r.feedback && (
                        <p className="text-[13px] m-0 leading-relaxed" style={{ color: '#44403C' }}>{r.feedback}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available opportunities (not yet applied) */}
      {available.length > 0 && isOwner && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-600 mb-2">Available</p>
          <div className="flex flex-col gap-2">
            {available.map(opp => (
              <div
                key={opp.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.015)', border: '1px dashed rgba(0,0,0,0.12)' }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-medium text-gray-900 truncate block">{opp.title}</span>
                  {opp.subtitle && (
                    <p className="text-[12px] m-0 mt-0.5 truncate" style={{ color: '#78716C' }}>{opp.subtitle}</p>
                  )}
                </div>
                <span className="text-[14px] font-semibold shrink-0" style={{ color: '#534AB7' }}>{fmt(opp.funding_amount)}</span>
                <a
                  href={`/opportunities/${opp.slug}`}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-lg no-underline shrink-0"
                  style={{ background: '#534AB7', color: '#fff' }}
                >
                  Apply
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
