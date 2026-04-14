// v4 preview page — shareable link for feedback. Reads v4 evaluation JSON from
//   src/data/v4-previews/{id}.json
// and renders it in the new positioning-first layout (no scores, no tiers,
// no "what's holding it back" — advocacy framing throughout).
//
// Public: anyone with the link can view (used to collect writer feedback).
// If the file is missing, shows instructions for generating it.
import { notFound } from 'next/navigation'
import fs from 'fs/promises'
import path from 'path'
import Nav from '@/components/nav'
import { DIMENSION_META } from '@/types'
import { Sparkles, Film, Users, MapPin, Clapperboard, FileText } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

interface V4File {
  eval_id: string
  title: string
  declared_format: string
  evaluation: {
    classification: {
      format: string
      genre_primary: string
      genre_tags: string[]
      tone: string
    }
    positioning_hook: string
    scores: Record<string, { score: number; reasoning: string }>
    production_reality: {
      cast: {
        speaking_roles: number
        leads: number
        series_regulars: number
        child_actors: boolean
        casting_characteristics: string[]
      }
      locations: {
        distinct_count: number
        interior_exterior_ratio: string
        period_or_contemporary: string
        notable_requirements: string[]
      }
      technical: {
        vfx_level: string
        vfx_details: string
        stunts_level: string
        sfx_needs: string
        night_shoots: string
        animals: boolean
      }
      rights_flags: { type: string; detail: string }[]
      platform_fit: {
        recommended_lane: string
        content_level: string
        series_engine_or_release_model: string
      }
    }
    whats_special: {
      strengths: { dimension_or_area: string; what_it_means: string; evidence: string; source: string }[]
      headline: string
    }
    considerations: { area: string; detail: string; source: string }[]
  }
}

export default async function AdminPreviewPage({ params }: PageProps) {
  const { id } = await params

  // Load v4 JSON from file
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
          <h1 className="text-xl font-semibold text-[var(--gem-white)] mb-4">No v4 preview yet</h1>
          <p className="text-sm text-[var(--gem-gray-300)] mb-2">Expected file not found:</p>
          <code className="block text-xs text-[var(--gem-gray-400)] bg-[var(--gem-gray-900)] p-3 rounded border border-[var(--gem-gray-700)] mb-4">
            src/data/v4-previews/{id}.json
          </code>
          <p className="text-sm text-[var(--gem-gray-300)]">Generate it with:</p>
          <code className="block text-xs text-[var(--gem-gray-400)] bg-[var(--gem-gray-900)] p-3 rounded border border-[var(--gem-gray-700)]">
            cd marketing/v4-test && OPENAI_API_KEY=sk-... python3 score_v4.py {id}
          </code>
        </div>
      </>
    )
  }

  const { title, evaluation: e } = payload
  const { classification, positioning_hook, scores, production_reality, whats_special, considerations } = e

  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* ========== HEADER ========== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500">
            <Sparkles size={12} />
            <span>Preview · early look</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--gem-white)] leading-tight">
            {title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-[var(--gem-gray-400)] flex-wrap">
            <span>{classification.format}</span>
            <span className="text-[var(--gem-gray-600)]">·</span>
            <span>{classification.genre_primary}</span>
            {classification.genre_tags?.map((t, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[10px]">
                {t}
              </span>
            ))}
            <span className="text-[var(--gem-gray-600)]">·</span>
            <span className="italic">{classification.tone}</span>
          </div>
        </div>

        {/* ========== POSITIONING HOOK ========== */}
        {positioning_hook && (
          <div className="rounded-xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/40 to-transparent p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-500 mb-3">
              <Sparkles size={12} />
              The Pitch
            </div>
            <p className="text-lg sm:text-xl text-[var(--gem-white)] leading-snug font-medium">
              {positioning_hook}
            </p>
          </div>
        )}

        {/* ========== WHAT MAKES THIS SPECIAL ========== */}
        <section className="space-y-5">
          <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-500">
            <Sparkles size={14} />
            What Makes This Special
          </h2>
          {whats_special.headline && (
            <p className="text-base sm:text-lg text-[var(--gem-gray-100)] leading-relaxed">
              {whats_special.headline}
            </p>
          )}
          <div className="space-y-4 pt-2">
            {whats_special.strengths.map((s, i) => (
              <div key={i} className="rounded-lg border border-[var(--gem-gray-800)] bg-[var(--gem-gray-900)]/40 p-4">
                <p className="text-sm font-semibold text-[var(--gem-white)] mb-1.5">{s.dimension_or_area}</p>
                <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed mb-2">{s.what_it_means}</p>
                {s.evidence && (
                  <p className="text-xs text-[var(--gem-gray-400)] italic leading-relaxed">
                    {s.evidence}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ========== PRODUCTION REALITY ========== */}
        <section className="space-y-5">
          <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--gem-gray-400)]">
            <Clapperboard size={14} />
            Production Reality
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <FactCard icon={<Users size={13} />} label="Cast">
              <Fact k="Speaking roles" v={production_reality.cast.speaking_roles} />
              <Fact k="Leads" v={production_reality.cast.leads} />
              {production_reality.cast.series_regulars > 0 && <Fact k="Series regulars" v={production_reality.cast.series_regulars} />}
              {production_reality.cast.child_actors && <Fact k="Child actors" v="Yes" />}
              {production_reality.cast.casting_characteristics?.length > 0 && (
                <Fact k="Casting notes" v={production_reality.cast.casting_characteristics.join(', ')} />
              )}
            </FactCard>
            <FactCard icon={<MapPin size={13} />} label="Locations & Scale">
              <Fact k="Distinct locations" v={production_reality.locations.distinct_count} />
              <Fact k="Int/Ext" v={production_reality.locations.interior_exterior_ratio} />
              <Fact k="Era" v={production_reality.locations.period_or_contemporary} />
              {production_reality.locations.notable_requirements?.length > 0 && (
                <Fact k="Notable" v={production_reality.locations.notable_requirements.join(', ')} />
              )}
            </FactCard>
            <FactCard icon={<Film size={13} />} label="Technical">
              <Fact k="VFX" v={`${production_reality.technical.vfx_level}${production_reality.technical.vfx_details ? ' — ' + production_reality.technical.vfx_details : ''}`} />
              <Fact k="Stunts" v={production_reality.technical.stunts_level} />
              {production_reality.technical.sfx_needs && <Fact k="SFX" v={production_reality.technical.sfx_needs} />}
              <Fact k="Night shoots" v={production_reality.technical.night_shoots} />
              {production_reality.technical.animals && <Fact k="Animals" v="Yes" />}
            </FactCard>
            <FactCard icon={<FileText size={13} />} label="Platform & Content">
              <Fact k="Lane" v={production_reality.platform_fit.recommended_lane} />
              <Fact k="Content level" v={production_reality.platform_fit.content_level} />
              {production_reality.platform_fit.series_engine_or_release_model && (
                <Fact k="Model" v={production_reality.platform_fit.series_engine_or_release_model} />
              )}
            </FactCard>
          </div>
          {production_reality.rights_flags?.length > 0 && (
            <div className="rounded-lg border border-[var(--gem-gray-800)] p-3 text-xs text-[var(--gem-gray-300)]">
              <span className="uppercase tracking-widest text-[10px] text-[var(--gem-gray-500)] mr-2">Rights & Clearance</span>
              {production_reality.rights_flags.map((r, i) => (
                <span key={i} className="mr-3">• {r.type}: {r.detail}</span>
              ))}
            </div>
          )}
        </section>

        {/* ========== CONSIDERATIONS ========== */}
        {considerations?.length > 0 && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--gem-gray-400)]">
              <FileText size={14} />
              Considerations for Development
            </h2>
            <p className="text-xs text-[var(--gem-gray-500)]">Neutral details a producer or writer should know when positioning this.</p>
            <div className="space-y-2">
              {considerations.map((c, i) => (
                <div key={i} className="rounded-lg border border-[var(--gem-gray-800)] bg-[var(--gem-gray-900)]/40 p-3">
                  <p className="text-xs font-semibold text-[var(--gem-gray-200)] mb-1">{c.area}</p>
                  <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">{c.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========== DIMENSION ANALYSIS (prose, no numbers) ========== */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--gem-gray-400)]">
            <FileText size={14} />
            Dimension Analysis
          </h2>
          <p className="text-xs text-[var(--gem-gray-500)]">Ten lenses on what the script is doing.</p>
          <div className="space-y-3 pt-1">
            {Object.entries(DIMENSION_META).map(([dimId, meta]) => {
              const s = scores?.[dimId]
              if (!s?.reasoning) return null
              return (
                <details key={dimId} className="rounded-lg border border-[var(--gem-gray-800)] bg-[var(--gem-gray-900)]/30 group">
                  <summary className="p-3 cursor-pointer text-sm font-medium text-[var(--gem-gray-100)] list-none flex justify-between items-center">
                    <span>{meta.label}</span>
                    <span className="text-xs text-[var(--gem-gray-500)] group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="p-3 pt-0 text-sm text-[var(--gem-gray-300)] leading-relaxed">
                    {s.reasoning}
                  </div>
                </details>
              )
            })}
          </div>
        </section>

        {/* Submit CTA */}
        <div className="pt-4 border-t border-[var(--gem-gray-800)]">
          <a href="/submit" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[var(--gem-accent,_#7c3aed)] text-white text-sm font-semibold hover:opacity-90">
            Send us another script →
          </a>
        </div>
      </div>
    </>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--gem-gray-800)] bg-[var(--gem-gray-900)]/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--gem-gray-500)] mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string | number }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-[var(--gem-gray-500)]">{k}</span>
      <span className="text-[var(--gem-gray-200)] text-right">{String(v)}</span>
    </div>
  )
}
