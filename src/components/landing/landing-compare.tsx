// LandingCompare — v2. Dark bg contrast fix.
'use client'

export function LandingCompare() {
  const gemTags = [
    'Unlimited evaluations',
    '60-second turnaround',
    'Heat that builds',
    'Partner matching',
    'Full portfolio',
    'Opportunities come to you',
  ]

  const otherTags = [
    'Pay per script',
    'Weeks to hear back',
    'No portfolio',
    'No heat building',
    'Upload and hope',
  ]

  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="mx-auto text-center" style={{ maxWidth: 800 }}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: '#d4a843' }}
        >
          A different kind of platform
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] mb-10"
          style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
        >
          Nothing like this has existed for writers.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
          {/* GEM column */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)',
            }}
          >
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[18px] font-extrabold" style={{ color: '#c4b5fd' }}>
                GEM
              </span>
              <span className="text-[14px] font-bold" style={{ color: '#ffffff' }}>
                $20/month
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gemTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg text-[13px] font-semibold"
                  style={{
                    background: 'rgba(168,85,247,0.12)',
                    border: '1px solid rgba(168,85,247,0.25)',
                    color: '#d8b4fe',
                    padding: '7px 13px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Others column */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[18px] font-extrabold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                BlackList, ISA, etc.
              </span>
              <span className="text-[14px] font-bold" style={{ color: '#fca5a5' }}>
                $150+/mo*
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {otherTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg text-[13px] font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)',
                    padding: '7px 13px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              *Based on 5 evaluations/month at published rates.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
