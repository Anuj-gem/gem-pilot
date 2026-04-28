// Project Complexity — producer-facing complexity cards.
//
// Selznick-4 v6 (2026-04-28): renamed from "Project Risks" to "Project
// Complexity" so the framing reads as forward-looking ("smooth sailing or
// a complicated shoot — what to plan for") rather than a flaw audit. The
// underlying enum on the eval row is still low|medium|high so legacy
// evals render unchanged; the UI maps those to Smooth / Manageable /
// Complex labels. Card hierarchy was flipped — the actionable note leads
// at 16px, the level pill is demoted to a small corner badge.
import type { RiskDetails, RiskDetailCard as RiskDetailCardType } from '@/types'
import { Section } from './v5-components'

interface Props {
  data: RiskDetails
}

const LEVEL_LABEL: Record<RiskDetailCardType['level'], string> = {
  low: 'Smooth',
  medium: 'Manageable',
  high: 'Complex',
}

export function RiskDetailsSection({ data }: Props) {
  return (
    <Section
      label="Project Complexity"
      subtitle="Smooth sailing or a complicated shoot — what to plan for on cost, cast, and clearance."
      summary={`Cost ${LEVEL_LABEL[data.budget?.level ?? 'medium']} · Cast ${LEVEL_LABEL[data.casting?.level ?? 'medium']} · Clearance ${LEVEL_LABEL[data.development?.level ?? 'medium']}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ComplexityCard title="Cost" axis={data.budget} />
        <ComplexityCard title="Cast" axis={data.casting} />
        <ComplexityCard title="Clearance" axis={data.development} />
      </div>
    </Section>
  )
}

function ComplexityCard({
  title,
  axis,
}: {
  title: string
  axis: RiskDetailCardType
}) {
  const palette =
    axis.level === 'low'
      ? { border: 'rgba(5,150,105,0.35)', bg: 'rgba(5,150,105,0.05)', text: '#059669' }
      : axis.level === 'medium'
        ? { border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.05)', text: '#d97706' }
        : { border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.05)', text: '#dc2626' }
  return (
    <div
      className="rounded-xl p-5"
      style={{ border: `1px solid ${palette.border}`, background: palette.bg }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-500)] m-0">
          {title}
        </p>
        <span
          className="text-[10.5px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full"
          style={{
            color: palette.text,
            background: '#fff',
            border: `1px solid ${palette.border}`,
          }}
        >
          {LEVEL_LABEL[axis.level]}
        </span>
      </div>
      <p className="text-[15.5px] sm:text-[16px] font-medium text-[var(--gem-gray-50)] leading-[1.5] m-0">
        {axis.note}
      </p>
    </div>
  )
}
