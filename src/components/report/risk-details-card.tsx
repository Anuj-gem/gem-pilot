// Project Complexity — producer-facing complexity cards.
//
// Selznick-4 v6 (2026-04-28): renamed from "Project Risks" to "Project
// Complexity" so the framing reads as forward-looking ("smooth sailing or
// a complicated shoot — what to plan for") rather than a flaw audit. UI
// maps low|medium|high to Smooth / Manageable / Complex.
//
// Selznick-4 v7 (2026-04-28, second pass): each card now owns the slice
// of `production_reality` data that belongs to it — Production card holds
// locations + technical, Cast card holds the cast facts, Clearance card
// holds rights_flags + content rating. Tap a card to unfold the raw
// reference details. The standalone "Production planning details"
// section is gone — its content is now distributed inside the cards
// where it actually belongs.
import type {
  RiskDetails,
  RiskDetailCard as RiskDetailCardType,
  ProductionReality,
} from '@/types'
import { Section } from './v5-components'

interface Props {
  data: RiskDetails
  /** Production planning data — used to populate the per-card unfold.
   *  When absent (very old evals), cards just show the AI note without
   *  the raw reference panel beneath. */
  production?: ProductionReality | null
}

const LEVEL_LABEL: Record<RiskDetailCardType['level'], string> = {
  low: 'Smooth',
  medium: 'Manageable',
  high: 'Complex',
}

export function RiskDetailsSection({ data, production }: Props) {
  return (
    <Section
      label="Project Complexity"
      subtitle="Smooth sailing or a complicated shoot — what to plan for on production, cast, and clearance. Tap any card for the raw production details."
      summary={`Production ${LEVEL_LABEL[data.budget?.level ?? 'medium']} · Cast ${LEVEL_LABEL[data.casting?.level ?? 'medium']} · Clearance ${LEVEL_LABEL[data.development?.level ?? 'medium']}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ComplexityCard
          title="Production"
          axis={data.budget}
          details={
            production ? <ProductionDetails production={production} /> : null
          }
        />
        <ComplexityCard
          title="Cast"
          axis={data.casting}
          details={production ? <CastDetails production={production} /> : null}
        />
        <ComplexityCard
          title="Clearance"
          axis={data.development}
          details={
            production ? <ClearanceDetails production={production} /> : null
          }
        />
      </div>
    </Section>
  )
}

function ComplexityCard({
  title,
  axis,
  details,
}: {
  title: string
  axis: RiskDetailCardType
  details?: React.ReactNode
}) {
  const palette =
    axis.level === 'low'
      ? { border: 'rgba(5,150,105,0.35)', bg: 'rgba(5,150,105,0.05)', text: '#059669' }
      : axis.level === 'medium'
        ? { border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.05)', text: '#d97706' }
        : { border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.05)', text: '#dc2626' }
  return (
    <div
      className="rounded-xl p-5 flex flex-col"
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
      <p className="text-[15.5px] sm:text-[16px] font-medium text-[var(--gem-gray-50)] leading-[1.5] m-0 flex-1">
        {axis.note}
      </p>
      {details && (
        <details className="group mt-4 [&_summary::-webkit-details-marker]:hidden">
          <summary
            className="cursor-pointer list-none flex items-center justify-between gap-2 pt-3 border-t"
            style={{ borderColor: palette.border }}
          >
            <span className="text-[11.5px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] group-hover:text-[var(--gem-gray-300)]">
              Details
            </span>
            <span
              aria-hidden
              className="text-[var(--gem-gray-500)] transition-transform duration-150 group-open:rotate-180 text-[12px]"
            >
              ▾
            </span>
          </summary>
          <div className="pt-3">{details}</div>
        </details>
      )}
    </div>
  )
}

// ─── Per-card unfold panels ─────────────────────────────────────────

function FactRow({ k, v }: { k: string; v: string | number | null | undefined }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-3 text-[13.5px] py-1">
      <span className="text-[var(--gem-gray-500)] flex-shrink-0">{k}</span>
      <span className="text-[var(--gem-gray-100)] text-right font-medium">
        {String(v)}
      </span>
    </div>
  )
}

function ProductionDetails({ production }: { production: ProductionReality }) {
  const loc = production.locations
  const tech = production.technical
  const ier = loc?.interior_exterior_ratio ?? loc?.interior_exterior_mix
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] m-0 mb-1.5">
        Locations & Scale
      </p>
      <div className="mb-3">
        <FactRow k="Distinct" v={loc?.distinct_count} />
        <FactRow k="Int / Ext" v={ier} />
        <FactRow k="Era" v={loc?.period_or_contemporary} />
        {loc?.expensive_flags?.length ? (
          <FactRow k="Notable" v={loc.expensive_flags.join(', ')} />
        ) : null}
      </div>
      <p className="text-[10.5px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] m-0 mb-1.5">
        Technical
      </p>
      <div>
        <FactRow
          k="VFX"
          v={
            (tech?.vfx_level ?? '') +
            (tech?.vfx_details ? ` — ${tech.vfx_details}` : '')
          }
        />
        <FactRow k="Stunts" v={tech?.stunts_level ?? tech?.stunts} />
        {tech?.sfx_needs && <FactRow k="SFX" v={tech.sfx_needs} />}
        {tech?.night_shoots && <FactRow k="Night shoots" v={tech.night_shoots} />}
        {tech?.animals && <FactRow k="Animals" v="Yes" />}
      </div>
    </div>
  )
}

function CastDetails({ production }: { production: ProductionReality }) {
  const cast = production.cast
  return (
    <div>
      <FactRow k="Speaking roles" v={cast?.speaking_roles} />
      <FactRow k="Leads" v={cast?.leads} />
      {(cast?.series_regulars ?? 0) > 0 && (
        <FactRow k="Series regulars" v={cast?.series_regulars} />
      )}
      {cast?.child_actors && <FactRow k="Child actors" v="Yes" />}
      {cast?.casting_challenges?.length ? (
        <FactRow k="Casting" v={cast.casting_challenges.join(', ')} />
      ) : null}
    </div>
  )
}

function ClearanceDetails({ production }: { production: ProductionReality }) {
  const platform = production.platform_fit
  const rights = production.rights_flags ?? []
  return (
    <div>
      {platform && (
        <div className="mb-3">
          <FactRow k="Lane" v={platform.recommended_lane} />
          <FactRow k="Content" v={platform.content_level} />
        </div>
      )}
      {rights.length > 0 ? (
        <>
          <p className="text-[10.5px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] m-0 mb-1.5">
            Rights & Clearance
          </p>
          <ul className="space-y-1.5 list-none p-0 m-0">
            {rights.map((r, i) => {
              const text =
                typeof r === 'string' ? r : `${r.type}: ${r.detail}`
              return (
                <li
                  key={i}
                  className="flex gap-2 text-[13.5px] text-[var(--gem-gray-100)] leading-snug"
                >
                  <span
                    className="text-[var(--gem-gold)] flex-shrink-0"
                    aria-hidden
                  >
                    •
                  </span>
                  <span>{text}</span>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="text-[13px] italic text-[var(--gem-gray-500)] m-0 mt-2">
          No clearance flags on the script.
        </p>
      )}
    </div>
  )
}
