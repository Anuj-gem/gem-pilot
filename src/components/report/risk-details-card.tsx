// Risk Details — v5.4 producer-facing risk cards.
// Three cards (Budget, Casting, Development) each with a level badge and a
// note. Mirrors the visual language of `RiskPill` in v5-components.tsx but
// stacks them under a single Section header with explicit per-card titles.
import type { RiskDetails, RiskDetailCard as RiskDetailCardType } from '@/types'
import { Section } from './v5-components'

interface Props {
  data: RiskDetails
}

export function RiskDetailsSection({ data }: Props) {
  return (
    <Section
      label="Project Risks"
      subtitle="Where the producer-side risk lives — budget, casting, and development. Each card calls out the level and the underlying reason."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RiskCard title="Budget Risk" axis={data.budget} />
        <RiskCard title="Casting Risk" axis={data.casting} />
        <RiskCard title="Development Risk" axis={data.development} />
      </div>
    </Section>
  )
}

function RiskCard({ title, axis }: { title: string; axis: RiskDetailCardType }) {
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
        {title}
      </p>
      <p
        className="text-[26px] font-bold uppercase tracking-wide m-0 mb-2.5"
        style={{ color: palette.text }}
      >
        {axis.level}
      </p>
      <p className="text-[14px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
        {axis.note}
      </p>
    </div>
  )
}
