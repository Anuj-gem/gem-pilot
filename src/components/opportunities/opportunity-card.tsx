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
  perspective: string | null
  deal_type: string | null
}

export const PERSPECTIVE_LABELS: Record<string, string> = {
  producer: 'Producer',
  lit_rep: 'Lit Rep',
  actor_rep: 'Talent Rep',
  financier: 'Financier',
}

export const DEAL_TYPE_LABELS: Record<string, string> = {
  option: 'Option',
  purchase: 'Purchase',
  representation: 'Representation',
  co_finance: 'Production Finance',
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

  // Build the secondary info line: "Feature · Thriller, Crime · Indie budget · Min 70"
  const infoParts: string[] = []
  if (opportunity.formats.length > 0) infoParts.push(opportunity.formats.join(', '))
  if (opportunity.budget_tiers.length > 0) infoParts.push(opportunity.budget_tiers.map(b => BUDGET_LABELS[b] ?? b).join(', ') + ' budget')
  if (opportunity.min_score) infoParts.push(`Min score ${opportunity.min_score}`)

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
        {/* Row 1: Title + deadline */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug m-0">
            {opportunity.title}
          </h3>
          {opportunity.deadline && (
            <span className="flex-shrink-0 text-[11px] text-gray-400 font-medium whitespace-nowrap mt-0.5">
              {formatDeadline(opportunity.deadline)}
            </span>
          )}
        </div>

        {/* Row 2: Deal type + perspective as text */}
        {(opportunity.deal_type || opportunity.perspective) && (
          <p className="text-[12.5px] font-semibold text-gray-500 mt-1 m-0">
            {[
              opportunity.perspective && (PERSPECTIVE_LABELS[opportunity.perspective] ?? opportunity.perspective),
              opportunity.deal_type && (DEAL_TYPE_LABELS[opportunity.deal_type] ?? opportunity.deal_type),
            ].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Row 3: Genres — prominent pills */}
        {opportunity.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {opportunity.genres.map(g => (
              <span key={g} className="inline-block text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {GENRE_LABELS[g] ?? g}
              </span>
            ))}
          </div>
        )}

        {/* Row 4: Format, budget, min score as a quiet info line */}
        {infoParts.length > 0 && (
          <p className="text-[11.5px] text-gray-400 mt-2 m-0">
            {infoParts.join(' · ')}
          </p>
        )}

        {/* Row 5: Qualification status */}
        <div className="mt-3 pt-2.5 border-t border-gray-100">
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
        </div>
      </div>
    </Link>
  )
}
