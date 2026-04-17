// v5 shared building blocks — used by the live /report/[id] page.
// Mirrors the preview-v5 admin layout: collapsible cards, big click targets,
// progressive disclosure. Every discrete item is its own <details> element.
import { ChevronDown } from 'lucide-react'

export function Section({
  label,
  subtitle,
  children,
}: {
  label: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-14">
      <div className="w-12 h-0.5 mb-3 rounded" style={{ background: 'var(--gem-gold)' }} />
      <h2 className="text-[16px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-50)] m-0 mb-3">
        {label}
      </h2>
      {subtitle && (
        <p className="text-[17px] text-[var(--gem-gray-200)] leading-[1.6] mb-6 max-w-[62ch]">
          {subtitle}
        </p>
      )}
      {children}
    </section>
  )
}

export function Collapsible({
  title,
  meta,
  number,
  accent,
  defaultOpen = false,
  children,
}: {
  title: string
  meta?: string
  number?: number
  accent?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      {...(defaultOpen ? { open: true } : {})}
      className="group border border-[var(--gem-gray-700)] rounded-xl bg-white overflow-hidden transition-colors hover:border-[var(--gem-gray-600)] [&_summary::-webkit-details-marker]:hidden"
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
          <p className="text-[19px] sm:text-[20px] font-semibold text-[var(--gem-gray-50)] leading-[1.35] m-0">
            {title}
          </p>
          {meta && (
            <p className="text-[14px] text-[var(--gem-gray-400)] mt-1.5 m-0 leading-snug">
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
