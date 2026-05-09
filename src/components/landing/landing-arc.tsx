// LandingArc — three-step story.
// Evaluate → GEM Review → Get matched.
//
// v11 — reframed around eval tech + human review + matching.

import { Zap, Eye, Handshake } from 'lucide-react'

const STEPS = [
  {
    icon: Zap,
    title: "Instant evaluation",
    sub: "Upload your script and get a detailed evaluation in under a minute. Powered by Selznick — the most advanced screenplay analysis ever built.",
  },
  {
    icon: Eye,
    title: "The GEM Review",
    sub: "Our team does an in-depth review of your entire portfolio. A real person reads your work, assesses your range, and identifies specific matches.",
  },
  {
    icon: Handshake,
    title: "Get matched",
    sub: "We connect work that fits what our partners are looking for — reps, producers, financiers, and development executives.",
  },
]

export function LandingArc() {
  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-[640px] mx-auto mb-12">
          <p
            className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
            style={{ color: 'var(--gem-gold)' }}
          >
            How it works
          </p>
          <h2
            className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Three steps to real access.
          </h2>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 list-none p-0 m-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <li
                key={s.title}
                className="relative rounded-2xl p-5 sm:p-6 flex flex-col"
                style={{
                  background: '#fff',
                  border: '1px solid var(--gem-gray-700)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-white"
                    style={{ background: 'var(--gem-accent)' }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)]">
                    Step {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3
                  className="text-[18px] font-bold m-0 mb-1.5 leading-tight text-[var(--gem-gray-50)]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {s.title}
                </h3>
                <p className="text-[13.5px] text-[var(--gem-gray-300)] m-0 leading-snug">
                  {s.sub}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
