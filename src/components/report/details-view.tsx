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
  commercialScore,
  isGemSelect,
  craftNote,
}: {
  scores: Record<string, { score: number; reasoning: string }>
  production: GEMEvaluation['production_reality']
  considerations: { area: string; detail: string; source?: string; is_primary_lever?: boolean }[]
  overallScore?: number | null
  showScores?: boolean
  locked: boolean
  evaluationId?: string
  showPrivacyNote?: boolean
  portfolioRank?: number | null
  portfolioTotal?: number
  commercialScore?: number | null
  isGemSelect?: boolean
  craftNote?: string | null
}) {
  const blurStyle: React.CSSProperties = locked
    ? { filter: 'blur(5px)', userSelect: 'none' as const }
    : {}

  const risk = production?.risk_rubric
  const hasPortfolioRank =
    portfolioRank !== null && portfolioRank !== undefined && (portfolioTotal ?? 0) > 0

  // Commercial score renders only when we have a fully-formed v5.2 eval.
  const hasCommercialScore =
    typeof commercialScore === 'number' && !Number.isNaN(commercialScore) && !locked
  const hasNarrativeBreakdown =
    !!scores && Object.values(scores).some((s) => typeof s?.score === 'number') && !locked

  return (
    <>
      {/* Commercial Potential Score — the hero of Details when present (v5.2+).
          Weighted composite (0-100); "GEM Select" at 80+; short variance disclaimer.
          We never show the underlying dimension weights — just the composite. */}
      {hasCommercialScore && (
        <CommercialScoreCard score={commercialScore!} gemSelect={!!isGemSelect} />
      )}

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

      {/* GEM Rank — only shown on legacy (pre-v5.2) evals where there's no Commercial Score card.
          Once the score is back, portfolio rank is less meaningful and makes the header cluttered. */}
      {hasPortfolioRank && !hasCommercialScore && (
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

      {/* Craft note — v5.2 addition. Single highest-leverage craft observation,
          rendered as a callout above Development Priorities so it doesn't get
          lost inside the collapsibles. */}
      {craftNote && !locked && (
        <div
          className="mb-8 rounded-xl p-5"
          style={{
            background: 'rgba(5,150,105,0.07)',
            border: '1px solid rgba(5,150,105,0.25)',
          }}
        >
          <p
            className="text-[12px] uppercase tracking-[0.2em] font-bold mb-2 m-0"
            style={{ color: '#059669' }}
          >
            Craft note
          </p>
          <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
            {craftNote}
          </p>
        </div>
      )}

      {/* Development Priorities — considerations as collapsible cards.
          v5.2: items with is_primary_lever get the red-accent primary treatment
          and auto-expand so the sharpest note is visible on first load. */}
      {considerations.length > 0 && (
        <Section
          label="Development Priorities"
          subtitle="The sharpest places to push on the next pass — positioning notes and directions a producer or collaborator might lean on in conversation."
        >
          <div className="space-y-3">
            {considerations.map((c, i) => (
              <Collapsible key={i} title={c.area} primary={c.is_primary_lever === true}>
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

      {/* Narrative Breakdown (v5.2) — 10 dimension scores + calibrated reasoning.
          Only renders when at least one dim has a numeric score. For legacy evals
          with reasoning but no numeric scores we fall back to the no-score lenses. */}
      {hasNarrativeBreakdown ? (
        <Section
          label="Narrative Breakdown"
          subtitle="How the script reads on each of the ten craft dimensions. Scores are honest; commentary reflects the score, not a pitch of it."
        >
          <div className="space-y-3">
            {(Object.keys(DIMENSION_META) as DimensionId[]).map((dimId) => {
              const s = scores?.[dimId]
              if (typeof s?.score !== 'number') return null
              const meta = DIMENSION_META[dimId]
              return (
                <DimensionRow
                  key={dimId}
                  label={meta.label}
                  score={s.score}
                  reasoning={s.reasoning}
                />
              )
            })}
          </div>
        </Section>
      ) : (
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
      )}
    </>
  )
}

// ─── Commercial Score card (v5.2) ──────────────────────────────────
function CommercialScoreCard({ score, gemSelect }: { score: number; gemSelect: boolean }) {
  // ≥80 gold (GEM Select), 60-79 green, 40-59 amber, <40 red.
  const palette = gemSelect
    ? {
        text: 'var(--gem-gold)',
        border: 'rgba(200,164,92,0.4)',
        bg: 'linear-gradient(135deg, rgba(200,164,92,0.12), rgba(200,164,92,0.03) 70%)',
        bar: 'var(--gem-gold)',
      }
    : score >= 60
      ? { text: '#059669', border: 'rgba(5,150,105,0.30)', bg: 'rgba(5,150,105,0.06)', bar: '#059669' }
      : score >= 40
        ? { text: '#d97706', border: 'rgba(217,119,6,0.30)', bg: 'rgba(217,119,6,0.06)', bar: '#d97706' }
        : { text: '#dc2626', border: 'rgba(220,38,38,0.30)', bg: 'rgba(220,38,38,0.06)', bar: '#dc2626' }
  const pct = Math.max(0, Math.min(100, score))
  return (
    <section
      className="relative rounded-2xl p-7 sm:p-8 mb-10 overflow-hidden"
      style={{ border: `1px solid ${palette.border}`, background: palette.bg }}
    >
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div>
          <p
            className="text-[12px] uppercase tracking-[0.22em] font-bold m-0 mb-2"
            style={{ color: palette.text }}
          >
            Commercial Potential Score
          </p>
          <p className="text-[15px] text-[var(--gem-gray-300)] leading-[1.5] m-0 max-w-[54ch]">
            How we evaluate audience appeal and investment potential relative to the cost of development.
          </p>
        </div>
        {gemSelect && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(200,164,92,0.12)',
              border: '1px solid rgba(200,164,92,0.5)',
            }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--gem-gold)' }}
            />
            <span
              className="text-[12px] uppercase tracking-[0.18em] font-bold"
              style={{ color: 'var(--gem-gold)' }}
            >
              GEM Select
            </span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-5 mb-3">
        <span
          className="text-[72px] sm:text-[88px] font-bold tabular-nums leading-none"
          style={{ color: palette.text }}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-[20px] text-[var(--gem-gray-400)] font-medium">/ 100</span>
      </div>
      <div className="h-2 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--gem-gray-800)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: palette.bar }} />
      </div>
      {gemSelect && (
        <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-4">
          This script lands in the top GEM Select band — the scripts we think are particularly promising.
        </p>
      )}
      <p className="text-[13px] text-[var(--gem-gray-400)] leading-[1.55] m-0">
        A script&apos;s score can shift 5-10 points across different runs — evaluation is probabilistic. The Development Priorities below are the levers you can pull on the next draft to raise it.
      </p>
    </section>
  )
}

// ─── Dimension row (v5.2) ──────────────────────────────────────────
function scoreBandPalette(score: number) {
  if (score >= 8) return { text: '#059669', fill: '#059669' }
  if (score >= 5) return { text: '#d97706', fill: '#d97706' }
  return { text: '#dc2626', fill: '#dc2626' }
}

function DimensionRow({
  label,
  score,
  reasoning,
}: {
  label: string
  score: number
  reasoning: string
}) {
  const p = scoreBandPalette(score)
  const pct = Math.max(0, Math.min(100, score * 10))
  return (
    <div className="rounded-xl p-5" style={{ border: `1px solid var(--gem-gray-700)`, background: '#fff' }}>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
          {label}
        </p>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          <span className="text-[26px] font-bold tabular-nums" style={{ color: p.text }}>
            {score}
          </span>
          <span className="text-[13px] text-[var(--gem-gray-400)]">/ 10</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--gem-gray-800)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.fill }} />
      </div>
      {reasoning && (
        <p className="text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0">
          {reasoning}
        </p>
      )}
    </div>
  )
}
