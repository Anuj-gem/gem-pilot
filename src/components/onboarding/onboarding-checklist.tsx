'use client'

// OnboardingChecklist — vertical timeline that runs alongside both the
// /submit and /onboarding flows. Each item is one of:
//   - 'done'    → solid filled circle with check
//   - 'current' → ring + small inner dot, label bold
//   - 'pending' → hollow circle, label muted
//
// The checklist is a reading aid, not a navigator. We don't link items —
// we just want the user to see "here's where I am, here's what's left,
// here's where I land at the end" so the flow doesn't feel infinite.
//
// Anuj 2026-04-30 v0.10.6.

import { Check } from 'lucide-react'

export type ChecklistState = 'done' | 'current' | 'pending'
export interface ChecklistItem {
  label: string
  state: ChecklistState
  /** Tiny line under the label (e.g. "60 seconds", "skippable"). Optional. */
  hint?: string
}

interface Props {
  items: ChecklistItem[]
  /** Optional eyebrow shown above the list — e.g. "Your report" or "Get set up". */
  title?: string
  /** 'vertical' (default) renders the full timeline. 'compact' renders a
   *  horizontal pill strip — used on mobile so the progress doesn't get
   *  scrolled off the page on tall forms. */
  variant?: 'vertical' | 'compact'
}

export function OnboardingChecklist({ items, title, variant = 'vertical' }: Props) {
  if (variant === 'compact') {
    const current = items.find((i) => i.state === 'current')
    return (
      <div className="text-[var(--gem-gray-200)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              aria-hidden
              className="block flex-1 h-1 rounded-full transition-colors"
              style={{
                background:
                  item.state === 'done' || item.state === 'current'
                    ? 'var(--gem-accent)'
                    : 'var(--gem-gray-700)',
                opacity: item.state === 'pending' ? 0.6 : 1,
              }}
            />
          ))}
        </div>
        <p className="m-0 text-[11px] uppercase tracking-[0.16em] font-bold text-[var(--gem-gray-500)]">
          {title ? `${title} · ` : ''}
          <span className="text-[var(--gem-gray-200)]">{current?.label ?? ''}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="text-[var(--gem-gray-200)]">
      {title && (
        <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-500)] m-0 mb-4">
          {title}
        </p>
      )}
      <ol className="m-0 p-0 list-none space-y-3">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={i} className="relative flex items-start gap-3">
              {/* Dot column */}
              <div className="relative shrink-0 w-5 flex flex-col items-center">
                <Dot state={item.state} />
                {!last && (
                  <span
                    aria-hidden
                    className="block w-px flex-1 mt-1"
                    style={{
                      background: 'var(--gem-gray-700)',
                      minHeight: 22,
                    }}
                  />
                )}
              </div>
              {/* Label column */}
              <div className="flex-1 min-w-0 pb-2">
                <p
                  className={`m-0 leading-tight text-[13.5px] ${
                    item.state === 'pending'
                      ? 'text-[var(--gem-gray-500)]'
                      : 'text-[var(--gem-gray-100)]'
                  } ${item.state === 'current' ? 'font-bold' : 'font-medium'}`}
                >
                  {item.label}
                </p>
                {item.hint && (
                  <p className="m-0 mt-0.5 text-[11.5px] leading-snug text-[var(--gem-gray-500)]">
                    {item.hint}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Dot({ state }: { state: ChecklistState }) {
  if (state === 'done') {
    return (
      <span
        className="block w-5 h-5 rounded-full grid place-items-center"
        style={{
          background: 'var(--gem-accent)',
          color: '#fff',
        }}
      >
        <Check size={12} strokeWidth={3} />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span
        className="block w-5 h-5 rounded-full grid place-items-center"
        style={{
          border: '2px solid var(--gem-accent)',
          background: 'rgba(124,58,237,0.12)',
        }}
      >
        <span
          aria-hidden
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--gem-accent)' }}
        />
      </span>
    )
  }
  return (
    <span
      className="block w-5 h-5 rounded-full"
      style={{
        border: '1.5px solid var(--gem-gray-700)',
        background: 'transparent',
      }}
    />
  )
}
