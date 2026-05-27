'use client'

export function LandingPrivacy() {
  const cards = [
    {
      icon: '🔒',
      title: 'Private by default',
      desc: 'Your script is never visible to anyone unless you explicitly choose to publish it. Period.',
    },
    {
      icon: '🛡️',
      title: 'Vetted partners only',
      desc: 'Your work is never publicly accessible. The only people who can see your scripts are vetted industry partners — individually verified reps and producers.',
    },
    {
      icon: '🗑️',
      title: 'Delete anytime',
      desc: 'Remove your script, your account, all your data — instantly. No retention, no questions, no hoops.',
    },
  ]

  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="mx-auto text-center" style={{ maxWidth: 800 }}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          Your work, your control
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] mb-4"
          style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
        >
          Your script stays private until you say otherwise.
        </h2>
        <p
          className="text-[15px] mx-auto mb-10"
          style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 520, lineHeight: 1.6 }}
        >
          We built GEM the way a technology company should protect creative work. Not the way legacy platforms do it.
        </p>

        <div
          className="grid gap-4 text-left"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl p-5"
              style={{ background: '#ffffff', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="flex items-center justify-center mb-3"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid rgba(124,58,237,0.12)',
                  fontSize: 18,
                }}
              >
                {card.icon}
              </div>
              <h3 className="text-[15px] font-bold mb-1.5" style={{ color: '#1c1917' }}>
                {card.title}
              </h3>
              <p className="text-[13px] m-0" style={{ color: '#78716c', lineHeight: 1.5 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
