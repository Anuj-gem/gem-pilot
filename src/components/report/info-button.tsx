// InfoButton — small ⓘ circle next to section titles.
// Click toggles an inline explanation paragraph below the title row.
// Click again (or tap ×) to dismiss. Replaces always-visible subtitle
// text across all report sections.
//
// Usage: wrap the title + InfoButton in a container. The button renders
// inline (for the circle), and the expanded text drops below via a
// sibling div.
'use client'

import { useState } from 'react'

/**
 * Renders an ⓘ circle button inline. When clicked, shows `text` in a
 * paragraph below the current element. Parent must allow the expanded
 * content to flow beneath (e.g. use a flex-wrap or block container).
 */
export function InfoButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide explanation' : 'Show explanation'}
        className="inline-flex items-center justify-center flex-shrink-0 rounded-full transition-colors"
        style={{
          width: 20,
          height: 20,
          fontSize: 12,
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1,
          color: open ? 'var(--gem-gray-50)' : 'var(--gem-gray-400)',
          background: open
            ? 'rgba(124,58,237,0.25)'
            : 'rgba(255,255,255,0.08)',
          border: `1px solid ${open ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.12)'}`,
          cursor: 'pointer',
        }}
      >
        i
      </button>
    </span>
  )
}

/**
 * Renders the expanded explanation text. Place this as a sibling AFTER
 * the title row that contains InfoButton. It reads the same `open`
 * state — but since React can't share state across siblings without
 * lifting, we use a compound pattern: InfoSection wraps both the title
 * row and the expansion.
 */
export function InfoSection({
  text,
  children,
}: {
  /** The explanation text shown when the ⓘ button is clicked. */
  text: string
  /** The title row (h2 + InfoButton circle). */
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        {children}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Hide explanation' : 'Show explanation'}
          className="inline-flex items-center justify-center flex-shrink-0 rounded-full transition-colors"
          style={{
            width: 20,
            height: 20,
            fontSize: 12,
            fontWeight: 700,
            fontStyle: 'italic',
            lineHeight: 1,
            color: open ? 'var(--gem-gray-50)' : 'var(--gem-gray-400)',
            background: open
              ? 'rgba(124,58,237,0.25)'
              : 'rgba(255,255,255,0.08)',
            border: `1px solid ${open ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.12)'}`,
            cursor: 'pointer',
          }}
        >
          i
        </button>
      </div>
      {open && (
        <p className="text-[13.5px] sm:text-[14px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-3 max-w-[62ch]">
          {text}
        </p>
      )}
    </>
  )
}
