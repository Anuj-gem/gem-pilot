'use client'

// import Link from 'next/link'
// import { trackEvent } from '@/lib/posthog'

export function LandingActivity() {
  return (
    <section className="px-6 sm:px-10 pt-20 sm:pt-28 pb-10 sm:pb-14" style={{ background: 'var(--gem-black)' }}>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Leaderboard preview — hidden until leaderboard is ready
        <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}>
          ...
        </div>
        */}
      </div>
    </section>
  )
}
