// LandingOpportunities — v16.
// Two-column: live opportunity cards + how matching and heat work.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

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

function formatDeadline(d: string) {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Closed'
  if (days === 1) return 'Closes tomorrow'
  if (days <= 7) return `${days} days left`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function LandingOpportunities({ opportunities }: { opportunities: LandingOpportunity[] }) {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'opportunities_section', label: 'Get started' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          GEM Partner Network
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-4"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Real opportunities. Not a submissions portal.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-400)] leading-relaxed m-0 mb-10 max-w-[560px]">
          Your script gets matched to opportunities from producers, lit reps,
          and financiers who are actively looking for material like yours.
        </p>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Left: Live opportunity cards */}
          <div className="w-full md:w-[380px] shrink-0">
            <p className="text-[12px] font-semibold text-[var(--gem-gray-400)] uppercase tracking-wider mb-3">
              Live on GEM right now
            </p>
            <div className="flex flex-col gap-3">
              {opportunities.length > 0 ? opportunities.slice(0, 3).map(opp => {
                const href = `/opportunities/${opp.slug ?? opp.id}`
                return (
                  <Link
                    key={opp.id}
                    href={href}
                    className="block rounded-xl p-4 transition-all"
                    style={{
                      background: 'var(--gem-gray-800)',
                      border: '1px solid var(--gem-gray-700)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        className="text-[14px] font-bold text-[var(--gem-gray-50)] m-0 leading-snug"
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
                    {opp.subtitle && (
                      <p className="text-[12px] text-[var(--gem-gray-400)] mt-1 m-0">
                        {opp.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {opp.genres.slice(0, 3).map(g => (
                        <span
                          key={g}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(37,99,235,0.06)', color: '#2563EB' }}
                        >
                          {GENRE_LABELS[g] ?? g}
                        </span>
                      ))}
                      {opp.formats.length > 0 && opp.formats.map(f => (
                        <span
                          key={f}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--gem-gray-900)', color: 'var(--gem-gray-300)' }}
                        >
                          {f}
                        </span>
                      ))}
                      {opp.min_score != null && (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--gem-accent)' }}
                        >
                          Score {opp.min_score}+
                        </span>
                      )}
                    </div>
                  </Link>
                )
              }) : (
                <p className="text-[14px] text-[var(--gem-gray-400)]">
                  New opportunities are added regularly.
                </p>
              )}
            </div>
            <div className="mt-3">
              <Link
                href="/opportunities"
                className="text-[13px] font-semibold hover:underline"
                style={{ color: 'var(--gem-accent)' }}
              >
                View all opportunities &rarr;
              </Link>
            </div>
          </div>

          {/* Right: How it works */}
          <div className="flex-1 pt-2">
            <div className="space-y-5">
              <div>
                <h3
                  className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  You qualify based on your script.
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
                  Each opportunity has specific criteria — genre, format, budget tier,
                  minimum score. If your script fits, you can apply directly.
                  No cold queries. No entry fees.
                </p>
              </div>

              <div>
                <h3
                  className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Real people evaluate your work.
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
                  When you apply, your script goes directly to the partner behind
                  the opportunity. You get real feedback — not a form rejection.
                  Even when partners pass, they tell you why.
                </p>
              </div>

              <div>
                <h3
                  className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Your heat score builds over time.
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
                  As partners engage with your work — even when they pass but
                  think your writing is strong — your heat score goes up. The more
                  traction you get, the easier it is for new partners to find you.
                  Momentum compounds.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleCTA}
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
        </div>
      </div>
    </section>
  )
}
