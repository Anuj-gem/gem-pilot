// Packaging — v5.4 producer-facing packaging block.
// Five sub-blocks: comp set, audience target, budget tier, lane fit,
// IP / franchise potential. Each rendered as a labeled card to keep the
// page's existing visual rhythm.
import type { Packaging } from '@/types'
import { Section } from './v5-components'

interface Props {
  data: Packaging
}

export function PackagingSection({ data }: Props) {
  return (
    <Section
      label="Packaging"
      subtitle="How a producer would frame this project for a buyer — comps, audience, budget tier, lane, and franchise upside."
    >
      <div className="space-y-3">
        <CompSetCard comps={data.comp_set} />
        <AudienceCard target={data.audience_target} />
        <BudgetTierCard tier={data.budget_tier} />
        <LaneFitCard lane={data.lane_fit} />
        <IpPotentialCard ip={data.ip_potential} />
      </div>
    </Section>
  )
}

function SubCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--gem-gray-700)', background: 'rgba(255,255,255,0.02)' }}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-500)] m-0 mb-3">
        {label}
      </p>
      {children}
    </div>
  )
}

function CompSetCard({ comps }: { comps: Packaging['comp_set'] }) {
  if (!comps?.length) return null
  return (
    <SubCard label="Comp Set">
      <div className="space-y-3">
        {comps.map((c, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 pb-3 last:pb-0 border-b last:border-0"
            style={{ borderColor: 'var(--gem-gray-700)' }}
          >
            <div className="sm:w-48 flex-shrink-0 mb-1 sm:mb-0">
              <span className="text-[16px] font-semibold text-[var(--gem-gray-50)]">
                {c.title}
              </span>
              {c.year != null && (
                <span className="text-[14px] text-[var(--gem-gray-400)] ml-2">
                  ({c.year})
                </span>
              )}
            </div>
            <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.55] m-0 flex-1">
              {c.why_it_comps}
            </p>
          </div>
        ))}
      </div>
    </SubCard>
  )
}

function AudienceCard({ target }: { target: Packaging['audience_target'] }) {
  return (
    <SubCard label="Audience Target">
      <p className="text-[18px] font-semibold text-[var(--gem-gray-50)] m-0 mb-2">
        {target.primary_audience}
      </p>
      {target.demographics && (
        <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-3">
          {target.demographics}
        </p>
      )}
      {target.quadrants?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {target.quadrants.map((q, i) => (
            <span
              key={i}
              className="text-[12px] px-2.5 py-1 rounded-full font-medium"
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.25)',
                color: 'var(--gem-accent)',
              }}
            >
              {q}
            </span>
          ))}
        </div>
      )}
    </SubCard>
  )
}

function BudgetTierCard({ tier }: { tier: Packaging['budget_tier'] }) {
  return (
    <SubCard label="Budget Tier">
      <div className="flex items-baseline gap-3 flex-wrap mb-2">
        <span
          className="text-[20px] font-bold capitalize"
          style={{ color: 'var(--gem-gold)' }}
        >
          {tier.tier}
        </span>
        {tier.range && (
          <span className="text-[16px] font-semibold text-[var(--gem-gray-100)] tabular-nums">
            {tier.range}
          </span>
        )}
      </div>
      {tier.note && (
        <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
          {tier.note}
        </p>
      )}
    </SubCard>
  )
}

function LaneFitCard({ lane }: { lane: Packaging['lane_fit'] }) {
  return (
    <SubCard label="Lane Fit">
      <p className="text-[18px] font-semibold text-[var(--gem-gray-50)] m-0 mb-3">
        {lane.lane}
      </p>
      {lane.types_of_buyers?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {lane.types_of_buyers.map((b, i) => (
            <span
              key={i}
              className="text-[12px] px-2.5 py-1 rounded-full font-medium"
              style={{
                background: 'rgba(5,150,105,0.08)',
                border: '1px solid rgba(5,150,105,0.25)',
                color: '#059669',
              }}
            >
              {b}
            </span>
          ))}
        </div>
      )}
      {lane.detail && (
        <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
          {lane.detail}
        </p>
      )}
    </SubCard>
  )
}

function IpPotentialCard({ ip }: { ip: Packaging['ip_potential'] }) {
  const palette = ip.has_potential
    ? { border: 'rgba(5,150,105,0.35)', bg: 'rgba(5,150,105,0.07)', text: '#059669', label: 'Yes' }
    : { border: 'var(--gem-gray-700)', bg: 'rgba(0,0,0,0.02)', text: 'var(--gem-gray-500)', label: 'Limited' }
  return (
    <SubCard label="IP / Franchise Potential">
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="text-[12px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded"
          style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.text }}
        >
          {palette.label}
        </span>
      </div>
      {ip.detail && (
        <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
          {ip.detail}
        </p>
      )}
    </SubCard>
  )
}
