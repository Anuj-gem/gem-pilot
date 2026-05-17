'use client'

export function LandingCompare() {
  const gemTags = [
    { icon: '◇', label: 'Unlimited evaluations' },
    { icon: '⚡', label: '60-second turnaround' },
    { icon: '🔥', label: 'Reputation that builds' },
    { icon: '💰', label: 'Partner matching' },
    { icon: '📊', label: 'Full writer portfolio' },
    { icon: '🔄', label: 'Unlimited drafts' },
    { icon: '🎯', label: 'Opportunities come to you' },
  ]

  const otherTags = [
    'Pay per script',
    'Weeks to hear back',
    'No portfolio',
    'No reputation building',
    'No partner matching',
    'No platform',
    'Upload and hope',
  ]

  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
    >
      <div className="mx-auto text-center" style={{ maxWidth: 720 }}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          A different kind of platform
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] mb-10"
          style={{ fontFamily: 'Georgia, serif', color: 'var(--gem-gray-50)' }}
        >
          Nothing like this has existed for writers.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
          {/* GEM column */}
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[18px] font-extrabold" style={{ color: 'var(--gem-accent)' }}>
                GEM
              </span>
              <span className="text-[14px] font-bold" style={{ color: 'var(--gem-gray-50)' }}>
                $20/month
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gemTags.map((tag) => (
                <span
                  key={tag.label}
                  className="rounded-lg text-[13px] font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.12))',
                    border: '1px solid rgba(124,58,237,0.18)',
                    color: '#5b21b6',
                    padding: '7px 13px',
                  }}
                >
                  {tag.icon} {tag.label}
                </span>
              ))}
            </div>
          </div>

          {/* Others column */}
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[18px] font-extrabold" style={{ color: '#a8a29e' }}>
                BlackList, ISA, etc.
              </span>
              <span className="text-[14px] font-bold" style={{ color: '#b91c1c' }}>
                $150+/month*
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {otherTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg text-[13px] font-medium"
                  style={{
                    background: '#f5f5f4',
                    border: '1px solid #e7e5e4',
                    color: '#a8a29e',
                    padding: '7px 13px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] mt-6" style={{ color: '#a8a29e' }}>
          *Based on 5 evaluations/month at published rates.
        </p>
      </div>
    </section>
  )
}
