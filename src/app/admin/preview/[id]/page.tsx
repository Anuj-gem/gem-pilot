// v4 preview page — shareable link for feedback. Reads v4 evaluation JSON from
//   src/data/v4-previews/{id}.json
// Two tabs: The Pitch (public) and Details (private to the writer).
// No scores, no tiers, advocacy framing throughout.
import fs from 'fs/promises'
import path from 'path'
import Nav from '@/components/nav'
import { DIMENSION_META } from '@/types'
import { PreviewTabs } from './tabs'

interface PageProps {
  params: Promise<{ id: string }>
}

interface V4File {
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
    }
    whats_special: { strengths: { dimension_or_area: string; what_it_means: string; evidence: string; source: string }[]; headline: string }
    lead_characters?: { name: string; role_type: string; demographics: string; hook: string; why_actor_wants_this: string }[]
    considerations: { area: string; detail: string; source: string }[]
  }
}

export default async function PreviewPage({ params }: PageProps) {
  const { id } = await params
  const filePath = path.join(process.cwd(), 'src', 'data', 'v4-previews', `${id}.json`)
  let payload: V4File | null = null
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    payload = JSON.parse(raw) as V4File
  } catch {
    return (
      <>
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="text-xl font-semibold text-[var(--gem-gray-50)] mb-4">No preview yet</h1>
          <p className="text-sm text-[var(--gem-gray-300)] mb-2">Expected file not found:</p>
          <code className="block text-xs text-[var(--gem-gray-400)] bg-[var(--gem-gray-800)] p-3 rounded border border-[var(--gem-gray-700)] mb-4">
            src/data/v4-previews/{id}.json
          </code>
          <p className="text-sm text-[var(--gem-gray-300)]">Generate it with:</p>
          <code className="block text-xs text-[var(--gem-gray-400)] bg-[var(--gem-gray-800)] p-3 rounded border border-[var(--gem-gray-700)]">
            cd marketing/v4-test && OPENAI_API_KEY=sk-... python3 score_v4.py {id}
          </code>
        </div>
      </>
    )
  }

  const { title, evaluation: e } = payload
  const { classification, positioning_hook, scores, production_reality, whats_special, lead_characters, considerations } = e

  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--gem-gray-50)] tracking-tight leading-tight mb-3">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--gem-gray-300)] mb-8">
          <span>{classification.format}</span>
          <span className="text-[var(--gem-gray-500)]">·</span>
          <span>{classification.genre_primary}</span>
          {classification.genre_tags?.map((t, i) => (
            <span key={i} className="px-2.5 py-0.5 rounded-full text-xs text-[var(--gem-gray-400)] border border-[var(--gem-gray-700)]">
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

        {/* Pitch box */}
        {positioning_hook && (
          <div
            className="relative border border-[var(--gem-gray-700)] rounded-2xl p-7 sm:p-8 mb-10"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent 60%)' }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-5 bottom-5 rounded-r"
              style={{ width: 3, background: 'var(--gem-gold)' }}
            />
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)] mb-3">
              The Pitch
            </div>
            <p className="text-xl sm:text-[22px] text-[var(--gem-gray-50)] leading-snug font-medium">
              {positioning_hook}
            </p>
          </div>
        )}

        <PreviewTabs
          pitch={
            <>
              {/* What Makes This Special */}
              <section className="mb-12">
                <SectionHeader label="What Makes This Special" />
                {whats_special.headline && (
                  <p className="text-base sm:text-lg text-[var(--gem-gray-100)] leading-relaxed mb-6">
                    {whats_special.headline}
                  </p>
                )}
                <div className="space-y-3">
                  {whats_special.strengths.map((s, i) => (
                    <div key={i} className="border border-[var(--gem-gray-700)] rounded-xl p-5 bg-white hover:border-[var(--gem-gray-600)] transition-colors">
                      <p className="text-[15px] font-semibold text-[var(--gem-gray-50)] mb-2">{s.dimension_or_area}</p>
                      <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed mb-2">{s.what_it_means}</p>
                      {s.evidence && (
                        <p className="text-[13px] text-[var(--gem-gray-400)] italic leading-relaxed">{s.evidence}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Lead Characters */}
              {lead_characters && lead_characters.length > 0 && (
                <section className="mb-12">
                  <SectionHeader label="Lead Characters" />
                  <p className="text-sm text-[var(--gem-gray-400)] -mt-3 mb-5">
                    The parts inside this script and why an actor would chase them.
                  </p>
                  <div className="space-y-3">
                    {lead_characters.map((c, i) => (
                      <div key={i} className="border border-[var(--gem-gray-700)] rounded-xl p-6 bg-white">
                        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                          <p className="text-xl font-semibold text-[var(--gem-gray-50)] tracking-tight m-0">{c.name}</p>
                          <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--gem-gray-400)]">
                            {c.role_type} · {c.demographics}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed mb-4">{c.hook}</p>
                        <div
                          className="rounded-lg p-4"
                          style={{ background: 'rgba(5, 150, 105, 0.06)', border: '1px solid rgba(5, 150, 105, 0.18)' }}
                        >
                          <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5" style={{ color: '#059669' }}>
                            Why an actor would want this part
                          </p>
                          <p className="text-[13px] text-[var(--gem-gray-100)] leading-relaxed m-0">
                            {c.why_actor_wants_this}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <a
                href="/submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-colors"
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
                className="flex items-start gap-3 p-4 rounded-xl mb-8"
                style={{
                  background: 'rgba(124, 58, 237, 0.06)',
                  border: '1px solid rgba(124, 58, 237, 0.22)',
                }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full grid place-items-center text-white text-sm"
                  style={{ background: 'var(--gem-accent)' }}
                >
                  🔒
                </div>
                <p className="text-[13px] text-[var(--gem-gray-200)] leading-relaxed m-0">
                  <strong className="text-[var(--gem-gray-50)] font-semibold">Private to you.</strong>{' '}
                  This section isn&apos;t shared when your report is circulated to producers or posted publicly — it&apos;s yours for reference. Use it to sharpen your pitch, navigate budget conversations, and understand where the script lives in the market.
                </p>
              </div>

              {/* Production Reality */}
              <section className="mb-12">
                <SectionHeader label="Production Reality" />
                <p className="text-sm text-[var(--gem-gray-400)] -mt-3 mb-5">
                  Everything the script tells us about how it would actually get made.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <FactCard label="Cast">
                    <Fact k="Speaking roles" v={production_reality.cast.speaking_roles} />
                    <Fact k="Leads" v={production_reality.cast.leads} />
                    {production_reality.cast.series_regulars > 0 && <Fact k="Series regulars" v={production_reality.cast.series_regulars} />}
                    {production_reality.cast.child_actors && <Fact k="Child actors" v="Yes" />}
                    {production_reality.cast.casting_characteristics?.length > 0 && (
                      <Fact k="Casting" v={production_reality.cast.casting_characteristics.join(', ')} />
                    )}
                  </FactCard>
                  <FactCard label="Locations & Scale">
                    <Fact k="Distinct" v={production_reality.locations.distinct_count} />
                    <Fact k="Int/Ext" v={production_reality.locations.interior_exterior_ratio} />
                    <Fact k="Era" v={production_reality.locations.period_or_contemporary} />
                    {production_reality.locations.notable_requirements?.length > 0 && (
                      <Fact k="Notable" v={production_reality.locations.notable_requirements.join(', ')} />
                    )}
                  </FactCard>
                  <FactCard label="Technical">
                    <Fact k="VFX" v={production_reality.technical.vfx_level + (production_reality.technical.vfx_details ? ` — ${production_reality.technical.vfx_details}` : '')} />
                    <Fact k="Stunts" v={production_reality.technical.stunts_level} />
                    {production_reality.technical.sfx_needs && <Fact k="SFX" v={production_reality.technical.sfx_needs} />}
                    <Fact k="Night shoots" v={production_reality.technical.night_shoots} />
                    {production_reality.technical.animals && <Fact k="Animals" v="Yes" />}
                  </FactCard>
                  <FactCard label="Platform & Content">
                    <Fact k="Lane" v={production_reality.platform_fit.recommended_lane} />
                    <Fact k="Content" v={production_reality.platform_fit.content_level} />
                    {production_reality.platform_fit.series_engine_or_release_model && (
                      <Fact k="Model" v={production_reality.platform_fit.series_engine_or_release_model} />
                    )}
                  </FactCard>
                </div>
                {production_reality.rights_flags?.length > 0 && (
                  <div className="border border-[var(--gem-gray-700)] rounded-lg p-3 mt-3 text-xs text-[var(--gem-gray-300)] bg-white">
                    <span className="uppercase tracking-[0.15em] text-[10px] text-[var(--gem-gray-500)] font-semibold mr-2">Rights & Clearance</span>
                    {production_reality.rights_flags.map((r, i) => (
                      <span key={i} className="mr-3">• {r.type}: {r.detail}</span>
                    ))}
                  </div>
                )}
              </section>

              {/* Considerations */}
              {considerations?.length > 0 && (
                <section className="mb-12">
                  <SectionHeader label="Considerations for Development" />
                  <p className="text-sm text-[var(--gem-gray-400)] -mt-3 mb-5">
                    Details worth knowing as you position this.
                  </p>
                  <div className="space-y-2">
                    {considerations.map((c, i) => (
                      <div key={i} className="border border-[var(--gem-gray-700)] rounded-lg p-4 bg-white">
                        <p className="text-[13px] font-semibold text-[var(--gem-gray-100)] mb-1">{c.area}</p>
                        <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed m-0">{c.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Dimension Analysis */}
              <section className="mb-8">
                <SectionHeader label="Dimension Analysis" />
                <p className="text-sm text-[var(--gem-gray-400)] -mt-3 mb-5">
                  Ten lenses on what the script is doing. Tap to expand.
                </p>
                <div className="space-y-2">
                  {Object.entries(DIMENSION_META).map(([dimId, meta]) => {
                    const s = scores?.[dimId]
                    if (!s?.reasoning) return null
                    return (
                      <details key={dimId} className="border border-[var(--gem-gray-700)] rounded-lg bg-white group">
                        <summary className="p-4 cursor-pointer text-sm font-medium text-[var(--gem-gray-50)] list-none flex justify-between items-center">
                          <span>{meta.label}</span>
                          <span className="text-xs text-[var(--gem-gray-500)] group-open:rotate-180 transition-transform">▾</span>
                        </summary>
                        <div className="px-4 pb-4 text-sm text-[var(--gem-gray-300)] leading-relaxed">
                          {s.reasoning}
                        </div>
                      </details>
                    )
                  })}
                </div>
              </section>
            </>
          }
        />
      </div>
    </>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <>
      <h2 className="text-xs uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-50)] mb-1.5">
        {label}
      </h2>
      <div className="w-10 h-0.5 mb-5 rounded" style={{ background: 'var(--gem-gold)' }} />
    </>
  )
}

function FactCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--gem-gray-700)] rounded-xl p-4 bg-white">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-400)] mb-2.5 m-0">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string | number | null | undefined }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-3 text-[13px] py-0.5">
      <span className="text-[var(--gem-gray-400)]">{k}</span>
      <span className="text-[var(--gem-gray-100)] text-right font-medium">{String(v)}</span>
    </div>
  )
}
