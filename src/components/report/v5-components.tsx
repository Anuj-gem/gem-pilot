// v5 shared building blocks — used by the live /report/[id] page.
//
// Selznick-4 v4 (2026-04-25): top-level Section is now collapsed by default.
// The page renders almost empty until the reader clicks a row open. Each
// section's summary is a single line — title on the left, optional count/
// summary text on the right ("7 reasons", "3 leads · 5 supporting"), with a
// chevron. The previous always-open layout is available via `defaultOpen`
// for callers (e.g. producer-side detail page) that want eyes on by default.
import { ChevronDown } from 'lucide-react'

export function Section({
  label,
  subtitle,
  summary,
  defaultOpen = false,
  children,
}: {
  label: string
  /** Optional verbose intro text shown when the section is OPEN. Kept out
   *  of the collapsed summary row to keep that row scannable. */
  subtitle?: string
  /** Short one-line count/summary shown in the collapsed row, right-aligned.
   *  e.g. "7 reasons", "3 leads · 5 supporting", "Indie · Contemporary · Low VFX". */
  summary?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      {...(defaultOpen ? { open: true } : {})}
      className="group rounded-xl mb-3 transition-colors hover:border-[var(--gem-gray-600)] [&_summary::-webkit-details-marker]:hidden"
      style={{
        border: '1px solid var(--gem-gray-700)',
        background: '#fff',
      }}
    >
      <summary className="flex items-center gap-4 cursor-pointer list-none px-5 sm:px-6 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] sm:text-[16px] font-semibold text-[var(--gem-gray-50)] leading-tight m-0">
            {label}
          </p>
          {summary && (
            <p className="text-[12.5px] sm:text-[13px] text-[var(--gem-gray-400)] leading-snug m-0 mt-1">
              {summary}
            </p>
          )}
        </div>
        <ChevronDown
          size={18}
          className="flex-shrink-0 text-[var(--gem-gray-500)] transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div
        className="px-5 sm:px-6 pb-6 pt-2"
        style={{ borderTop: '1px solid var(--gem-gray-700)' }}
      >
        {subtitle && (
          <p className="text-[14.5px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.55] mt-4 mb-5 max-w-[62ch] m-0">
            {subtitle}
          </p>
        )}
        <div>{children}</div>
      </div>
    </details>
  )
}

export function Collapsible({
  title,
  meta,
  number,
  accent,
  primary = false,
  defaultOpen = false,
  titleBlurred = false,
  metaBlurred = false,
  children,
}: {
  title: string
  meta?: string
  number?: number
  accent?: string
  primary?: boolean
  defaultOpen?: boolean
  /** Blur just the title text while leaving the card chrome + chevron crisp.
   *  Used on locked reports to tease structure without revealing the anchor
   *  (e.g. "Kelly's job-search run") the writer would otherwise use to
   *  iterate a rewrite without paying. */
  titleBlurred?: boolean
  /** Blur the meta summary line (e.g. "5 leads · 20 speaking roles") —
   *  used for public viewers of production-planning rows so the facts
   *  don't leak. */
  metaBlurred?: boolean
  children: React.ReactNode
}) {
  // Primary-lever variant: red accent + auto-open so the sharpest note isn't hidden behind a click.
  const borderColor = primary ? 'rgba(220,38,38,0.5)' : 'var(--gem-gray-700)'
  const bg = primary ? 'linear-gradient(135deg, rgba(220,38,38,0.04), #fff 60%)' : '#fff'
  return (
    <details
      {...(defaultOpen || primary ? { open: true } : {})}
      className="group rounded-xl overflow-hidden transition-colors hover:border-[var(--gem-gray-600)] [&_summary::-webkit-details-marker]:hidden"
      style={{ border: `1px solid ${borderColor}`, background: bg }}
    >
      <summary className="flex items-start gap-4 cursor-pointer list-none px-6 py-5">
        {number !== undefined && (
          <span
            className="flex-shrink-0 text-[16px] font-bold tabular-nums mt-0.5"
            style={{ color: accent || 'var(--gem-gold)' }}
          >
            {String(number).padStart(2, '0')}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {primary && (
            <div className="mb-1">
              <span
                className="text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded"
                style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}
              >
                Primary lever
              </span>
            </div>
          )}
          <p
            className="text-[19px] sm:text-[20px] font-semibold text-[var(--gem-gray-50)] leading-[1.35] m-0"
            style={titleBlurred ? { filter: 'blur(10px)', userSelect: 'none' } : undefined}
          >
            {title}
          </p>
          {meta && (
            <p
              className="text-[14px] text-[var(--gem-gray-400)] mt-1.5 m-0 leading-snug"
              style={metaBlurred ? { filter: 'blur(10px)', userSelect: 'none' } : undefined}
            >
              {meta}
            </p>
          )}
        </div>
        <ChevronDown
          size={22}
          className="flex-shrink-0 mt-1 text-[var(--gem-gray-400)] transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="px-6 pb-6 pt-1 border-t border-[var(--gem-gray-700)] mt-1">
        <div className="pt-5">{children}</div>
      </div>
    </details>
  )
}

export function FactList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2.5">{children}</div>
}

export function Fact({ k, v }: { k: string; v: string | number | null | undefined }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-4 text-[16px] py-0.5">
      <span className="text-[var(--gem-gray-400)] flex-shrink-0">{k}</span>
      <span className="text-[var(--gem-gray-100)] text-right font-medium">{String(v)}</span>
    </div>
  )
}

export interface RiskAxis {
  level: 'low' | 'medium' | 'high'
  note: string
}

export function RiskPill({ label, axis }: { label: string; axis?: RiskAxis }) {
  if (!axis) return null
  const palette =
    axis.level === 'low'
      ? { border: 'rgba(5,150,105,0.35)', bg: 'rgba(5,150,105,0.07)', text: '#059669' }
      : axis.level === 'medium'
        ? { border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.07)', text: '#d97706' }
        : { border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.07)', text: '#dc2626' }
  return (
    <div
      className="rounded-xl p-5"
      style={{ border: `1px solid ${palette.border}`, background: palette.bg }}
    >
      <p className="text-[12px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
        {label}
      </p>
      <p className="text-[22px] font-bold capitalize m-0 mb-2.5" style={{ color: palette.text }}>
        {axis.level}
      </p>
      <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.5] m-0">
        {axis.note}
      </p>
    </div>
  )
}
