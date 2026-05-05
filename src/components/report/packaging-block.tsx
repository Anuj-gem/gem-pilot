// Packaging — producer-facing packaging block.
//
// Selznick-4 v5 (2026-04-28): collapsed to three compact cards rendered
// horizontally on desktop and stacked vertically on mobile. Each card
// shows a one-line teaser by default; tap to unfold the detail beneath.
// Lane Fit was dropped — its `types_of_buyers` chips ("character-first
// showrunners with crime world credibility" etc.) read as filler that's
// derivable from the genre tag and Hit Thesis, so it earned no real
// estate. Comp Set was dropped earlier (data still on the eval row).
//
// What remains:
//   - Audience  (who this is for)
//   - Budget Tier  (what it'd cost — feature total or series per-ep)
//   - IP / Franchise Potential  (does this extend?)
import type { Packaging } from '@/types'
import { Section } from './v5-components'

interface Props {
  data: Packaging
}

export function PackagingSection({ data }: Props) {
  return (
    <Section
      label="Packaging"
      subtitle="How a producer would frame this project for a buyer — audience and budget tier at a glance."
      summary="Audience · Budget tier"
    >
      {/* IP / Franchise Potential card hidden from the live UI 2026-04-28
          (Anuj). The model's binary "Standalone vs Franchise" read is too
          incendiary for marginal value — most great scripts read as
          standalone on a single-script eval, but writers see that and
          interpret it as a market knock. The prompt still emits
          `ip_potential` so the data stays on the eval row; resurrect the
          card from git history if we ever surface this signal again. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AudienceCard target={data.audience_target} />
        <BudgetTierCard tier={data.budget_tier} />
      </div>
    </Section>
  )
}

// CompactCard — the compact horizontal card shell used for all three
// packaging slots. Tap-to-expand via native <details>; chevron rotates on
// open. Uppercase eyebrow + a single bold teaser line stays visible at
// rest, expanded body unfolds beneath.
function CompactCard({
  eyebrow,
  teaser,
  teaserMonoNum = false,
  children,
}: {
  eyebrow: string
  /** A single short string OR a small node (e.g. styled tier + amount). */
  teaser: React.ReactNode
  /** Apply tabular-nums to the teaser line — used by the budget card. */
  teaserMonoNum?: boolean
  /** Expanded body. Hidden until the card is tapped open. */
  children: React.ReactNode
}) {
  return (
    <details
      className="group rounded-xl overflow-hidden h-full [&_summary::-webkit-details-marker]:hidden"
      style={{
        border: '1px solid var(--gem-gray-700)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <summary className="cursor-pointer list-none p-4 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0">
            {eyebrow}
          </p>
          <span
            aria-hidden
            className="text-[var(--gem-gray-500)] transition-transform duration-150 group-open:rotate-180 text-[12px] leading-none mt-0.5"
          >
            ▾
          </span>
        </div>
        <div
          className={`text-[15px] sm:text-[15.5px] font-semibold text-[var(--gem-gray-50)] leading-snug ${teaserMonoNum ? 'tabular-nums' : ''}`}
        >
          {teaser}
        </div>
      </summary>
      <div className="px-4 pb-4 pt-1 border-t border-[var(--gem-gray-800)] mt-1">
        <div className="pt-3">{children}</div>
      </div>
    </details>
  )
}

function AudienceCard({ target }: { target: Packaging['audience_target'] }) {
  return (
    <CompactCard eyebrow="Audience" teaser={target.primary_audience}>
      {target.demographics && (
        <p className="text-[14px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-3">
          {target.demographics}
        </p>
      )}
      {target.quadrants?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {target.quadrants.map((q, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
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
    </CompactCard>
  )
}

function BudgetTierCard({ tier }: { tier: Packaging['budget_tier'] }) {
  // Series evals (Selznick 3.8+) emit per_episode + season_total. Feature
  // evals just have `range`. Teaser shows tier + the most useful single
  // amount (per-episode for series, range for features). Detail panel
  // unfolds the rest plus any note.
  const isSeries = !!(tier.per_episode || tier.season_total)
  const headlineAmount = isSeries
    ? tier.per_episode
      ? `${tier.per_episode}/ep`
      : tier.season_total
    : tier.range
  return (
    <CompactCard
      eyebrow="Budget Tier"
      teaserMonoNum
      teaser={
        <span className="flex items-baseline gap-2 flex-wrap">
          <span className="capitalize" style={{ color: 'var(--gem-gold)' }}>
            {tier.tier}
          </span>
          {headlineAmount && (
            <span className="text-[var(--gem-gray-100)]">{headlineAmount}</span>
          )}
        </span>
      }
    >
      {isSeries && (
        <div className="flex flex-col gap-1 mb-3">
          {tier.per_episode && (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)]">
                Per episode
              </span>
              <span className="text-[14px] font-semibold text-[var(--gem-gray-100)] tabular-nums">
                {tier.per_episode}
              </span>
            </div>
          )}
          {tier.season_total && (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)]">
                Season total
              </span>
              <span className="text-[14px] font-semibold text-[var(--gem-gray-100)] tabular-nums">
                {tier.season_total}
              </span>
            </div>
          )}
        </div>
      )}
      {!isSeries && tier.range && (
        <div className="flex items-baseline gap-2 flex-wrap mb-3">
          <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)]">
            Total
          </span>
          <span className="text-[14px] font-semibold text-[var(--gem-gray-100)] tabular-nums">
            {tier.range}
          </span>
        </div>
      )}
      {tier.note && (
        <p className="text-[14px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
          {tier.note}
        </p>
      )}
    </CompactCard>
  )
}

function IpPotentialCard({ ip }: { ip: Packaging['ip_potential'] }) {
  if (!ip) return null
  const teaserText = ip.has_potential ? 'Franchise potential' : 'Standalone'
  const teaserColor = ip.has_potential ? '#059669' : 'var(--gem-gray-300)'
  return (
    <CompactCard
      eyebrow="IP / Franchise"
      teaser={<span style={{ color: teaserColor }}>{teaserText}</span>}
    >
      {ip.detail ? (
        <p className="text-[14px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
          {ip.detail}
        </p>
      ) : (
        <p className="text-[13.5px] italic text-[var(--gem-gray-500)] m-0">
          No detail available.
        </p>
      )}
    </CompactCard>
  )
}

// LaneFitCard removed from the live render 2026-04-28 (was producing
// generic filler like "character-first showrunners with crime world
// credibility" that didn't earn its real estate). The prompt no longer
// needs to emit lane_fit in a load-bearing way — kept as part of the
// schema so legacy evals still parse, just unrendered. Resurrect via git
// history if we ever bring it back.
// CompSetCard removed earlier same way (2026-04-28).
