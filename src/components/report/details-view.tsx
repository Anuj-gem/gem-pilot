// Shared Details view used by /report/[id] (writer-private tab) and
// /sample/[slug] (shown openly as part of the sample report, with a disclosure).
import { Lock } from 'lucide-react'
import { DIMENSION_META, type DimensionId, type GEMEvaluation } from '@/types'
import { InlineUpgradeCTA } from '@/components/report/inline-upgrade-cta'

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

export function Fact({
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

// Variants:
//   real report, writer owner, locked  → showPrivacyNote=true, locked=true, showScores=false, evaluationId passed (for upgrade CTA)
//   real report, writer owner, unlocked → showPrivacyNote=true, locked=false, showScores=true
//   sample page                         → showPrivacyNote=false (custom sample banner used instead), locked=false, showScores=true
export function DetailsView({
  scores,
  production,
  considerations,
  overallScore,
  showScores,
  locked,
  evaluationId,
  showPrivacyNote = true,
}: {
  scores: Record<string, { score: number; reasoning: string }>
  production: GEMEvaluation['production_reality']
  considerations: { area: string; detail: string; source?: string }[]
  overallScore: number | null
  showScores: boolean
  locked: boolean
  evaluationId?: string
  showPrivacyNote?: boolean
}) {
  const blurStyle: React.CSSProperties = locked
    ? { filter: 'blur(5px)', userSelect: 'none' as const }
    : {}
  const hasScore = showScores && overallScore !== null
  const scoreValueStyle: React.CSSProperties = locked && hasScore
    ? { filter: 'blur(6px)', userSelect: 'none' as const }
    : {}
  const overallDisplay = hasScore ? `${Math.round(overallScore!)}/100` : '?/100'
  return (
    <>
      {showPrivacyNote && (
        <div className="flex items-center gap-2 text-[12px] text-[var(--gem-gray-400)] mb-4">
          <Lock size={12} className="shrink-0" />
          <span>
            <strong className="text-[var(--gem-white)] font-semibold">Private to you.</strong>{' '}
            This tab isn&apos;t shared when your report is circulated.
          </span>
        </div>
      )}

      <div
        className="rounded-2xl p-6 mb-3 flex items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.02) 70%)',
          border: '1px solid rgba(124,58,237,0.28)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-accent)] m-0 mb-1">
            Commercial Potential
          </p>
          <p className="text-sm text-[var(--gem-gray-400)] m-0 leading-snug">
            GEM&apos;s read on this script&apos;s upside in the market — craft, concept, and opportunity.
          </p>
        </div>
        <div
          className="text-3xl sm:text-4xl font-bold text-[var(--gem-white)] tabular-nums shrink-0"
          style={scoreValueStyle}
        >
          {overallDisplay}
        </div>
      </div>

      {locked && evaluationId && (
        <div className="mb-8">
          <InlineUpgradeCTA
            evaluationId={evaluationId}
            label="Unlock your Commercial Potential score and full Details"
            subtext="Production reality, dimension scores, and development notes."
          />
        </div>
      )}

      {production && (
        <section className="mb-12">
          <SectionHeader label="Production Reality" />
          <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
            Everything the script tells us about how it would actually get made.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FactCard label="Cast">
              <Fact k="Speaking roles" v={production.cast?.speaking_roles} blur={locked} />
              <Fact k="Leads" v={production.cast?.leads} blur={locked} />
              {(production.cast?.series_regulars ?? 0) > 0 && (
                <Fact k="Series regulars" v={production.cast?.series_regulars} blur={locked} />
              )}
              {production.cast?.child_actors && <Fact k="Child actors" v="Yes" blur={locked} />}
              {production.cast?.casting_challenges?.length ? (
                <Fact k="Casting" v={production.cast.casting_challenges.join(', ')} blur={locked} />
              ) : null}
            </FactCard>
            <FactCard label="Locations & Scale">
              <Fact k="Distinct" v={production.locations?.distinct_count} blur={locked} />
              <Fact
                k="Int/Ext"
                v={production.locations?.interior_exterior_ratio ?? production.locations?.interior_exterior_mix}
                blur={locked}
              />
              <Fact k="Era" v={production.locations?.period_or_contemporary} blur={locked} />
              {production.locations?.expensive_flags?.length ? (
                <Fact k="Notable" v={production.locations.expensive_flags.join(', ')} blur={locked} />
              ) : null}
            </FactCard>
            <FactCard label="Technical">
              <Fact
                k="VFX"
                v={
                  (production.technical?.vfx_level ?? '') +
                  (production.technical?.vfx_details ? ` — ${production.technical.vfx_details}` : '')
                }
                blur={locked}
              />
              <Fact k="Stunts" v={production.technical?.stunts_level ?? production.technical?.stunts} blur={locked} />
              {production.technical?.sfx_needs && <Fact k="SFX" v={production.technical.sfx_needs} blur={locked} />}
              {production.technical?.night_shoots && (
                <Fact k="Night shoots" v={production.technical.night_shoots} blur={locked} />
              )}
              {production.technical?.animals && <Fact k="Animals" v="Yes" blur={locked} />}
            </FactCard>
            <FactCard label="Platform & Content">
              <Fact k="Lane" v={production.platform_fit?.recommended_lane} blur={locked} />
              <Fact k="Content" v={production.platform_fit?.content_level} blur={locked} />
              {production.platform_fit?.series_engine_or_release_model && (
                <Fact k="Model" v={production.platform_fit.series_engine_or_release_model} blur={locked} />
              )}
            </FactCard>
          </div>
          {production.rights_flags?.length ? (
            <div className="border border-[var(--gem-gray-700)] rounded-lg p-3 mt-3 text-xs text-[var(--gem-gray-400)] bg-white">
              <span className="uppercase tracking-[0.15em] text-[10px] text-[var(--gem-gray-500)] font-semibold mr-2">
                Rights & Clearance
              </span>
              {production.rights_flags.map((r, i) => {
                const text = typeof r === 'string' ? r : `${r.type}: ${r.detail}`
                return (
                  <span key={i} className="mr-3">
                    • {text}
                  </span>
                )
              })}
            </div>
          ) : null}
        </section>
      )}

      {considerations.length > 0 && (
        <section className="mb-12">
          <SectionHeader label="Considerations for Development" />
          <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
            Details worth knowing as you position this.
          </p>
          <div className="space-y-2">
            {considerations.map((c, i) => (
              <div
                key={i}
                className="border border-[var(--gem-gray-700)] rounded-lg p-4 bg-white"
              >
                <p className="text-[13px] font-semibold text-[var(--gem-white)] mb-1">
                  {c.area}
                </p>
                <p
                  className="text-sm text-[var(--gem-gray-300)] leading-relaxed m-0"
                  style={blurStyle}
                >
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <SectionHeader label="Dimension Analysis" />
        <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
          Ten lenses on what the script is doing. Tap to expand.
        </p>
        <div className="space-y-2">
          {(Object.keys(DIMENSION_META) as DimensionId[]).map((dimId) => {
            const s = scores?.[dimId]
            if (!s?.reasoning) return null
            const meta = DIMENSION_META[dimId]
            return (
              <details
                key={dimId}
                className="border border-[var(--gem-gray-700)] rounded-lg bg-white group"
              >
                <summary className="p-4 cursor-pointer text-sm font-medium text-[var(--gem-white)] list-none flex justify-between items-center gap-3">
                  <span>{meta.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[var(--gem-accent)] tabular-nums">
                      {showScores ? `${s.score}/10` : '?/10'}
                    </span>
                    <span className="text-xs text-[var(--gem-gray-500)] group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </span>
                </summary>
                <div
                  className="px-4 pb-4 text-sm text-[var(--gem-gray-400)] leading-relaxed"
                  style={blurStyle}
                >
                  {s.reasoning}
                </div>
              </details>
            )
          })}
        </div>
      </section>
    </>
  )
}
