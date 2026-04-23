// Step 1 of the guided submit flow.
//
// Two format cards (Feature film / Series). Tapping a card selects it and
// auto-advances after a 500ms beat — fast enough to feel snappy, slow enough
// to register the selection state. No Continue button on this step (the beat
// does the work). Anuj wants to keep the existing two-format set; adding TV
// Pilot / Short later only requires updating FORMATS below.
'use client'

import { useEffect, useState } from 'react'
import { Film, Tv, Check } from 'lucide-react'

export type DeclaredFormat = 'Feature film' | 'Series'

const FORMATS: {
  id: DeclaredFormat
  label: string
  caption: string
  Icon: typeof Film
}[] = [
  {
    id: 'Feature film',
    label: 'Feature film',
    caption: 'Single screenplay, 90–180 pages',
    Icon: Film,
  },
  {
    id: 'Series',
    label: 'Series',
    caption: 'Pilot or longer-form TV',
    Icon: Tv,
  },
]

export function FormatStep({
  initial,
  onSelect,
}: {
  initial?: DeclaredFormat | null
  /** Called after the 500ms beat following a selection. */
  onSelect: (format: DeclaredFormat) => void
}) {
  const [selected, setSelected] = useState<DeclaredFormat | null>(initial ?? null)

  useEffect(() => {
    if (!selected) return
    const t = setTimeout(() => onSelect(selected), 500)
    return () => clearTimeout(t)
  }, [selected, onSelect])

  return (
    <div className="max-w-[520px] mx-auto pb-12">
      <h2 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)] m-0 mb-2">
        What are you writing?
      </h2>
      <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.5] m-0 mb-7">
        We tune the read to your format.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FORMATS.map(({ id, label, caption, Icon }) => {
          const isSelected = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              aria-pressed={isSelected}
              className="text-left rounded-2xl p-5 sm:p-5 transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(124,58,237,0.08)] active:scale-[0.98] relative"
              style={{
                border: isSelected
                  ? '2px solid var(--gem-accent)'
                  : '1px solid var(--gem-gray-700)',
                background: isSelected
                  ? 'rgba(124,58,237,0.04)'
                  : 'var(--gem-black)',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl grid place-items-center mb-3"
                style={{
                  background: isSelected
                    ? 'rgba(124,58,237,0.10)'
                    : 'var(--gem-gray-800)',
                  color: isSelected ? 'var(--gem-accent)' : 'var(--gem-gray-300)',
                }}
              >
                <Icon size={22} />
              </div>
              <p className="text-[16px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1 leading-tight">
                {label}
              </p>
              <p className="text-[13px] text-[var(--gem-gray-400)] m-0 leading-snug">
                {caption}
              </p>
              {isSelected && (
                <span
                  aria-hidden
                  className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full grid place-items-center"
                  style={{ background: 'var(--gem-accent)', color: '#fff' }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-center text-[12px] text-[var(--gem-gray-500)] mt-7 m-0">
        Takes 60 seconds. First read is on us.
      </p>
    </div>
  )
}
