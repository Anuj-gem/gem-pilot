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
import {
  scoreDesignation,
  DESIGNATION_STYLE,
  DESIGNATION_COPY,
  type Designation,
} from '@/lib/designation'

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
  publicViewer = false,
  writerName,
  portfolioRank,
  portfolioTotal,
  commercialScore,
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
  /** Non-owner viewing a public report. Tease the depth that exists, blur
   *  ALL of it (including the primary lever the owner gets crisp), swap the
   *  "private to you" banner for a "reach out to the writer" CTA, and skip
   *  the upgrade CTA entirely (it doesn't apply to non-owners). */
  publicViewer?: boolean
  /** Used in the public-viewer banner copy when present. */
  writerName?: string | null
  portfolioRank?: number | null
  portfolioTotal?: number
  commercialScore?: number | null
  craftNote?: string | null
}) {
  // Public viewers see everything blurred — force locked on regardless of
  // the owner's subscription state (a Pro writer's report would otherwise
  // render unlocked to producers, which leaks the entire dev tab).
  const effectivelyLocked = locked || publicViewer
  // Derive the designation locally from the score so callers don't need to
  // keep score + bucket flags in sync.
  const designation: Designation | null = scoreDesignation(commercialScore)
  // Public viewers get a heavier blur (14px) — 5px was readable enough
  // that a producer could clean-off the score "68.3" or a "Medium" risk
  // pill just by squinting. Owner-locked state keeps the softer 5px so
  // the writer can still see the shape of their own report.
  const blurStyle: React.CSSProperties = effectivelyLocked
    ? {
        filter: publicViewer ? 'blur(14px)' : 'blur(5px)',
        userSelect: 'none' as const,
      }
    : {}

  const risk = production?.risk_rubric
  const hasPortfolioRank =
    portfolioRank !== null && portfolioRank !== undefined && (portfolioTotal ?? 0) > 0

  // Commercial score renders whenever we have a v5.2 eval — shown even when
  // the report is locked, because the score is the writer's signal and the
  // reason they'll pay. Rest of Details stays blurred below.
  const hasCommercialScore =
    typeof commercialScore === 'number' && !Number.isNaN(commercialScore)
  // Narrative Breakdown also renders when locked — we render a ?/10 variant
  // with blurred bars and reasoning, so the writer sees the structure of the
  // section they'd be unlocking (enticement over concealment).
  const hasNarrativeBreakdown =
    !!scores && Object.values(scores).some((s) => typeof s?.score === 'number')

  return (
    <>
      {/* Top banner — swaps based on viewer:
          - Public viewer (producer/rep on a shared link): tease that this
            tab exists, blur it all, point them at the writer to unlock.
          - Owner / admin: standard "private to you" privacy note. */}
      {publicViewer ? (
        <div
          className="flex items-start gap-3 p-5 rounded-xl mb-6"
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
            <strong className="text-[var(--gem-gray-50)] font-semibold">
              Private to the writer.
            </strong>{' '}
            The full development tab — score, production breakdown, dimension
            scoring, and dev priorities — stays with{' '}
            {writerName ? writerName : 'the writer'}. Reach out to them
            directly for access.
          </p>
        </div>
      ) : (
        showPrivacyNote && (
          <div
            className="flex items-start gap-3 p-5 rounded-xl mb-6"
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
        )
      )}

      {/* Commercial Potential Score — the hero of Details when present (v5.2+).
          Weighted composite (0-100); three-tier designation:
            • ≥75 "GEM Select" (also the public Discover filter)
            • 50–74 "Very Promising"
            • <50 "Shows Potential"
          "Very Promising" and "Shows Potential" are private to the writer — only
          GEM Select is ever surfaced on public Discover.
          We never show the underlying dimension weights — just the composite. */}
      {hasCommercialScore && designation && (
        publicViewer ? (
          <div style={blurStyle} aria-hidden>
            <CommercialScoreCard score={commercialScore!} designation={designation} />
          </div>
        ) : (
          <CommercialScoreCard score={commercialScore!} designation={designation} />
        )
      )}

      {/* GEM Rank — only shown on legacy (pre-v5.2) evals where there's no Commercial Score card.
          Once the score is back, portfolio rank is less meaningful and makes the header cluttered. */}
      {hasPortfolioRank && !hasCommercialScore && (
        <GemRankCard rank={portfolioRank!} total={portfolioTotal!} />
      )}

      {locked && !publicViewer && evaluationId && (
        <div className="mb-8">
          <InlineUpgradeCTA
            evaluationId={evaluationId}
            label="Unlock your full Details — production reality, dimension reasoning, and development notes."
          />
        </div>
      )}

      {/* At a Glance — three quick-read risk pills (cost / cast / content).
          The header stays crisp on locked reports so the writer sees *what*
          they're paying for; the pills themselves blur as a group. */}
      {risk && (
        <div className="mb-10">
          <h2 className="text-[16px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-50)] mb-4">
            At a Glance
          </h2>
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            style={effectivelyLocked ? { ...blurStyle, pointerEvents: 'none' } : undefined}
            aria-hidden={effectivelyLocked ? true : undefined}
          >
            <RiskPill label="Production Cost" axis={risk.cost} />
            <RiskPill label="Cast Complexity" axis={risk.cast} />
            <RiskPill label="Content Maturity" axis={risk.content} />
          </div>
        </div>
      )}

      {/* Craft note — v5.2 addition. Single highest-leverage craft observation,
          rendered as a callout above Development Priorities so it doesn't get
          lost inside the collapsibles. Locked reports keep the label crisp and
          blur the note itself — we want the writer to see this card exists. */}
      {craftNote && (
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
          <p
            className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0"
            style={blurStyle}
          >
            {craftNote}
          </p>
        </div>
      )}

      {/* Development Priorities — considerations as collapsible cards.
          v5.2: items with is_primary_lever get the red-accent primary treatment
          and auto-expand so the sharpest note is visible on first load.
          Locked state: primary lever stays fully readable (title + body) so the
          writer sees one sharp note in full. Non-primary cards blur the TITLE
          (the anchor, e.g. "Kelly's job-search run") but leave the body crisp
          — the body is analytical, the title is the cheat-code for a rewrite. */}
      {considerations.length > 0 && (
        <Section
          label="Development Priorities"
          subtitle="The sharpest places to push on the next pass — positioning notes and directions a producer or collaborator might lean on in conversation."
        >
          <div className="space-y-3">
            {considerations.map((c, i) => {
              const isPrimary = c.is_primary_lever === true
              return (
                <Collapsible
                  key={i}
                  title={c.area}
                  primary={isPrimary}
                  titleBlurred={effectivelyLocked && (publicViewer || !isPrimary)}
                >
                  <p
                    className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0"
                    style={publicViewer ? blurStyle : undefined}
                    aria-hidden={publicViewer ? true : undefined}
                  >
                    {c.detail}
                  </p>
                </Collapsible>
              )
            })}
          </div>
        </Section>
      )}

      {/* Production Planning Details — collapsible cards.
          Locked state: collapsible titles + meta rows (e.g. "VFX none · Stunts
          minor") stay crisp so the writer sees the shape of the section; the
          actual fact bodies blur as a group. */}
      {production && (
        <Section
          label="Production Planning Details"
          subtitle="Everything the script tells us about how it would actually get made."
        >
          <div className="space-y-3">
            <Collapsible
              title="Cast"
              meta={`${production.cast?.leads ?? 0} lead${production.cast?.leads === 1 ? '' : 's'} · ${production.cast?.speaking_roles ?? 0} speaking roles${production.cast?.child_actors ? ' · child actors' : ''}`}
              metaBlurred={publicViewer}
            >
              <div style={effectivelyLocked ? blurStyle : undefined} aria-hidden={effectivelyLocked ? true : undefined}>
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
              </div>
            </Collapsible>

            <Collapsible
              title="Locations & Scale"
              meta={`${production.locations?.distinct_count ?? 0} distinct${production.locations?.period_or_contemporary ? ` · ${production.locations.period_or_contemporary}` : ''}`}
              metaBlurred={publicViewer}
            >
              <div style={effectivelyLocked ? blurStyle : undefined} aria-hidden={effectivelyLocked ? true : undefined}>
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
              </div>
            </Collapsible>

            <Collapsible
              title="Technical"
              meta={`VFX ${production.technical?.vfx_level ?? '—'} · Stunts ${production.technical?.stunts_level ?? production.technical?.stunts ?? '—'}`}
              metaBlurred={publicViewer}
            >
              <div style={effectivelyLocked ? blurStyle : undefined} aria-hidden={effectivelyLocked ? true : undefined}>
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
              </div>
            </Collapsible>

            <Collapsible
              title="Platform & Content"
              meta={production.platform_fit?.recommended_lane}
              metaBlurred={publicViewer}
            >
              <div style={effectivelyLocked ? blurStyle : undefined} aria-hidden={effectivelyLocked ? true : undefined}>
                <FactList>
                  <Fact k="Lane" v={production.platform_fit?.recommended_lane} />
                  <Fact k="Content" v={production.platform_fit?.content_level} />
                  {production.platform_fit?.series_engine_or_release_model && (
                    <Fact k="Model" v={production.platform_fit.series_engine_or_release_model} />
                  )}
                </FactList>
              </div>
            </Collapsible>

            {production.rights_flags?.length ? (
              <Collapsible
                title="Rights & Clearance"
                meta={`${production.rights_flags.length} item${production.rights_flags.length === 1 ? '' : 's'} to flag`}
                metaBlurred={publicViewer}
              >
                <ul
                  className="space-y-3 list-none p-0 m-0"
                  style={effectivelyLocked ? blurStyle : undefined}
                  aria-hidden={effectivelyLocked ? true : undefined}
                >
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
                  locked={effectivelyLocked}
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
// DESIGNATION_COPY now lives in @/lib/designation so the mini-score card on
// the Pitch tab can share the same per-tier framing.

function CommercialScoreCard({
  score,
  designation,
}: {
  score: number
  designation: Designation
}) {
  const style = DESIGNATION_STYLE[designation]
  const copy = DESIGNATION_COPY[designation]
  const pct = Math.max(0, Math.min(100, score))
  return (
    <section
      className="relative rounded-2xl p-7 sm:p-8 mb-10 overflow-hidden"
      style={{ border: `1px solid ${style.border}`, background: style.bg }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <p
          className="text-[12px] uppercase tracking-[0.22em] font-bold m-0"
          style={{ color: style.text }}
        >
          Commercial Potential Score
        </p>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: style.pillBg, border: `1px solid ${style.pillBorder}` }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: style.dot }}
          />
          <span
            className="text-[12px] uppercase tracking-[0.18em] font-bold"
            style={{ color: style.text }}
          >
            {style.label}
          </span>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="text-[72px] sm:text-[88px] font-bold tabular-nums leading-none"
          style={{ color: style.text }}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-[20px] text-[var(--gem-gray-400)] font-medium">/ 100</span>
      </div>
      <div className="h-2 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--gem-gray-800)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.dot }} />
      </div>
      <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-100)] leading-[1.55] m-0 max-w-[60ch]">
        {copy.message}
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
  locked = false,
}: {
  label: string
  score: number
  reasoning: string
  locked?: boolean
}) {
  const p = scoreBandPalette(score)
  const pct = Math.max(0, Math.min(100, score * 10))
  const blurStyle: React.CSSProperties = { filter: 'blur(10px)', userSelect: 'none' }
  return (
    <div className="rounded-xl p-5" style={{ border: `1px solid var(--gem-gray-700)`, background: '#fff' }}>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-[17px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
          {label}
        </p>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          {locked ? (
            <span
              className="text-[26px] font-bold tabular-nums text-[var(--gem-gray-500)]"
              style={{ filter: 'blur(3px)', userSelect: 'none' }}
              aria-hidden
            >
              ?
            </span>
          ) : (
            <span className="text-[26px] font-bold tabular-nums" style={{ color: p.text }}>
              {score}
            </span>
          )}
          <span className="text-[13px] text-[var(--gem-gray-400)]">/ 10</span>
        </div>
      </div>
      <div
        className="h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: 'var(--gem-gray-800)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            // Neutral gray fill when locked so the bar width doesn't leak the
            // tier (red/amber/green bands would give away the score band).
            background: locked ? 'var(--gem-gray-500)' : p.fill,
            filter: locked ? 'blur(4px)' : undefined,
          }}
        />
      </div>
      {reasoning && (
        <p
          className="text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0"
          style={locked ? blurStyle : undefined}
        >
          {reasoning}
        </p>
      )}
    </div>
  )
}
