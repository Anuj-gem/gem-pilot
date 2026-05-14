// LandingHeat — v16.
// Dedicated heat score section — sell momentum and visibility.
'use client'

export function LandingHeat() {
  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Left: Value prop bullets */}
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
            <p className="text-[15px] text-[var(--gem-gray-300)] m-0 mb-6 leading-relaxed max-w-[440px]">
              Every time an industry partner engages with your work, your heat
              score goes up. The more heat you build, the more visible you become.
            </p>

            <div className="space-y-3 mb-6">
              {[
                'Apply to more opportunities — earn more heat',
                'Get read by partners — earn more heat',
                'Higher heat = more visibility to new partners',
                'Partners see your heat before they read your script',
              ].map(item => (
                <div key={item} className="flex items-start gap-2.5">
                  <span className="text-[14px] font-bold mt-0.5 shrink-0" style={{ color: '#ea580c' }}>
                    &#x1F525;
                  </span>
                  <span className="text-[14px] text-[var(--gem-gray-200)]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Mini portfolio with heat per script */}
          <div className="w-full md:w-[320px] shrink-0">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'var(--gem-gray-800)',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mb-3 uppercase tracking-wider font-semibold">
                Your scripts
              </p>

              {[
                { title: 'Untitled Crime Pilot', format: 'TV Pilot', heat: 5 },
                { title: 'Desert Highway', format: 'Feature', heat: 4 },
                { title: 'The Last Signal', format: 'TV Pilot', heat: 3 },
              ].map((script, i) => (
                <div
                  key={script.title}
                  className="flex items-center justify-between gap-3 py-2.5"
                  style={{ borderTop: i > 0 ? '1px solid var(--gem-gray-700)' : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--gem-gray-100)] m-0 truncate">
                      {script.title}
                    </p>
                    <p className="text-[11px] text-[var(--gem-gray-500)] m-0">{script.format}</p>
                  </div>
                  <span className="text-[14px] font-bold shrink-0 flex items-center gap-1" style={{ color: '#ea580c' }}>
                    +{script.heat} &#x1F525;
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
                <span className="text-[20px] font-bold flex items-center gap-1" style={{ color: '#ea580c' }}>
                  12 &#x1F525;
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
