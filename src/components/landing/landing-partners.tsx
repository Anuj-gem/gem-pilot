// LandingPartners — "Who we work with." partner section.
'use client'

const PILLS = [
  'Literary managers building rosters',
  'Producers with active development slates',
  'Financiers packaging for production',
  'Development executives at studios and streamers',
]

const POINTS = [
  {
    emoji: '📊',
    title: 'Thorough evaluation on every script',
    desc: 'Score, genre, comparables, development notes — all done before you read a page.',
  },
  {
    emoji: '🎯',
    title: 'Post what you’re looking for, we match',
    desc: 'Tell us the genre, format, and tone. Our team scouts and surfaces qualified writers directly.',
  },
  {
    emoji: '⚡',
    title: 'Compare everything at once',
    desc: 'Evaluate all submissions side by side. Make decisions fast.',
  },
]

export function LandingPartners() {
  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{
        background: 'var(--gem-gray-900)',
        borderBottom: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 800 }}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          For partners
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-3"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Who we work with.
        </h2>
        <p className="text-[15px] text-[var(--gem-gray-400)] m-0 mb-8" style={{ maxWidth: 560 }}>
          We partner with reps, producers, and development executives who have a demonstrated track record of delivering real value for writers &mdash; and a reputation for doing business the right way.
        </p>

        {/* Partner type pills */}
        <div className="flex flex-wrap gap-2 mb-7">
          {PILLS.map(pill => (
            <span
              key={pill}
              className="text-[13px] font-semibold rounded-lg px-3.5 py-2"
              style={{
                color: 'var(--gem-gray-300)',
                background: '#FFFFFF',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              {pill}
            </span>
          ))}
        </div>

        {/* Partner points */}
        <div className="flex flex-col gap-5">
          {POINTS.map(point => (
            <div key={point.title} className="flex gap-4 items-start">
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid rgba(124,58,237,0.12)',
                  fontSize: 18,
                }}
              >
                {point.emoji}
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 mb-1">
                  {point.title}
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-400)] m-0" style={{ lineHeight: 1.5 }}>
                  {point.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <a
            href="#"
            className="text-[14px] font-bold hover:underline"
            style={{ color: 'var(--gem-accent)' }}
          >
            Apply to become a partner &rarr;
          </a>
        </div>
      </div>
    </section>
  )
}
