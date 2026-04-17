// Details tab — owner-private view. v5 layout: GEM Rank card, At a Glance
// risk rubric, Development Priorities, Production Planning Details (all as
// collapsibles), and Narrative Analysis Details (ten lenses, no scores shown).
import { Lock } from 'lucide-react'
import { DIMENSION_META, type DimensionId, type GEMEvaluation } from '@/types'
import { InlineUpgradeCTA } from '@/components/report/inline-upgrade-cta'
import { GemRankCard } from '@/components/report/gem-rank-card'
import {
  Section,
  Collapsible,
  FactList,
  Fact,
  RiskPill,
} from '@/components/report/v5-components'

// ─── Back-compat exports (used by /sample/[slug]) ──────────────────
export function SectionHeader({ label }: { label: string }) {
  return (
    <>
      <h2 className="text-xs uppercase tracking-[0.18em] font-bold text-[var(--gem-white)] mb-1.5">
        {label}
      </h2>
      <div className="w-10 h-0.5 mb-5 rounded" style={{ background: 'var(--gem-gold)' }} />
    </>
  )
}

export function FactCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--gem-gray-700)] rounded-xl p-4 bg-white">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-500)] mb-2.5 m-0">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// Legacy Fact row kept under a different name so the sample page can migrate
// over time. New code should use Fact from '@/components/report/v5-components'.
export function LegacyFact({
  k,
  v,
  blur,
}: {
  k: string
  v: string | number | null | undefined
  blur?: boolean
}) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-3 text-[13px] py-0.5">
      <span className="text-[var(--gem-gray-500)]">{k}</span>
      <span
        className="text-[var(--gem-white)] text-right font-medium"
        style={blur ? { filter: 'blur(5px)', userSelect: 'none' } : undefined}
      >
        {String(v)}
      </span>
    </div>
  )
}

export function LeadCharacterCard({
  c,
}: {
  c: { name: string; role_type: string; demographics: string; hook: string; why_actor_wants_this: string }
}) {
  return (
    <div className="border border-[var(--gem-gray-700)] rounded-xl p-6 bg-white">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <p className="text-xl font-semibold text-[var(--gem-white)] tracking-tight m-0">
          {c.name}
        </p>
        <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--gem-gray-500)]">
          {c.role_type} · {c.demographics}
        </span>
      </div>
      <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed mb-4">{c.hook}</p>
      <div
        className="rounded-lg p-4"
        style={{ background: 'rgba(5, 150, 105, 0.06)', border: '1px solid rgba(5, 150, 105, 0.18)' }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5"
          style={{ color: '#059669' }}
        >
          Why an actor would want this part
        </p>
        <p className="text-[13px] text-[var(--gem-gray-200)] leading-relaxed m-0">
          {c.why_actor_wants_this}
        </p>
      </div>
    </div>
  )
}

export function LockedLeadCharacterCard({
  c,
}: {
  c: { name: string; role_type: string; demographics: string; hook: string; why_actor_wants_this: string }
}) {
  const blurStyle: React.CSSProperties = { filter: 'blur(5px)', userSelect: 'none' as const }
  return (
    <div className="border border-[var(--gem-gray-700)] rounded-xl p-6 bg-white">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <p className="text-xl font-semibold text-[var(--gem-white)] tracking-tight m-0">
          {c.name}
        </p>
        <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--gem-gray-500)]">
          {c.role_type} · {c.demographics}
        </span>
      </div>
      <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed mb-4" style={blurStyle}>
        {c.hook}
      </p>
      <div
        className="rounded-lg p-4"
        style={{ background: 'rgba(5, 150, 105, 0.06)', border: '1px solid rgba(5, 150, 105, 0.18)' }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5"
          style={{ color: '#059669' }}
        >
          Why an actor would want this part
        </p>
        <p
          className="text-[13px] text-[var(--gem-gray-200)] leading-relaxed m-0"
          style={blurStyle}
        >
          {c.why_actor_wants_this}
        </p>
      </div>
    </div>
  )
}

// ─── Main Details view (v5 layout) ─────────────────────────────────
export function DetailsView({
  scores,
  production,
  considerations,
  locked,
  evaluationId,
  showPrivacyNote = true,
  portfolioRank,
  portfolioTotal,
}: {
  scores: Record<string, { score: number; reasoning: string }>
  production: GEMEvaluation['production_reality']
  considerations: { area: string; detail: string; source?: string }[]
  overallScore?: number | null
  showScores?: boolean
  locked: boolean
  evaluationId?: string
  showPrivacyNote?: boolean
  portfolioRank?: number | null
  portfolioTotal?: number
}) {
  const blurStyle: React.CSSProperties = locked
    ? { filter: 'blur(5px)', userSelect: 'none' as const }
    : {}

  const risk = production?.risk_rubric
  const hasPortfolioRank =
    portfolioRank !== null && portfolioRank !== undefined && (portfolioTotal ?? 0) > 0

  return (
    <>
      {showPrivacyNote && (
        <div
          className="flex items-start gap-3 p-5 rounded-xl mb-10"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full grid place-items-center text-white text-sm"
            style={{ background: 'var(--gem-accent)' }}
          >
            <Lock size={16} />
          </div>
          <p className="text-[15px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
            <strong className="text-[var(--gem-gray-50)] font-semibold">Private to you.</strong>{' '}
            This section isn&apos;t shared when your report is circulated — it&apos;s yours for reference.
          </p>
        </div>
      )}

      {/* GEM Rank — at the top of Details, where the score used to live */}
      {hasPortfolioRank && (
        <GemRankCard rank={portfolioRank!} total={portfolioTotal!} />
      )}

      {locked && evaluationId && (
        <div className="mb-8">
          <InlineUpgradeCTA
            evaluationId={evaluationId}
            label="Unlock your full Details"
            subtext="Production reality, dimension reasoning, and development notes."
          />
        </div>
      )}

      {/* At a Glance — three quick-read risk pills (cost / cast / content) */}
      {risk && (
        <div className="mb-10">
          <h2 className="text-[16px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-50)] mb-4">
            At a Glance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RiskPill label="Production Cost" axis={risk.cost} />
            <RiskPill label="Cast Complexity" axis={risk.cast} />
            <RiskPill label="Content Maturity" axis={risk.content} />
          </div>
        </div>
      )}

      {/* Development Priorities — considerations as collapsible cards */}
      {considerations.length > 0 && (
        <Section
          label="Development Priorities"
          subtitle="The sharpest places to push on the next pass — positioning notes and directions a producer or collaborator might lean on in conversation."
        >
          <div className="space-y-3">
            {considerations.map((c, i) => (
              <Collapsible key={i} title={c.area}>
                <p
                  className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                  style={blurStyle}
                >
                  {c.detail}
                </p>
              </Collapsible>
            ))}
          </div>
        </Section>
      )}

      {/* Production Planning Details — collapsible cards */}
      {production && (
        <Section
          label="Production Planning Details"
          subtitle="Everything the script tells us about how it would actually get made."
        >
          <div className="space-y-3">
            <Collapsible
              title="Cast"
              meta={`${production.cast?.leads ?? 0} lead${production.cast?.leads === 1 ? '' : 's'} · ${production.cast?.speaking_roles ?? 0} speaking roles${production.cast?.child_actors ? ' · child actors' : ''}`}
            >
              <FactList>
                <Fact k="Speaking roles" v={production.cast?.speaking_roles} />
                <Fact k="Leads" v={production.cast?.leads} />
                {(production.cast?.series_regulars ?? 0) > 0 && (
                  <Fact k="Series regulars" v={production.cast?.series_regulars} />
                )}
                {production.cast?.child_actors && <Fact k="Child actors" v="Yes" />}
                {production.cast?.casting_challenges?.length ? (
                  <Fact k="Casting" v={production.cast.casting_challenges.join(', ')} />
                ) : null}
              </FactList>
            </Collapsible>

            <Collapsible
              title="Locations & Scale"
              meta={`${production.locations?.distinct_count ?? 0} distinct${production.locations?.period_or_contemporary ? ` · ${production.locations.period_or_contemporary}` : ''}`}
            >
              <FactList>
                <Fact k="Distinct locations" v={production.locations?.distinct_count} />
                <Fact
                  k="Int / Ext"
                  v={
                    production.locations?.interior_exterior_ratio ??
                    production.locations?.interior_exterior_mix
                  }
                />
                <Fact k="Era" v={production.locations?.period_or_contemporary} />
                {production.locations?.expensive_flags?.length ? (
                  <Fact k="Notable" v={production.locations.expensive_flags.join(', ')} />
                ) : null}
              </FactList>
            </Collapsible>

            <Collapsible
              title="Technical"
              meta={`VFX ${production.technical?.vfx_level ?? '—'} · Stunts ${production.technical?.stunts_level ?? production.technical?.stunts ?? '—'}`}
            >
              <FactList>
                <Fact
                  k="VFX"
                  v={
                    (production.technical?.vfx_level ?? '') +
                    (production.technical?.vfx_details ? ` — ${production.technical.vfx_details}` : '')
                  }
                />
                <Fact
                  k="Stunts"
                  v={production.technical?.stunts_level ?? production.technical?.stunts}
                />
                {production.technical?.sfx_needs && (
                  <Fact k="SFX" v={production.technical.sfx_needs} />
                )}
                {production.technical?.night_shoots && (
                  <Fact k="Night shoots" v={production.technical.night_shoots} />
                )}
                {production.technical?.animals && <Fact k="Animals" v="Yes" />}
              </FactList>
            </Collapsible>

            <Collapsible
              title="Platform & Content"
              meta={production.platform_fit?.recommended_lane}
            >
              <FactList>
                <Fact k="Lane" v={production.platform_fit?.recommended_lane} />
                <Fact k="Content" v={production.platform_fit?.content_level} />
                {production.platform_fit?.series_engine_or_release_model && (
                  <Fact k="Model" v={production.platform_fit.series_engine_or_release_model} />
                )}
              </FactList>
            </Collapsible>

            {production.rights_flags?.length ? (
              <Collapsible
                title="Rights & Clearance"
                meta={`${production.rights_flags.length} item${production.rights_flags.length === 1 ? '' : 's'} to flag`}
              >
                <ul className="space-y-3 list-none p-0 m-0">
                  {production.rights_flags.map((r, i) => {
                    const text =
                      typeof r === 'string'
                        ? r
                        : `${r.type}: ${r.detail}`
                    return (
                      <li
                        key={i}
                        className="flex gap-3 text-[16px] text-[var(--gem-gray-100)] leading-[1.55]"
                      >
                        <span className="text-[var(--gem-gold)] flex-shrink-0">•</span>
                        <span>{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </Collapsible>
            ) : null}
          </div>
        </Section>
      )}

      {/* Narrative Analysis Details — 10 dimension lenses, no scores shown */}
      <Section
        label="Narrative Analysis Details"
        subtitle="Ten lenses on what the script is doing. Tap to expand."
      >
        <div className="space-y-3">
          {(Object.keys(DIMENSION_META) as DimensionId[]).map((dimId) => {
            const s = scores?.[dimId]
            if (!s?.reasoning) return null
            const meta = DIMENSION_META[dimId]
            return (
              <Collapsible key={dimId} title={meta.label}>
                <p
                  className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                  style={blurStyle}
                >
                  {s.reasoning}
                </p>
              </Collapsible>
            )
          })}
        </div>
      </Section>
    </>
  )
}
