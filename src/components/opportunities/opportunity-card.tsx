'use client'

// OpportunityCard — a single opportunity listing with qualification badges.
// Used on both /opportunities and the dashboard.

import Link from 'next/link'

export interface OpportunityData {
  id: string
  title: string
  description: string
  formats: string[]
  genres: string[]
  budget_tiers: string[]
  min_score: number | null
  deadline: string | null
  status: string
  posted_by: string | null
  slug: string | null
}

export interface QualifyingScript {
  id: string
  title: string
  evaluation_id: string
}

interface OpportunityCardProps {
  opportunity: OpportunityData
  /** Scripts the viewer owns that qualify for this opportunity */
  qualifyingScripts?: QualifyingScript[]
  /** Compact mode for dashboard embed (hides description) */
  compact?: boolean
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  if (days <= 7) return `Closes in ${days} days`
  return `Closes ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

const GENRE_LABELS: Record<string, string> = {
  thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
  comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
  action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
  documentary: 'Documentary',
}

const BUDGET_LABELS: Record<string, string> = {
  micro: 'Micro', indie: 'Indie', mid: 'Mid', studio: 'Studio',
  premium: 'Premium', tentpole: 'Tentpole',
}

export function OpportunityCard({ opportunity, qualifyingScripts = [], compact = false }: OpportunityCardProps) {
  const hasQualifying = qualifyingScripts.length > 0
  const href = opportunity.slug ? `/opportunities/${opportunity.slug}` : '#'

  return (
    <Link
      href={href}
      className="block rounded-xl transition-all hover:shadow-sm"
      style={{
        background: '#fff',
        border: `1px solid ${hasQualifying ? 'rgba(16,185,129,0.3)' : 'var(--gem-gray-200, #e5e7eb)'}`,
      }}
    >
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        {/* Title + deadline */}
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="text-[14.5px] font-semibold text-gray-900 leading-snug m-0">
            {opportunity.title}
          </h3>
          {opportunity.deadline && (
            <span className="flex-shrink-0 text-[11.5px] text-gray-400 font-medium whitespace-nowrap mt-0.5">
              {formatDeadline(opportunity.deadline)}
            </span>
          )}
        </div>

        {/* Description (hidden in compact mode) */}
        {!compact && (
          <p className="text-[13px] text-gray-500 leading-[1.55] m-0 mb-3 line-clamp-2">
            {opportunity.description}
          </p>
        )}

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {opportunity.formats.map(f => (
            <span key={f} className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              {f}
            </span>
          ))}
          {opportunity.genres.map(g => (
            <span key={g} className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {GENRE_LABELS[g] ?? g}
            </span>
          ))}
          {opportunity.budget_tiers.map(b => (
            <span key={b} className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {BUDGET_LABELS[b] ?? b}
            </span>
          ))}
          {opportunity.min_score && (
            <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Min score: {opportunity.min_score}
            </span>
          )}
        </div>

        {/* Qualification status */}
        {hasQualifying ? (
          <div className="flex flex-wrap gap-1.5">
            {qualifyingScripts.map(s => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15"/><path d="M3.5 6.2L5.2 7.8L8.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {s.title} qualifies
              </span>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-gray-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.4"/><path d="M4 6h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
            No matching scripts yet
          </span>
        )}

        {/* Posted by */}
        {opportunity.posted_by && !compact && (
          <p className="text-[11px] text-gray-400 mt-2.5 m-0">
            Posted by {opportunity.posted_by}
          </p>
        )}
      </div>
    </Link>
  )
}
