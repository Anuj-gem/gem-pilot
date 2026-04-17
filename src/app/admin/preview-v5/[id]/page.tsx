// v5 preview page — reads v5 evaluation JSON from src/data/v5-previews/{id}.json
// Design principle: every discrete item is its own collapsible card. Big click targets,
// big text, generous padding. Progressive disclosure = easier absorption of dense info.
import fs from 'fs/promises'
import path from 'path'
import { ChevronDown } from 'lucide-react'
import Nav from '@/components/nav'
import { PreviewTabs } from './tabs'

interface PageProps {
  params: Promise<{ id: string }>
}

interface RiskAxis {
  level: 'low' | 'medium' | 'high'
  note: string
}

interface V5File {
  eval_id: string
  title: string
  declared_format: string
  evaluation: {
    classification: { format: string; genre_primary: string; genre_tags: string[]; tone: string }
    positioning_hook: string
    scores: Record<string, { score: number; reasoning: string }>
    production_reality: {
      cast: { speaking_roles: number; leads: number; series_regulars: number; child_actors: boolean; casting_characteristics: string[] }
      locations: { distinct_count: number; interior_exterior_ratio: string; period_or_contemporary: string; notable_requirements: string[] }
      technical: { vfx_level: string; vfx_details: string; stunts_level: string; sfx_needs: string; night_shoots: string; animals: boolean }
      rights_flags: { type: string; detail: string }[]
      platform_fit: { recommended_lane: string; content_level: string; series_engine_or_release_model: string }
      risk_rubric?: {
        cost: RiskAxis
        cast: RiskAxis
        location: RiskAxis
        content: RiskAxis
        rights: RiskAxis
      }
    }
    whats_special: { strengths: { dimension_or_area: string; what_it_means: string; evidence: string; source: string }[]; headline: string }
    lead_characters?: { name: string; role_type: string; demographics: string; hook: string; why_actor_wants_this: string }[]
    package_angles?: {
      director_appeal: { hook: string; detail: string }
      buyer_appeal: { tier: string; lane: string; detail: string }
    }
    considerations: { area: string; detail: string; source: string }[]
  }
}

export default async function PreviewV5Page({ params }: PageProps) {
  const { id } = await params
  const filePath = path.join(process.cwd(), 'src', 'data', 'v5-previews', `${id}.json`)
  let payload: V5File | null = null
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    payload = JSON.parse(raw) as V5File
  } catch {
    return (
      <>
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="text-xl font-semibold text-[var(--gem-gray-50)] mb-4">No v5 preview yet</h1>
          <p className="text-sm text-[var(--gem-gray-300)] mb-2">Expected file not found:</p>
          <code className="block text-xs text-[var(--gem-gray-400)] bg-[var(--gem-gray-800)] p-3 rounded border border-[var(--gem-gray-700)] mb-4">
            src/data/v5-previews/{id}.json
          </code>
          <p className="text-sm text-[var(--gem-gray-300)]">Generate it with:</p>
          <code className="block text-xs text-[var(--gem-gray-400)] bg-[var(--gem-gray-800)] p-3 rounded border border-[var(--gem-gray-700)]">
            cd marketing/v5-test && OPENAI_API_KEY=sk-... python3 score_v5.py {id}
          </code>
        </div>
      </>
    )
  }

  const { title, evaluation: e } = payload
  const { classification, positioning_hook, production_reality, whats_special, lead_characters, package_angles, considerations } = e
  const risk = production_reality.risk_rubric

  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">
        {/* Title + classification */}
        <h1 className="text-[36px] sm:text-[44px] font-semibold text-[var(--gem-gray-50)] tracking-tight leading-[1.1] mb-4">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-[var(--gem-gray-300)] mb-10">
          <span>{classification.format}</span>
          <span className="text-[var(--gem-gray-500)]">·</span>
          <span>{classification.genre_primary}</span>
          {classification.genre_tags?.map((t, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-[13px] text-[var(--gem-gray-300)] border border-[var(--gem-gray-700)]">
              {t}
            </span>
          ))}
          {classification.tone && (
            <>
              <span className="text-[var(--gem-gray-500)]">·</span>
              <span className="italic text-[var(--gem-gray-400)]">{classification.tone}</span>
            </>
          )}
        </div>

        {/* Logline hero — always visible */}
        {positioning_hook && (
          <div
            className="relative rounded-2xl p-8 sm:p-10 mb-12"
            style={{
              background: 'linear-gradient(135deg, rgba(200,164,92,0.10), transparent 70%)',
              border: '1px solid rgba(200,164,92,0.25)',
            }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-7 bottom-7 rounded-r"
              style={{ width: 5, background: 'var(--gem-gold)' }}
            />
            <div className="text-[14px] uppercase tracking-[0.22em] font-bold mb-4" style={{ color: 'var(--gem-gold)' }}>
              Logline
            </div>
            <p className="text-[26px] sm:text-[30px] text-[var(--gem-gray-50)] leading-[1.3] font-medium m-0">
              {positioning_hook}
            </p>
          </div>
        )}

        <PreviewTabs
          pitch={
            <>
              {/* What's Working */}
              <Section label="What's Working" subtitle={whats_special.headline}>
                <div className="space-y-3">
                  {whats_special.strengths.map((s, i) => (
                    <Collapsible
                      key={i}
                      number={i + 1}
                      title={s.dimension_or_area}
                    >
                      <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0 mb-4">
                        {s.what_it_means}
                      </p>
                      {s.evidence && (
                        <div
                          className="rounded-lg p-5"
                          style={{
                            background: 'rgba(200,164,92,0.07)',
                            borderLeft: '3px solid var(--gem-gold)',
                          }}
                        >
                          <p className="text-[12px] uppercase tracking-[0.2em] font-bold mb-2 m-0" style={{ color: 'var(--gem-gold)' }}>
                            Evidence from the script
                          </p>
                          <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                            {s.evidence}
                          </p>
                        </div>
                      )}
                    </Collapsible>
                  ))}
                </div>
              </Section>

              {/* Lead Characters */}
              {lead_characters && lead_characters.length > 0 && (
                <Section
                  label="Lead Characters"
                  subtitle="The parts inside this script and why an actor would chase them."
                >
                  <div className="space-y-3">
                    {lead_characters.map((c, i) => (
                      <Collapsible
                        key={i}
                        title={c.name}
                        meta={`${c.role_type} · ${c.demographics}`}
                      >
                        <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0 mb-5">
                          {c.hook}
                        </p>
                        <div
                          className="rounded-lg p-5"
                          style={{ background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.20)' }}
                        >
                          <p className="text-[12px] uppercase tracking-[0.2em] font-bold mb-2 m-0" style={{ color: '#059669' }}>
                            Why an actor would want this part
                          </p>
                          <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                            {c.why_actor_wants_this}
                          </p>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </Section>
              )}

              {/* Package Angles */}
              {package_angles && (
                <Section
                  label="Package Angles"
                  subtitle="Who would direct this, and who would buy it."
                >
                  <div className="space-y-3">
                    <Collapsible
                      title="Why a director wants this"
                      accent="#059669"
                    >
                      <p className="text-[18px] font-semibold text-[var(--gem-gray-50)] leading-[1.4] mb-4 m-0">
                        {package_angles.director_appeal.hook}
                      </p>
                      <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0">
                        {package_angles.director_appeal.detail}
                      </p>
                    </Collapsible>
                    <Collapsible
                      title="Why a buyer wants this"
                      meta={package_angles.buyer_appeal.tier}
                      accent="#059669"
                    >
                      <p className="text-[13px] uppercase tracking-[0.15em] text-[var(--gem-gray-400)] mb-3 m-0">
                        {package_angles.buyer_appeal.lane}
                      </p>
                      <p className="text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0">
                        {package_angles.buyer_appeal.detail}
                      </p>
                    </Collapsible>
                  </div>
                </Section>
              )}

              <a
                href="/submit"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-white font-semibold text-[15px] transition-colors"
                style={{ background: 'var(--gem-accent)' }}
              >
                Send us another script →
              </a>
            </>
          }
          details={
            <>
              {/* Privacy banner */}
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
                  🔒
                </div>
                <p className="text-[15px] text-[var(--gem-gray-100)] leading-[1.6] m-0">
                  <strong className="text-[var(--gem-gray-50)] font-semibold">Private to you.</strong>{' '}
                  This section isn&apos;t shared when your report is circulated — it&apos;s yours for reference.
                </p>
              </div>

              {/* Risk rubric — always visible */}
              {risk && (
                <div className="mb-8">
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

              {/* Development Priorities — the main thing on this tab */}
              {considerations?.length > 0 && (
                <Section
                  label="Development Priorities"
                  subtitle="The sharpest places to push on the next pass — positioning notes and directions a producer or collaborator might lean on in conversation."
                >
                  <div className="space-y-3">
                    {considerations.map((c, i) => (
                      <Collapsible
                        key={i}
                        title={c.area}
                      >
                        <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0">{c.detail}</p>
                      </Collapsible>
                    ))}
                  </div>
                </Section>
              )}

              {/* Production Planning Details — collapsible cards */}
              <Section
                label="Production Planning Details"
                subtitle="Everything the script tells us about how it would actually get made."
              >
                <div className="space-y-3">
                  <Collapsible
                    title="Cast"
                    meta={`${production_reality.cast.leads} lead${production_reality.cast.leads === 1 ? '' : 's'} · ${production_reality.cast.speaking_roles} speaking roles${production_reality.cast.child_actors ? ' · child actors' : ''}`}
                  >
                    <FactList>
                      <Fact k="Speaking roles" v={production_reality.cast.speaking_roles} />
                      <Fact k="Leads" v={production_reality.cast.leads} />
                      {production_reality.cast.series_regulars > 0 && <Fact k="Series regulars" v={production_reality.cast.series_regulars} />}
                      {production_reality.cast.child_actors && <Fact k="Child actors" v="Yes" />}
                      {production_reality.cast.casting_characteristics?.length > 0 && (
                        <Fact k="Casting" v={production_reality.cast.casting_characteristics.join(', ')} />
                      )}
                    </FactList>
                  </Collapsible>
                  <Collapsible
                    title="Locations & Scale"
                    meta={`${production_reality.locations.distinct_count} distinct · ${production_reality.locations.period_or_contemporary}`}
                  >
                    <FactList>
                      <Fact k="Distinct locations" v={production_reality.locations.distinct_count} />
                      <Fact k="Int / Ext" v={production_reality.locations.interior_exterior_ratio} />
                      <Fact k="Era" v={production_reality.locations.period_or_contemporary} />
                      {production_reality.locations.notable_requirements?.length > 0 && (
                        <Fact k="Notable" v={production_reality.locations.notable_requirements.join(', ')} />
                      )}
                    </FactList>
                  </Collapsible>
                  <Collapsible
                    title="Technical"
                    meta={`VFX ${production_reality.technical.vfx_level} · Stunts ${production_reality.technical.stunts_level}`}
                  >
                    <FactList>
                      <Fact k="VFX" v={production_reality.technical.vfx_level + (production_reality.technical.vfx_details ? ` — ${production_reality.technical.vfx_details}` : '')} />
                      <Fact k="Stunts" v={production_reality.technical.stunts_level} />
                      {production_reality.technical.sfx_needs && <Fact k="SFX" v={production_reality.technical.sfx_needs} />}
                      <Fact k="Night shoots" v={production_reality.technical.night_shoots} />
                      {production_reality.technical.animals && <Fact k="Animals" v="Yes" />}
                    </FactList>
                  </Collapsible>
                  <Collapsible
                    title="Platform & Content"
                    meta={production_reality.platform_fit.recommended_lane}
                  >
                    <FactList>
                      <Fact k="Lane" v={production_reality.platform_fit.recommended_lane} />
                      <Fact k="Content" v={production_reality.platform_fit.content_level} />
                      {production_reality.platform_fit.series_engine_or_release_model && (
                        <Fact k="Model" v={production_reality.platform_fit.series_engine_or_release_model} />
                      )}
                    </FactList>
                  </Collapsible>
                  {production_reality.rights_flags?.length > 0 && (
                    <Collapsible
                      title="Rights & Clearance"
                      meta={`${production_reality.rights_flags.length} item${production_reality.rights_flags.length === 1 ? '' : 's'} to flag`}
                    >
                      <ul className="space-y-3 list-none p-0 m-0">
                        {production_reality.rights_flags.map((r, i) => (
                          <li key={i} className="flex gap-3 text-[16px] text-[var(--gem-gray-100)] leading-[1.55]">
                            <span className="text-[var(--gem-gold)] flex-shrink-0">•</span>
                            <span>
                              <span className="font-semibold text-[var(--gem-gray-50)]">{r.type}:</span>{' '}
                              {r.detail}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Collapsible>
                  )}
                </div>
              </Section>

              {/* NOTE: Dimension Analysis section intentionally removed in v5.
                  Scores still calculated internally but no longer surfaced to users. */}
            </>
          }
        />
      </div>
    </>
  )
}

// --- Building blocks ---

function Section({
  label,
  subtitle,
  children,
}: {
  label: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-14">
      <div className="w-12 h-0.5 mb-3 rounded" style={{ background: 'var(--gem-gold)' }} />
      <h2 className="text-[16px] uppercase tracking-[0.2em] font-bold text-[var(--gem-gray-50)] m-0 mb-3">
        {label}
      </h2>
      {subtitle && (
        <p className="text-[17px] text-[var(--gem-gray-200)] leading-[1.6] mb-6 max-w-[62ch]">
          {subtitle}
        </p>
      )}
      {children}
    </section>
  )
}

function Collapsible({
  title,
  meta,
  number,
  accent,
  defaultOpen = false,
  children,
}: {
  title: string
  meta?: string
  number?: number
  accent?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      {...(defaultOpen ? { open: true } : {})}
      className="group border border-[var(--gem-gray-700)] rounded-xl bg-white overflow-hidden transition-colors hover:border-[var(--gem-gray-600)] [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex items-start gap-4 cursor-pointer list-none px-6 py-5">
        {number !== undefined && (
          <span
            className="flex-shrink-0 text-[16px] font-bold tabular-nums mt-0.5"
            style={{ color: accent || 'var(--gem-gold)' }}
          >
            {String(number).padStart(2, '0')}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[19px] sm:text-[20px] font-semibold text-[var(--gem-gray-50)] leading-[1.35] m-0">
            {title}
          </p>
          {meta && (
            <p className="text-[14px] text-[var(--gem-gray-400)] mt-1.5 m-0 leading-snug">
              {meta}
            </p>
          )}
        </div>
        <ChevronDown
          size={22}
          className="flex-shrink-0 mt-1 text-[var(--gem-gray-400)] transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="px-6 pb-6 pt-1 border-t border-[var(--gem-gray-700)] mt-1">
        <div className="pt-5">{children}</div>
      </div>
    </details>
  )
}

function FactList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2.5">{children}</div>
}

function Fact({ k, v }: { k: string; v: string | number | null | undefined }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-4 text-[16px] py-0.5">
      <span className="text-[var(--gem-gray-400)] flex-shrink-0">{k}</span>
      <span className="text-[var(--gem-gray-100)] text-right font-medium">{String(v)}</span>
    </div>
  )
}

function RiskPill({ label, axis }: { label: string; axis?: RiskAxis }) {
  if (!axis) return null
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
        {label}
      </p>
      <p className="text-[22px] font-bold capitalize m-0 mb-2.5" style={{ color: palette.text }}>
        {axis.level}
      </p>
      <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.5] m-0">
        {axis.note}
      </p>
    </div>
  )
}
