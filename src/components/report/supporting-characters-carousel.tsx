// Supporting-character carousel — 2026-04-28.
//
// Lead characters get the full <Collapsible> card treatment (one per row,
// expanded with hook + actor-want copy). Supporting characters were getting
// the same treatment which made the section read as a 12-row brick. This
// carousel collapses Supporting into a horizontally-scrolling strip of
// compact cards: name + role pill + 1-line teaser pulled from the hook.
// Tap a card to expand its full detail in a panel directly below the strip.
//
// Mobile: native horizontal scroll (snap to card). Desktop: chevron arrow
// buttons paginate left/right by one card-width.
'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface SupportingCharacter {
  name: string
  role_type: string
  demographics: string
  hook: string
  why_actor_wants_this: string
}

interface Props {
  characters: SupportingCharacter[]
  /** Apply paywall blur to the body content of the expanded panel. */
  blurred?: boolean
}

// Card stride matches the new compact card (200px + 12px gap). Tweak if
// the card width changes.
const CARD_STRIDE = 212

export function SupportingCharactersCarousel({ characters, blurred = false }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (!characters || characters.length === 0) return null

  const blurStyle: React.CSSProperties | undefined = blurred
    ? { filter: 'blur(5px)', userSelect: 'none' }
    : undefined

  function scrollByCard(dir: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * CARD_STRIDE, behavior: 'smooth' })
  }

  const active = activeIndex !== null ? characters[activeIndex] : null

  return (
    <div>
      {/* Print-only flat list. The interactive carousel below is hidden
          in print via .gem-no-print, and this list takes over so every
          supporting character + their full hook/actor-want copy lands
          in the PDF. Anuj 2026-04-28. */}
      <div className="hidden print:block space-y-4">
        {characters.map((c, i) => (
          <div
            key={`print-${i}`}
            className="rounded-lg p-4 break-inside-avoid"
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <p className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
              {c.name}
            </p>
            <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--gem-gray-500)] m-0 mt-1 mb-2">
              {c.role_type} · {c.demographics}
            </p>
            <p className="text-[14px] text-[var(--gem-gray-100)] leading-[1.55] m-0">
              {c.hook}
            </p>
          </div>
        ))}
      </div>

      {/* Interactive carousel — screen only. */}
      <div className="gem-no-print relative">
        {/* Scroll arrows — desktop only. Hidden on mobile (use swipe). */}
        <button
          type="button"
          aria-label="Scroll supporting cast left"
          onClick={() => scrollByCard(-1)}
          className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full shadow-md transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Scroll supporting cast right"
          onClick={() => scrollByCard(1)}
          className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full shadow-md transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
        >
          <ChevronRight size={16} />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {characters.map((c, i) => {
            const isActive = activeIndex === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(isActive ? null : i)}
                className="flex-shrink-0 snap-start w-[200px] text-left rounded-xl px-4 py-3 transition-colors"
                style={{
                  border: `1px solid ${isActive ? 'var(--gem-gold)' : 'rgba(255,255,255,0.1)'}`,
                  background: isActive ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.05)',
                }}
              >
                <p
                  className="text-[15px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight mb-1"
                  style={blurStyle}
                >
                  {c.name}
                </p>
                <p
                  className="text-[11.5px] uppercase tracking-[0.12em] font-bold text-[var(--gem-gray-500)] m-0"
                  style={blurStyle}
                >
                  {c.role_type} · {c.demographics}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Expanded detail panel — appears directly below the strip when a
          card is tapped. Hidden in print so we don't duplicate the
          content (the print-only flat list above already renders every
          character expanded). */}
      {active && (
        <div
          className="gem-no-print rounded-xl p-5 mt-4"
          style={{
            border: '1px solid var(--gem-gold)',
            background: 'rgba(212,175,55,0.04)',
          }}
        >
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p
                className="text-[18px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight"
                style={blurStyle}
              >
                {active.name}
              </p>
              <p
                className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] m-0 mt-1"
                style={blurStyle}
              >
                {active.role_type} · {active.demographics}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] flex-shrink-0"
              aria-label="Close"
            >
              Close ✕
            </button>
          </div>
          <p
            className="text-[15.5px] text-[var(--gem-gray-100)] leading-[1.6] m-0"
            style={blurStyle}
          >
            {active.hook}
          </p>
        </div>
      )}
    </div>
  )
}
