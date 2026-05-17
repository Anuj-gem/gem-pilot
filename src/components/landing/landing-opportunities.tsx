// LandingOpportunities — static 2x2 card grid, no DB props.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

const OPPORTUNITIES = [
  {
    id: '1',
    posted: 'May 12',
    title: 'Seeking bold debut features',
    genre: 'Drama, Thriller',
    description: 'Literary manager building roster of emerging feature writers with a distinctive voice.',
  },
  {
    id: '2',
    posted: 'May 10',
    title: 'Half-hour comedies for streaming',
    genre: 'Comedy, Half-hour',
    description: 'Production company with first-look deal at major streamer seeking fresh comedy voices.',
  },
  {
    id: '3',
    posted: 'May 8',
    title: 'Genre-elevated horror & thriller',
    genre: 'Horror, Thriller',
    description: 'Financier actively packaging for Q3 production slate. Budget range $5–15M.',
  },
  {
    id: '4',
    posted: 'May 6',
    title: 'Sci-fi limited series for cable',
    genre: 'Sci-fi, Drama',
    description: 'Network looking for grounded sci-fi with strong character dynamics. 6–8 episodes.',
  },
]

export function LandingOpportunities() {
  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
    >
      <div className="mx-auto" style={{ maxWidth: 800 }}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          Open now
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-3"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Real opportunities, right now.
        </h2>
        <p className="text-[15px] text-[var(--gem-gray-400)] m-0 mb-10">
          These are live. Partners are actively reviewing submissions.
        </p>

        <div
          className="grid grid-cols-1 sm:grid-cols-2"
          style={{ gap: 14 }}
        >
          {OPPORTUNITIES.map(opp => (
            <div
              key={opp.id}
              className="flex flex-col gap-2 rounded-xl p-4"
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] font-bold rounded px-1.5 py-0.5"
                  style={{
                    color: 'var(--gem-accent)',
                    background: 'rgba(124,58,237,0.06)',
                  }}
                >
                  &#128176; Paid
                </span>
                <span className="text-[12px] text-[var(--gem-gray-400)]">
                  Posted {opp.posted}
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0">
                {opp.title}
              </h3>
              <p className="text-[13px] text-[var(--gem-gray-400)] m-0">
                <span className="font-bold text-[var(--gem-gray-300)]">Genre:</span> {opp.genre}
              </p>
              <p className="text-[13px] text-[var(--gem-gray-300)] m-0" style={{ lineHeight: 1.4 }}>
                {opp.description}
              </p>
              <span
                className="text-[13px] font-semibold text-[var(--gem-gray-400)] hover:text-[var(--gem-accent)] transition-colors cursor-pointer mt-auto"
              >
                View details &rarr;
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/opportunities"
            className="text-[14px] font-bold hover:underline"
            style={{ color: 'var(--gem-accent)' }}
            onClick={() => {
              try { trackEvent('cta_clicked', { location: 'opportunities_section', label: 'Browse all' }) } catch {}
            }}
          >
            Browse all opportunities &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}
