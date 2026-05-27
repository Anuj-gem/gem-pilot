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
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
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
          style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
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
              <span className="text-[14px] font-bold" style={{ color: '#ffffff' }}>
                $20/month
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gemTags.map((tag) => (
                <span
                  key={tag.label}
                  className="rounded-lg text-[13px] font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.12))',
                    border: '1px solid rgba(124,58,237,0.35)',
                    color: '#c4b5fd',
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
              <span className="text-[18px] font-extrabold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                BlackList, ISA, etc.
              </span>
              <span className="text-[14px] font-bold" style={{ color: '#f87171' }}>
                $150+/month*
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {otherTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg text-[13px] font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)',
                    padding: '7px 13px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
          *Based on 5 evaluations/month at published rates.
        </p>
      </div>
    </section>
  )
}
