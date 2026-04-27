'use client'

// Compact 3-stat strip — Views / Interested / Emailed. Lives inline on
// each writer dashboard card and producer match card so the engagement
// signal is visible at a glance instead of being buried behind a button.
//
// Writer side: passing `onOpen` makes the strip clickable; the click
// opens the per-producer details sheet. Producer side: omit `onOpen` and
// the strip renders read-only (producers see aggregate counts but no
// per-person breakdown).

import { Eye, Check, Mail, ChevronRight } from 'lucide-react'

interface Props {
  views: number
  interested: number
  emailed: number
  /** When provided, the entire strip becomes a clickable trigger (cursor
   *  pointer, hover style, chevron hint). Used by the writer to open the
   *  full activity sheet. Omit for read-only display (producer side). */
  onOpen?: () => void
  /** Tighter variant — used inside producer match cards where vertical
   *  space is tighter and the strip sits next to the action row. */
  size?: 'default' | 'compact'
}

export function StatsStrip({
  views,
  interested,
  emailed,
  onOpen,
  size = 'default',
}: Props) {
  const isCompact = size === 'compact'
  const isInteractive = !!onOpen

  const inner = (
    <>
      <Stat
        label="Views"
        value={views}
        icon={<Eye size={isCompact ? 11 : 12} />}
        color="var(--gem-gray-400)"
        compact={isCompact}
      />
      <span
        aria-hidden
        className="text-[var(--gem-gray-700)]"
        style={{ fontSize: isCompact ? 11 : 12 }}
      >
        ·
      </span>
      <Stat
        label="Interested"
        value={interested}
        icon={<Check size={isCompact ? 11 : 12} strokeWidth={2.5} />}
        color="#059669"
        compact={isCompact}
      />
      <span
        aria-hidden
        className="text-[var(--gem-gray-700)]"
        style={{ fontSize: isCompact ? 11 : 12 }}
      >
        ·
      </span>
      <Stat
        label="Emailed"
        value={emailed}
        icon={<Mail size={isCompact ? 11 : 12} />}
        color="var(--gem-accent)"
        compact={isCompact}
      />
      {isInteractive && (
        <>
          <span
            aria-hidden
            className="text-[var(--gem-gray-700)] mx-0.5"
            style={{ fontSize: isCompact ? 11 : 12 }}
          >
            ·
          </span>
          <span
            className="text-[var(--gem-gray-400)] group-hover:text-[var(--gem-gold)] transition-colors inline-flex items-center gap-0.5 font-medium"
            style={{ fontSize: isCompact ? 11 : 12 }}
          >
            view details
            <ChevronRight size={isCompact ? 11 : 12} />
          </span>
        </>
      )}
    </>
  )

  const baseClasses = `inline-flex items-center gap-1.5 ${
    isCompact ? 'text-[11px]' : 'text-[12px]'
  }`

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`${baseClasses} group cursor-pointer transition-colors hover:text-[var(--gem-gold)]`}
        aria-label="Open industry activity details"
        title="See who viewed + engaged"
      >
        {inner}
      </button>
    )
  }

  return <span className={baseClasses}>{inner}</span>
}

function Stat({
  label,
  value,
  icon,
  color,
  compact,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  compact: boolean
}) {
  return (
    <span
      className="inline-flex items-baseline gap-1 tabular-nums"
      title={`${value} ${label.toLowerCase()}`}
    >
      <span
        aria-hidden
        className="inline-flex items-center self-center"
        style={{ color }}
      >
        {icon}
      </span>
      <span
        className="font-bold leading-none"
        style={{
          color: value > 0 ? color : 'var(--gem-gray-500)',
          fontSize: compact ? 12 : 13,
        }}
      >
        {value}
      </span>
      <span
        className="text-[var(--gem-gray-500)] leading-none"
        style={{ fontSize: compact ? 10 : 11 }}
      >
        {label.toLowerCase()}
      </span>
    </span>
  )
}
