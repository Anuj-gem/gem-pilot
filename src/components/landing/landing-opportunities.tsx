// LandingOpportunities — v15c.
// Live opportunities + CTA.
'use client'

import Link from 'next/link'

export interface LandingOpportunity {
  id: string
  title: string
  slug: string | null
  description: string
  formats: string[]
  genres: string[]
  budget_tiers: string[]
  min_score: number | null
  deadline: string | null
  subtitle: string | null
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

function formatDeadline(d: string) {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Closed'
  if (days === 1) return 'Closes tomorrow'
  if (days <= 7) return `${days} days left`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function LandingOpportunities({ opportunities }: { opportunities: LandingOpportunity[] }) {
  if (opportunities.length === 0) return null

  return (
    <section className="px-5 sm:px-8 pb-12 sm:pb-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.18em] font-bold mb-1 m-0"
              style={{ color: 'var(--gem-gold)' }}
            >
              Live on GEM
            </p>
            <h2
              className="text-[20px] sm:text-[24px] font-bold text-[var(--gem-gray-50)] m-0"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Opportunities
            </h2>
          </div>
          <Link
            href="/opportunities"
            className="text-[13px] font-semibold hover:underline"
            style={{ color: 'var(--gem-accent)' }}
          >
            View all →
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {opportunities.slice(0, 3).map(opp => {
            const href = `/opportunities/${opp.slug ?? opp.id}`
            return (
              <Link
                key={opp.id}
                href={href}
                className="block rounded-xl card-glass p-4 sm:p-5 transition-all"
              >
                {/* Title + deadline */}
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 leading-snug"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {opp.title}
                  </h3>
                  {opp.deadline && (
                    <span className="flex-shrink-0 text-[11px] text-[var(--gem-gray-500)] font-medium whitespace-nowrap mt-0.5">
                      {formatDeadline(opp.deadline)}
                    </span>
                  )}
                </div>

                {/* Subtitle */}
                {opp.subtitle && (
                  <p className="text-[12.5px] font-medium text-[var(--gem-gray-400)] mt-1 m-0">
                    {opp.subtitle}
                  </p>
                )}

                {/* Qualification criteria pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {opp.formats.length > 0 && opp.formats.map(f => (
                    <span
                      key={f}
                      className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                      style={{
                        background: 'var(--gem-gray-800)',
                        color: 'var(--gem-gray-300)',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                  {opp.genres.length > 0 && opp.genres.slice(0, 3).map(g => (
                    <span
                      key={g}
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(37,99,235,0.06)', color: '#2563EB' }}
                    >
                      {GENRE_LABELS[g] ?? g}
                    </span>
                  ))}
                  {opp.budget_tiers.length > 0 && opp.budget_tiers.slice(0, 1).map(b => (
                    <span
                      key={b}
                      className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(217,119,6,0.06)', color: '#b45309' }}
                    >
                      {BUDGET_LABELS[b] ?? b} budget
                    </span>
                  ))}
                  {opp.min_score != null && (
                    <span
                      className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--gem-accent)' }}
                    >
                      Min score {opp.min_score}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-5 space-y-3">
          <Link
            href="/opportunities"
            className="text-[14px] font-semibold block"
            style={{ color: 'var(--gem-accent)' }}
          >
            View all opportunities →
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('gem:open-script-upload-modal'))}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
            }}
          >
            Get started
          </button>
        </div>
      </div>
    </section>
  )
}
