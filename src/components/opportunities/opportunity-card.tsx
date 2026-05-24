// OpportunityCard — unified card for opportunity display.
// Works in dashboard 3-col grid and opportunities listing page.
// Pure server component — Apply links to detail page, no inline actions.

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
}

export function OpportunityCard({
  id, slug, title, subtitle, description, genres, formats,
  createdAt, deadline, status, matchingScriptCount, isAnon, applicationCount,
}: OpportunityCardProps) {
  const href = `/opportunities/${slug ?? id}`
  const applyHref = `/opportunities/${slug ?? id}/apply`
  const postedDate = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const hasApplied = status === 'previously_applied'
  const hasPending = status === 'pending'
  const hasMatches = matchingScriptCount > 0
  const canApply = !isAnon && hasMatches && !hasPending

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

        {/* Subtitle / description */}
        {(subtitle || description) && (
          <p className="text-[13px] text-gray-600 m-0 line-clamp-2 leading-snug">
            {subtitle || description}
          </p>
        )}
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
              <span className="text-[12px] font-semibold text-purple-700 shrink-0">
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
              canApply ? (
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
