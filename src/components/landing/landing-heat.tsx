// LandingHeat — v16.
// Dedicated heat score section — sell momentum and visibility.
'use client'

export function LandingHeat() {
  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Left: Explanation */}
          <div className="flex-1">
            <p
              className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
              style={{ color: 'var(--gem-gold)' }}
            >
              Your momentum
            </p>
            <h2
              className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Build heat. Get found.
            </h2>
            <p className="text-[15px] text-[var(--gem-gray-300)] m-0 mb-5 leading-relaxed">
              Every time an industry partner engages with your work, you earn heat.
              Even when they pass — if they think your writing is strong, your
              heat score still goes up.
            </p>
            <p className="text-[15px] text-[var(--gem-gray-300)] m-0 mb-5 leading-relaxed">
              The more heat you build, the more visible you become to new partners.
              Your heat score signals real traction — not self-reported credits,
              not contest placements, but actual engagement from people who
              make things.
            </p>
            <p className="text-[15px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
              Partners browsing GEM see your heat score before they read your
              script. High heat means other industry professionals already took
              notice. That changes the conversation before it starts.
            </p>
          </div>

          {/* Right: Visual example */}
          <div className="w-full md:w-[320px] shrink-0">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'var(--gem-gray-800)',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mb-3 uppercase tracking-wider font-semibold">
                How heat works
              </p>

              {[
                { action: 'Partner reads your script', heat: '+1' },
                { action: 'Partner shortlists you', heat: '+3' },
                { action: 'Partner passes but flags as strong', heat: '+1' },
                { action: 'Partner requests a meeting', heat: '+5' },
              ].map((item, i) => (
                <div
                  key={item.action}
                  className="flex items-center justify-between gap-3 py-2.5"
                  style={{ borderTop: i > 0 ? '1px solid var(--gem-gray-700)' : undefined }}
                >
                  <span className="text-[13px] text-[var(--gem-gray-200)]">{item.action}</span>
                  <span className="text-[13px] font-bold shrink-0" style={{ color: '#ea580c' }}>
                    {item.heat}
                  </span>
                </div>
              ))}

              <div
                className="mt-3 pt-3 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--gem-gray-700)' }}
              >
                <span className="text-[13px] font-semibold text-[var(--gem-gray-200)]">
                  Total heat
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] font-bold" style={{ color: '#ea580c' }}>12</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[var(--gem-gray-500)] m-0 mt-2.5 italic">
              Heat accumulates across all your scripts and submissions
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
