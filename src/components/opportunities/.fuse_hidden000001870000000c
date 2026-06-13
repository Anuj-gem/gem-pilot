'use client'

// OpportunityCard — unified card for opportunity display.
// Used identically on dashboard AND opportunities listing page.

import Link from 'next/link'

export type OppStatus = 'available' | 'pending' | 'previously_applied'

// Legacy type used by consideration/submit for opportunity matching
export type OpportunityData = {
  id: string
  title: string
  slug: string | null
  formats: string[]
  genres: string[]
  budget_tiers: string[]
  min_score: number | null
  deadline: string | null
  subtitle: string | null
  description: string | null
  status: string
  posted_by: string | null
}

export interface OpportunityCardProps {
  id: string
  slug: string | null
  title: string
  subtitle: string | null
  description: string | null
  genres: string[]
  formats: string[]
  createdAt: string
  deadline: string | null
  status: OppStatus
  matchingScriptCount: number
  isAnon?: boolean
  applicationCount?: number
  // New fields
  writersApplied?: number
  lastApplicationAt?: string | null
  dealType?: string | null
  fundingAmount?: number | null
  isPro?: boolean
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function OpportunityCard({
  id, slug, title, subtitle, description, genres, formats,
  createdAt, deadline, status, matchingScriptCount, isAnon, applicationCount,
  writersApplied, lastApplicationAt, dealType, fundingAmount, isPro = true,
}: OpportunityCardProps) {
  const href = `/opportunities/${slug ?? id}`
  const applyHref = `/opportunities/${slug ?? id}/apply`
  const hasApplied = status === 'previously_applied'
  const hasPending = status === 'pending'
  const hasMatches = matchingScriptCount > 0
  const canApply = !isAnon && hasMatches && !hasPending

  return (
    <div className="relative rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group"
      style={{ background: '#ffffff', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>

      {/* Full-card link */}
      <Link href={href} className="absolute inset-0 z-0" aria-label={title} />

      {/* Card body */}
      <div className="relative z-10 p-4 flex-1 flex flex-col pointer-events-none">

        {/* Top row: Funding left, GEM Partner right */}
        <div className="flex items-start justify-between gap-2 mb-1">
          {fundingAmount && fundingAmount > 0 ? (
            <div className="text-[20px] font-bold" style={{ color: '#0F6E56' }}>
              {fundingAmount >= 1_000_000 ? `$${(fundingAmount / 1_000_000) % 1 === 0 ? (fundingAmount / 1_000_000).toFixed(0) : (fundingAmount / 1_000_000).toFixed(1)}M` : fundingAmount >= 1_000 ? `$${Math.round(fundingAmount / 1_000)}K` : `$${fundingAmount}`}
              <span className="text-[11px] font-normal text-gray-500 ml-1">per project</span>
            </div>
          ) : <div />}
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <span
              className="inline-block w-2 h-2 shrink-0"
              style={{ transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', borderRadius: 1 }}
            />
            <span className="text-[11px] text-gray-500">GEM Partner</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-gray-900 m-0 mb-1 leading-snug group-hover:text-purple-700 transition-colors">
          {title}
        </h3>

        {/* Subtitle / description */}
        {(subtitle || description) && (
          <p className="text-[13px] text-gray-600 m-0 line-clamp-2 leading-snug mb-2">
            {subtitle || description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-auto pt-1">
          {(writersApplied != null && writersApplied > 0) && (
            <span className="text-[12px] text-gray-600">
              {writersApplied} writer{writersApplied !== 1 ? 's' : ''} applied
            </span>
          )}
          {lastApplicationAt && (
            <span className="text-[12px] text-gray-600">
              Last {timeAgo(lastApplicationAt)}
            </span>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 px-4 py-2.5 pointer-events-auto"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>

        <div className="flex items-center justify-between gap-2">
          {/* Left: match count or status */}
          <div className="flex items-center gap-2 min-w-0">
            {isAnon ? (
              <span className="text-[12px] text-gray-600 shrink-0">
                Upload a script to apply
              </span>
            ) : hasPending ? (
              <span className="text-[12px] font-semibold shrink-0" style={{ color: '#7c3aed' }}>
                Application pending
              </span>
            ) : (
              <span className={`text-[12px] font-medium shrink-0 ${hasMatches ? 'text-purple-600' : 'text-gray-600'}`}>
                {matchingScriptCount} {matchingScriptCount === 1 ? 'script matches' : 'scripts match'}
              </span>
            )}
          </div>

          {/* Right: Apply/Reapply + View details */}
          <div className="flex items-center gap-2 shrink-0">
            {!isAnon && !hasPending && (
              !isPro ? (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-paywall', { detail: { reason: 'GEM Pro required to apply' } })) }}
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-white px-3 py-1.5 rounded-lg cursor-pointer border-0"
                  style={{ background: '#7c3aed' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Apply
                </button>
              ) : canApply ? (
                <Link href={applyHref}
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-white px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: '#7c3aed' }}>
                  {hasApplied ? 'Reapply' : 'Apply'}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-white px-3 py-1.5 rounded-lg opacity-40 cursor-not-allowed"
                  style={{ background: '#7c3aed' }}>
                  {hasApplied ? 'Reapply' : 'Apply'}
                </span>
              )
            )}
            <Link href={href}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
              View details <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
