'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

const leaderboardData = [
  { rank: 1, title: 'The Glass Floor', meta: 'Feature Film · Thriller · Drama', score: 86, heat: 14 },
  { rank: 2, title: 'Salt Creek', meta: 'TV Pilot · Crime', score: 82, heat: 11 },
  { rank: 3, title: 'Nightfall Protocol', meta: 'Feature Film · Sci-Fi · Action', score: 79, heat: 8 },
  { rank: 4, title: 'Borrowed Light', meta: 'TV Pilot · Drama · Family', score: 77, heat: 6 },
  { rank: 5, title: 'Deadweight', meta: 'Feature Film · Horror', score: 74, heat: 4 },
]

export function LandingActivity() {
  return (
    <section className="px-6 sm:px-10 py-20 sm:py-28" style={{ background: 'var(--gem-black)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-[13px] font-semibold uppercase tracking-wider m-0 mb-3" style={{ color: 'var(--gem-gold)' }}>
            Active community
          </p>
          <h2 className="text-[28px] sm:text-[36px] font-bold leading-tight m-0 mb-4" style={{ fontFamily: 'Georgia, serif', color: 'var(--gem-gray-50)' }}>
            Join hundreds of writers already here.
          </h2>
          <p className="text-[16px] sm:text-[18px] m-0 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--gem-gray-300)' }}>
            Real writers. Real scripts. Real industry partners reading and reaching out every week.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 sm:mb-14">
          {[
            { icon: '📄', number: '1,847', label: 'Scripts evaluated' },
            { icon: '👥', number: '412', label: 'Writers on GEM' },
            { icon: '💰', number: '8', label: 'Open opportunities' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-6 text-center"
              style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}
            >
              <span className="block text-[22px] mb-2">{stat.icon}</span>
              <span className="block text-[36px] font-extrabold leading-none mb-1" style={{ color: 'var(--gem-gray-50)' }}>{stat.number}</span>
              <span className="block text-[13px]" style={{ color: 'var(--gem-gray-400)' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Leaderboard preview */}
        <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--gem-gray-400)' }}>
              Top scripts on the leaderboard
            </span>
            <Link
              href="/discover"
              onClick={() => { try { trackEvent('cta_clicked', { location: 'activity_leaderboard', label: 'View full leaderboard' }) } catch {} }}
              className="text-[13px] font-medium no-underline hover:underline"
              style={{ color: 'var(--gem-accent)' }}
            >
              View full leaderboard →
            </Link>
          </div>

          {/* Rows */}
          {leaderboardData.map((row, i) => (
            <div
              key={row.rank}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: i < leaderboardData.length - 1 ? '1px solid var(--gem-gray-700)' : 'none' }}
            >
              {/* Rank */}
              <span className="text-[14px] font-bold shrink-0" style={{ width: 28, color: 'var(--gem-gray-400)' }}>
                {row.rank}
              </span>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold m-0 truncate" style={{ color: 'var(--gem-gray-50)' }}>{row.title}</p>
                <p className="text-[12px] m-0 truncate" style={{ color: 'var(--gem-gray-400)' }}>{row.meta}</p>
              </div>

              {/* Score pill */}
              <div
                className="flex items-center gap-1 shrink-0 rounded-lg px-2.5"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', height: 36 }}
              >
                <span
                  className="block shrink-0"
                  style={{
                    width: 9,
                    height: 9,
                    background: 'rgba(255,255,255,0.3)',
                    transform: 'rotate(45deg)',
                  }}
                />
                <span className="text-[16px] font-extrabold text-white">{row.score}</span>
                <span className="text-[9px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Score</span>
              </div>

              {/* Heat pill */}
              <div
                className="flex items-center gap-1 shrink-0 rounded-lg px-2.5"
                style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', height: 36 }}
              >
                <span className="text-[12px]">🔥</span>
                <span className="text-[16px] font-extrabold" style={{ color: '#ea580c' }}>{row.heat}</span>
                <span className="text-[9px] font-bold uppercase" style={{ color: '#fb923c' }}>Heat</span>
              </div>
            </div>
          ))}

          {/* Footnote */}
          <p className="text-[12px] m-0 mt-4" style={{ color: 'var(--gem-gray-500)' }}>
            Ranked by score. Heat = industry partner engagement.
          </p>
        </div>
      </div>
    </section>
  )
}
