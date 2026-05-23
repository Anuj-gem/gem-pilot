// Project Complexity — producer-facing complexity cards.
//
// Selznick-4 v6 (2026-04-28): renamed from "Project Risks" to "Project
// Complexity" so the framing reads forward-looking ("smooth sailing or a
// complicated shoot — what to plan for") rather than a flaw audit. UI
// maps low|medium|high to Smooth / Manageable / Complex.
//
// Selznick-4 v7 (2026-04-28): each card owns the slice of
// `production_reality` that belongs to it — Production card holds
// locations + technical, Cast card holds the cast facts. The standalone
// "Production planning details" section is gone.
//
// Selznick-4 v8 (2026-04-28): Clearance card removed. The model kept
// drifting into creative-musing notes ("the show's long-term identity
// will depend on..." / "needs disciplined episode architecture") despite
// three rounds of fence-building. Rather than fight it, we drop the card
// entirely. The underlying rights_flags + content rating data is now
// folded into the Production card's Details unfold so producers still
// see clearance signal when it matters. The prompt still emits
// risk_details.development on the eval row for forward compat.
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
      subtitle="Smooth sailing or a complicated shoot — what to plan for on production and casting. Tap any card for the raw production details."
      summary={`Production ${LEVEL_LABEL[data.budget?.level ?? 'medium']} · Cast ${LEVEL_LABEL[data.casting?.level ?? 'medium']}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
  // Anuj 2026-04-28: card stays neutral; only the small pill carries
  // the color. Pill text is black on the tinted backgrounds — no
  // amber/yellow text undertones. Backgrounds: green-100, yellow-100,
  // red-100.
  const pill =
    axis.level === 'low'
      ? { bg: 'rgba(16,185,129,0.15)', fg: '#6ee7b7', border: 'rgba(16,185,129,0.4)' }
      : axis.level === 'medium'
        ? { bg: 'rgba(250,204,21,0.15)', fg: '#fde68a', border: 'rgba(250,204,21,0.4)' }
        : { bg: 'rgba(239,68,68,0.15)', fg: '#fca5a5', border: 'rgba(239,68,68,0.4)' }
  const palette = {
    border: 'var(--gem-gray-700)',
  }
  return (
    <div
      className="rounded-xl p-5 flex flex-col"
      style={{ border: `1px solid ${palette.border}`, background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-500)] m-0">
          {title}
        </p>
        <span
          className="text-[10.5px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full"
          style={{
            color: pill.fg,
            background: pill.bg,
            border: `1px solid ${pill.border}`,
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
  const platform = production.platform_fit
  const rights = production.rights_flags ?? []
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
      <div className="mb-3">
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
      {(platform?.content_level || rights.length > 0) && (
        <>
          <p className="text-[10.5px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] m-0 mb-1.5">
            Rights & Clearance
          </p>
          <div className="mb-1">
            {platform?.content_level && (
              <FactRow k="Content rating" v={platform.content_level} />
            )}
          </div>
          {rights.length > 0 ? (
            <ul className="space-y-1.5 list-none p-0 m-0 mt-1.5">
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
          ) : (
            <p className="text-[12.5px] italic text-[var(--gem-gray-500)] m-0 mt-1.5">
              No clearance flags on the script.
            </p>
          )}
        </>
      )}
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

// ─── Plain production facts (replaces complexity cards) ────────────

/**
 * Flat list of production facts without the Smooth/Manageable/Complex
 * pill system. Shows the AI note from each risk axis as a paragraph,
 * then the raw production facts beneath.
 */
export function ProductionFactsSection({ data, production }: Props) {
  return (
    <Section label="Production Reality">
      <div className="space-y-5">
        {/* Production note */}
        {data.budget?.note && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
              Production
            </p>
            <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0 max-w-[62ch]">
              {data.budget.note}
            </p>
            {production && (
              <div className="mt-3">
                <ProductionDetails production={production} />
              </div>
            )}
          </div>
        )}
        {/* Cast note */}
        {data.casting?.note && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
              Cast
            </p>
            <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0 max-w-[62ch]">
              {data.casting.note}
            </p>
            {production && (
              <div className="mt-3">
                <CastDetails production={production} />
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
