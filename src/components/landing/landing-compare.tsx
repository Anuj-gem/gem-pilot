// LandingCompare — v16.
// "We're not script coverage" — competitor comparison + value prop.
'use client'

export function LandingCompare() {
  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          Why GEM
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-4"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          We&apos;re not script coverage.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-400)] leading-relaxed m-0 mb-10 max-w-[600px]">
          Other platforms charge you per script for generic feedback that
          doesn&apos;t lead anywhere. GEM gives you better evaluations for free —
          and the only thing we charge for is access to real opportunities.
        </p>

        {/* Comparison table */}
        <div
          className="rounded-2xl overflow-hidden mb-10"
          style={{ border: '1px solid var(--gem-gray-700)' }}
        >
          {/* Header row */}
          <div
            className="grid grid-cols-4 text-center"
            style={{ background: 'var(--gem-gray-900)' }}
          >
            <div className="p-3 text-left">
              <span className="text-[12px] text-[var(--gem-gray-500)] font-semibold uppercase tracking-wider">
                &nbsp;
              </span>
            </div>
            <div className="p-3" style={{ borderLeft: '1px solid var(--gem-gray-700)' }}>
              <span className="text-[13px] font-bold" style={{ color: 'var(--gem-accent)' }}>GEM</span>
            </div>
            <div className="p-3" style={{ borderLeft: '1px solid var(--gem-gray-700)' }}>
              <span className="text-[13px] font-semibold text-[var(--gem-gray-300)]">The Black List</span>
            </div>
            <div className="p-3" style={{ borderLeft: '1px solid var(--gem-gray-700)' }}>
              <span className="text-[13px] font-semibold text-[var(--gem-gray-300)]">Coverfly</span>
            </div>
          </div>

          {/* Rows */}
          {[
            {
              label: 'Script evaluation',
              gem: 'Free',
              blacklist: '$75 per read',
              coverfly: 'Varies by contest',
            },
            {
              label: 'Monthly cost',
              gem: '$20/mo',
              blacklist: '$30/mo hosting',
              coverfly: 'Free (limited)',
            },
            {
              label: 'Feedback quality',
              gem: 'Detailed, 5-dimension report with development notes',
              blacklist: 'Brief reader evaluation',
              coverfly: 'Contest-dependent',
            },
            {
              label: 'Access to partners',
              gem: 'Direct matching to producers, lit reps, financiers',
              blacklist: 'Industry browsing if score 8+',
              coverfly: 'No direct access',
            },
            {
              label: 'Ongoing feedback',
              gem: 'Heat score + real partner feedback on every submission',
              blacklist: 'One-time read',
              coverfly: 'Contest placement only',
            },
          ].map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-4"
              style={{
                background: i % 2 === 0 ? 'var(--gem-gray-800)' : 'var(--gem-gray-900)',
                borderTop: '1px solid var(--gem-gray-700)',
              }}
            >
              <div className="p-3">
                <span className="text-[13px] font-semibold text-[var(--gem-gray-200)]">
                  {row.label}
                </span>
              </div>
              <div
                className="p-3"
                style={{ borderLeft: '1px solid var(--gem-gray-700)' }}
              >
                <span className="text-[13px] font-semibold" style={{ color: 'var(--gem-accent)' }}>
                  {row.gem}
                </span>
              </div>
              <div
                className="p-3"
                style={{ borderLeft: '1px solid var(--gem-gray-700)' }}
              >
                <span className="text-[13px] text-[var(--gem-gray-400)]">
                  {row.blacklist}
                </span>
              </div>
              <div
                className="p-3"
                style={{ borderLeft: '1px solid var(--gem-gray-700)' }}
              >
                <span className="text-[13px] text-[var(--gem-gray-400)]">
                  {row.coverfly}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom summary */}
        <div className="max-w-[600px]">
          <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
            The Black List charges $75 per evaluation and $30/month just to host
            your script. Coverfly locks feedback behind contest entry fees. GEM gives
            you a better evaluation for free — and $20/month gets you unlimited access
            to real opportunities with real feedback from real people. No per-script
            charges. No entry fees. No gatekeeping.
          </p>
        </div>
      </div>
    </section>
  )
}
