// LandingOpportunities — static 2x2 card grid, no DB props.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

const OPPORTUNITIES = [
  {
    slug: 'vertical-drama',
    posted: 'May 11',
    title: 'Vertical Drama Series',
    genre: 'Drama, Crime, Thriller',
    description: 'Short-form drama built to prove itself on social before scaling up.',
  },
  {
    slug: 'producible-thriller',
    posted: 'May 11',
    title: 'Producible Thriller',
    genre: 'Thriller, Crime, Horror',
    description: 'High-tension scripts where the writing does the heavy lifting.',
  },
  {
    slug: 'comedy-revival',
    posted: 'May 11',
    title: 'Comedy Revival',
    genre: 'Comedy, Comedy-Drama',
    description: 'Comedies with a built-in cast and a path that doesn\'t need a network.',
  },
  {
    slug: 'faith-inspirational',
    posted: 'May 11',
    title: 'Faith and Inspirational',
    genre: 'Drama, Family, Historical',
    description: 'Stories for the massive audience Hollywood keeps ignoring.',
  },
]

export function LandingOpportunities() {
  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
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
        <p className="text-[15px] m-0 mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
          These are live. Partners are actively reviewing submissions.
        </p>

        <div
          className="grid grid-cols-1 sm:grid-cols-2"
          style={{ gap: 14 }}
        >
          {OPPORTUNITIES.map(opp => (
            <div
              key={opp.slug}
              className="flex flex-col gap-2 rounded-xl p-4"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.08)',
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
                <span className="text-[12px]" style={{ color: '#78716c' }}>
                  Posted {opp.posted}
                </span>
              </div>
              <h3 className="text-[15px] font-bold m-0" style={{ color: '#1c1917' }}>
                {opp.title}
              </h3>
              <p className="text-[13px] m-0" style={{ color: '#78716c' }}>
                <span className="font-bold" style={{ color: '#57534e' }}>Genre:</span> {opp.genre}
              </p>
              <p className="text-[13px] m-0" style={{ lineHeight: 1.4, color: '#57534e' }}>
                {opp.description}
              </p>
              <Link
                href={`/opportunities/${opp.slug}`}
                className="text-[13px] font-semibold hover:text-[var(--gem-accent)] transition-colors no-underline mt-auto"
                style={{ color: '#78716c' }}
              >
                View details &rarr;
              </Link>
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
