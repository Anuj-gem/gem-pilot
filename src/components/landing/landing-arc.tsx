// LandingArc — the four-step story rendered as a horizontal row.
// Post → Get peer reviews → Build your profile → Get noticed.
//
// Anuj 2026-04-30 v0.11.0. The arc is the whole pitch in one
// picture: every visitor sees what GEM does for them as a writer
// before they decide whether to scroll the rest of the page.

import { FileText, Sparkles, Send, MessageCircle } from 'lucide-react'

const STEPS = [
  {
    icon: FileText,
    title: 'Upload',
    sub: 'Drop your screenplay. PDF, any length.',
  },
  {
    icon: Sparkles,
    title: 'Get evaluated',
    sub: 'A structured report covering story, characters, packaging, budget, and what it would take to make. Under a minute.',
  },
  {
    icon: Send,
    title: ‘Request consideration’,
    sub: "Put your scripts in front of producers, managers, and agents. They read your full evaluation — not just a logline.",
  },
  {
    icon: MessageCircle,
    title: ‘Get feedback’,
    sub: "Hear back with real notes — what worked, what needs work, and whether they want to see more from you.",
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
            From upload to consideration.
          </h2>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0 m-0">
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
                  <span className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)]">
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
