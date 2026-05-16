// OpportunityCard — unified card for opportunity display.
// Works in dashboard 3-col grid and opportunities listing page.
// Pure server component — Apply links to detail page, no inline actions.

import Link from 'next/link'
import { ApplyButton } from './apply-button'

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
}

const STATUS_CONFIG: Record<OppStatus, { label: string; bg: string; color: string }> = {
  available:          { label: 'Available',          bg: '#ecfdf5', color: '#0f6e56' },
  pending:            { label: 'Application Pending', bg: '#ede9fe', color: '#5b21b6' },
  previously_applied: { label: 'Previously applied', bg: '#e1f5ee', color: '#0f6e56' },
}

export function OpportunityCard({
  id, slug, title, subtitle, description, genres, formats,
  createdAt, deadline, status, matchingScriptCount, isAnon,
}: OpportunityCardProps) {
  const href = `/opportunities/${slug ?? id}`
  const postedDate = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const cfg = STATUS_CONFIG[status]
  const showScriptCount = status === 'available' && matchingScriptCount > 0
  const showApply = status === 'available'

  return (
    <div className="relative rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col group"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>

      {/* Full-card link */}
      <Link href={href} className="absolute inset-0 z-0" aria-label={title} />

      {/* Card body */}
      <div className="relative z-10 p-4 flex-1 flex flex-col pointer-events-none">

        {/* Top row: Paid badge + posted date */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold px-2 py-0.5 rounded"
            style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            Paid
          </span>
          <span className="text-[12px] text-gray-500">Posted {postedDate}</span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-gray-900 m-0 mb-2 leading-snug group-hover:text-purple-700 transition-colors">
          {title}
        </h3>

        {/* Format + Genre as labeled lines */}
        <div className="space-y-0.5 mb-2">
          {formats.length > 0 && (
            <div className="text-[13px]">
              <span className="text-gray-400">Format:</span>{' '}
              <span className="text-gray-700">{formats.join(', ')}</span>
            </div>
          )}
          {genres.length > 0 && (
            <div className="text-[13px]">
              <span className="text-gray-400">Genre:</span>{' '}
              <span className="text-gray-700">{genres.slice(0, 3).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Subtitle / description */}
        {(subtitle || description) && (
          <p className="text-[13px] text-gray-600 m-0 line-clamp-2 leading-snug">
            {subtitle || description}
          </p>
        )}
      </div>

      {/* Bottom bar — two rows for compact columns */}
      <div className="relative z-10 px-4 py-2.5 pointer-events-auto"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>

        {/* Row 1: Status pill + script match count */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full shrink-0"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
          {showScriptCount && (
            <span className="text-[12px] font-medium" style={{ color: '#7c3aed' }}>
              {matchingScriptCount} {matchingScriptCount === 1 ? 'script matches' : 'scripts match'}
            </span>
          )}
        </div>

        {/* Row 2: View details + Apply */}
        <div className="flex items-center justify-between">
          <Link href={href}
            className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
            View details
          </Link>
          {showApply && (
            <ApplyButton href={href} isAnon={isAnon} />
          )}
        </div>
      </div>
    </div>
  )
}
